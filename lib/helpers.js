const chalk = require('chalk');
const eslintHelpers = require('./eslint');
const fs = require('fs');
const https = require('https');
const parser = require('solidity-parser-antlr');
const path = require('path');
const releases = require('./releases');
const SourceMappingDecoder = require('remix-lib/src/sourceMappingDecoder');

const mythx2Severity = {
    High: 2,
    Medium: 1,
};

const decoder = new SourceMappingDecoder();

/**
 * @returns ESLint formatter module
 */
const getFormatter = () => {
    try {
        return require('eslint/lib/formatters/stylish');
    } catch (ex) {
        ex.message = `\nThere was a problem loading formatter option: stylish \nError: ${
            ex.message
        }`;
        throw ex;
    }
};

/**
 * Turn a srcmap entry (the thing between semicolons) into a line and
 * column location.
 * We make use of this.sourceMappingDecoder of this class to make
 * the conversion.
 *
 * @param {string} srcEntry - a single entry of solc sourceMap
 * @param {Array} lineBreakPositions - array returned by the function 'mapLineBreakPositions'
 * @returns {line: number, column: number}
 */
const textSrcEntry2lineColumn = (srcEntry, lineBreakPositions) => {
    const ary = srcEntry.split(':');
    const sourceLocation = {
        length: parseInt(ary[1], 10),
        start: parseInt(ary[0], 10),
    };
    const loc = decoder.convertOffsetToLineColumn(sourceLocation, lineBreakPositions);
    // FIXME: note we are lossy in that we don't return the end location
    if (loc.start) {
    // Adjust because routines starts lines at 0 rather than 1.
        loc.start.line++;
    }
    if (loc.end) {
        loc.end.line++;
    }
    return [loc.start, loc.end];
};

/**
 * Convert a MythX issue into an ESLint-style issue.
 * The eslint report format which we use, has these fields:
 *
 * - column,
 * - endCol,
 * - endLine,
 * - fatal,
 * - line,
 * - message,
 * - ruleId,
 * - severity
 *
 * but a MythX JSON report has these fields:
 *
 * - description.head
 * - description.tail,
 * - locations
 * - severity
 * - swcId
 * - swcTitle
 *
 * @param {object} issue - the MythX issue we want to convert
 * @param {string} source - holds the contract code
 * @returns eslint-issue object
 */
const issue2EsLint = (issue, source) => {
    let swcLink;

    if (!issue.swcID) {
        swcLink = 'N/A';
    } else {
        swcLink = 'https://smartcontractsecurity.github.io/SWC-registry/docs/' + issue.swcID;
    }

    const esIssue = {
        fatal: false,
        ruleId: swcLink,
        message: `${issue.description.head}`,
        severity: mythx2Severity[issue.severity] || 1,
        mythXseverity: issue.severity,
        line: -1,
        column: 0,
        endLine: -1,
        endCol: 0,
    };

    let startLineCol,  endLineCol;
    const lineBreakPositions = decoder.getLinebreakPositions(source);

    if (issue.locations.length) {
        const srcEntry = issue.locations[0].sourceMap.split(';')[0];
        [startLineCol, endLineCol] = textSrcEntry2lineColumn(srcEntry, lineBreakPositions);
    }

    if (startLineCol) {
        esIssue.line = startLineCol.line;
        esIssue.column = startLineCol.column;
        esIssue.endLine = endLineCol.line;
        esIssue.endCol = endLineCol.column;
    }

    return esIssue;
};

/**
 * Gets the source index from the issue sourcemap
 * @param {object} issue - issue item from the collection MythX analyze API output
 * @returns {number}
 */
const getSourceIndex = issue => {
    if (issue.locations.length) {
        const sourceMapRegex = /(\d+):(\d+):(\d+)/g;
        const match = sourceMapRegex.exec(issue.locations[0].sourceMap);
        // Ignore `-1` source index for compiler generated code
        return match ? match[3] : 0;
    }

    return 0;
};

/**
 * Converts MythX analyze API output item to Eslint compatible object
 * @param {object} report - issue item from the collection MythX analyze API output
 * @param {object} data - Contains array of solidity contracts source code and the input filepath of contract
 * @returns {object}
 */
const convertMythXReport2EsIssue = (report, data) => {
    const { issues, sourceList } = report;
    const results = {};

    issues.map(issue => {
        const sourceIndex = getSourceIndex(issue);

        /**
         * MythX API sends `sourceList` with `/` added in the contract name
         * Example: sourceList: [ 'token.sol', '/token.sol' ]
         *
         * TODO: Remove the `replace` hack by fixing the `sourceList` response from MythX API
         */
        const filePath = sourceList[sourceIndex].replace(/^\//, '');

        if (!results[filePath]) {
            results[filePath] = {
                errorCount: 0,
                warningCount: 0,
                fixableErrorCount: 0,
                fixableWarningCount: 0,
                filePath,
                messages: [],
            };
        }

        results[filePath].messages.push(issue2EsLint(issue, data.sources[filePath].content));
    });

    for (let k in results) {
        if (results.hasOwnProperty(k)) {
            results[k].warningCount = results[k].messages.reduce((acc,  { fatal, severity }) =>
                !eslintHelpers.isFatal(fatal , severity) ? acc + 1: acc, 0);

            results[k].errorCount = results[k].messages.reduce((acc,  { fatal, severity }) =>
                eslintHelpers.isFatal(fatal , severity) ? acc + 1: acc, 0);
        }
    }

    return Object.values(results);
};

const doReport = (data, issues) => {
    const eslintIssues = issues
        .map(report => convertMythXReport2EsIssue(report, data))
        .reduce((acc, curr) => acc.concat(curr), []);

    const uniqueIssues = eslintHelpers.getUniqueIssues(eslintIssues);

    if (uniqueIssues.length === 0) {
        console.log(chalk.green('✔ No errors/warnings found in ' + data.filePath));
    } else {
        const formatter = getFormatter();
        console.log(formatter(uniqueIssues));
    }
};

const getSolidityVersion = fileContents => {
    try {
        const ast = parser.parse(fileContents, {});
        let solidityVersion = releases.latest;
        let reg = RegExp(/[><=^]/, 'g');

        for (let n of ast.children) {
            if ((n.name === 'solidity') && (n.type === 'PragmaDirective')) {
                solidityVersion = n.value;
                if (!reg.test(solidityVersion)) {
                    return solidityVersion;
                }
                break;
            }
        }

        if (solidityVersion !== releases.latest) {
            solidityVersion = solidityVersion.replace(/[\^v]/g, '');
            let upperLimit = 'latest';

            if (solidityVersion.indexOf('<') !== -1) {
                if (solidityVersion.indexOf('<=') !== -1) {
                    solidityVersion = solidityVersion.substring(solidityVersion.length - 5, solidityVersion.length);
                } else {
                    upperLimit = solidityVersion.substring(solidityVersion.length - 5, solidityVersion.length);
                }
            } else if (solidityVersion.indexOf('>') !== -1) {
                solidityVersion = releases.latest;
            } else {
                upperLimit = '0.' + (parseInt(solidityVersion[2]) + 1).toString() + '.0';
            }

            if (upperLimit !== 'latest') {
                if (upperLimit === '0.6.0' || upperLimit === '0.7.0') {
                    solidityVersion = releases.latest;
                } else if (upperLimit === '0.5.0') {
                    solidityVersion = '0.4.25';
                } else if (upperLimit === '0.4.0') {
                    solidityVersion = '0.3.6';
                } else if (upperLimit === '0.3.0') {
                    solidityVersion = '0.2.2';
                } else {
                    let x = parseInt(upperLimit[upperLimit.length - 1], 10) - 1;
                    solidityVersion = '';
                    for (let i = 0; i < upperLimit.length - 1; i++) {
                        solidityVersion += upperLimit[i];
                    }
                    solidityVersion += x.toString();
                }
            }
        }

        return solidityVersion;
    } catch (error) {
        for (let err of error.errors) {
            console.error(err.message);
        }
    }
};

const getImportPaths = source => {
    let matches = [];
    let ir = /^(.*import){1}(.+){0,1}\s['"](.+)['"];/gm;
    let match = null;

    while ((match = ir.exec(source))) {
        matches.push(match[3]);
    }

    return matches;
};

const removeRelativePathFromUrl = url => url.replace(/^.+\.\//, '').replace('./', '');

/* Dynamic linking is not supported. */

const regex = new RegExp(/__\$\w+\$__/,'g');
const address = '0000000000000000000000000000000000000000';
const replaceLinkedLibs = byteCode => byteCode.replace(regex, address);

/* Get solc-js of specific version from temp directory, if exists */

const loadSolcVersion = (version, callback) => {
    const tempDir = path.dirname(require.main.filename) + '/.temp/';
    const solcPath =  tempDir + version + '.js';

    if (fs.existsSync(solcPath)) {
        callback(fs.readFileSync(solcPath).toString());
    } else {
        /* Create `.temp` directory if it doesn't exist */

        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        /* Get the solc remote version snapshot of the specified version */

        const solcJs = fs.createWriteStream(solcPath);
        const url = 'https://ethereum.github.io/solc-bin/bin/soljson-' + version + '.js';

        https
            .get(url, (response) => {
                if (response.statusCode !== 200) {
                    throw new Error('Error retrieving binary: ' + response.statusMessage);
                } else {
                    const stream = response.pipe(solcJs);

                    stream.on('finish', () => {
                        callback(fs.readFileSync(solcPath).toString());
                    });
                }
            })
            .on('error',  (error) => {
                throw new Error('Error fetching binary: ' + error);
            });
    }
};

module.exports = {
    doReport,
    getImportPaths,
    getSolidityVersion,
    loadSolcVersion,
    removeRelativePathFromUrl,
    replaceLinkedLibs
};
