const eslintHelpers = require('./eslint');
const SourceMappingDecoder = require('remix-lib/src/sourceMappingDecoder');

/*
  Mythril seems to downplay severity. What eslint calls an "error",
  Mythril calls "warning". And what eslint calls "warning",
  Mythril calls "informational".
*/
const mythx2Severity = {
    High: 2,
    Medium: 1,
};

const decoder = new SourceMappingDecoder();

/**
 * Loads preferred ESLint formatter for warning reports.
 *
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
    const esIssue = {
        fatal: false,
        ruleId: issue.swcID,
        message: `${issue.description.head} ${issue.description.tail}`,
        severity: mythx2Severity[issue.severity] || 1,
        mythXseverity: issue.severity,
        line: -1,
        column: 0,
        endLine: -1,
        endCol: 0,
    };

    let startLineCol,  endLineCol;
    const lineBreakPositions = decoder.getLinebreakPositions(source);

    const srcEntry = issue.locations[0].sourceMap.split(';')[0];
    [startLineCol, endLineCol] = textSrcEntry2lineColumn(srcEntry, lineBreakPositions);

    if (startLineCol) {
        esIssue.line = startLineCol.line;
        esIssue.column = startLineCol.column;
        esIssue.endLine = endLineCol.line;
        esIssue.endCol = endLineCol.column;
    }

    return esIssue;
};

/**
 * Converts MythX analyze API output item to Eslint compatible object
 * @param {object} report - issue item from the collection MythX analyze API output
 * @param {object} sources - Array of solidity contracts source code
 * @returns {object}
 */
const convertMythXReport2EsIssue = (report, sources) => {
    const { issues, sourceList } = report;
    const result = {
        errorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
        filePath: sourceList[0],
    };

    result.messages = issues.map(issue => issue2EsLint(issue, sources[sourceList[0]].source));

    result.warningCount = result.messages.reduce((acc,  { fatal, severity }) =>
        !eslintHelpers.isFatal(fatal , severity) ? acc + 1: acc, 0);

    result.errorCount = result.messages.reduce((acc,  { fatal, severity }) =>
        eslintHelpers.isFatal(fatal , severity) ? acc + 1: acc, 0);

    return result;
};

const doReport = (data, issues) => {
    const eslintIssues = issues
        .map(report => convertMythXReport2EsIssue(report, data.sources))
        .reduce((acc, curr) => acc.concat(curr), []);

    const uniqueIssues = eslintHelpers.getUniqueIssues(eslintIssues);

    const formatter = getFormatter();
    console.log(formatter(uniqueIssues));
};

module.exports = {
    doReport
};
