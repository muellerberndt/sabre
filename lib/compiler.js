const fs = require('fs');
const axios = require('axios');
const path = require('path');
const requireFromString = require('require-from-string');
const solc = require('solc');
const parser = require('solidity-parser-antlr');
const releases = require('./releases');

/* Get solc-js input config for the compilation of contract */

const getSolcInput = sources => {
    return {
        language: 'Solidity',
        sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*'],
                    '': ['ast']
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };
};

/**
 * Loads and initializes Solc of supplied version.
 * 
 * @param {string} version Solc version string
 * 
 * @returns {object} Loaded Solc version snapshot object
 *                   and indicator if it was loaded from local cache
 */
const loadSolcVersion = async version => {
    const tempDir = path.join(path.dirname(require.main.filename), '.temp');
    const filePath = path.join(tempDir, version + '.js');

    const fromCache = fs.existsSync(filePath);

    let solcString;

    if (fromCache) {
        solcString = fs.readFileSync(filePath).toString();
    } else {
        const config = {
            method: 'get',
            url: 'https://ethereum.github.io/solc-bin/bin/soljson-' + version + '.js',
            responseType: 'stream'
        };

        solcString = await axios(config).then(response => {
            /**
             * Create `.temp` directory if it doesn't exist
             */
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const stream = fs.createWriteStream(filePath);

            response.data.pipe(stream);

            return new Promise((resolve, reject) => {
                stream.on(
                    'finish',
                    () => resolve(fs.readFileSync(filePath).toString())
                ).on(
                    'error',
                    err => reject(err)
                );
            });
        });
    }

    /**
     * NOTE: `solcSnapshot` has the same interface as the `solc`.
     */
    const solcSnapshot = solc.setupMethods(
        requireFromString(solcString),
        'soljson-' + releases[version] + '.js'
    );

    return { solcSnapshot, fromCache };
};

/* Get solidity version specified in the contract */

const getSolidityVersion = content => {
    try {
        const ast = parser.parse(content, {});
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
                if (upperLimit === '0.7.0') {
                    solidityVersion = releases.latest;
                } else if (upperLimit === '0.6.0') {
                    solidityVersion = '0.5.16';
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
        if (error instanceof parser.ParserError) {
            const messages = error.errors.map(
                e => `[line ${e.line}, column ${e.column}] - ${e.message}`
            );

            throw new Error('Unable to parse input.\n' + messages.join('\n'));
        } else {
            throw error;
        }
    }
};

/**
 * Returns dictionary of function signatures and their keccak256 hashes
 * for all contracts.
 * 
 * Same function signatures will be overwritten
 * as there should be no distinction between their hashes,
 * even if such functions defined in different contracts.
 * 
 * @param {object} contracts Compiler meta-data about contracts.
 * 
 * @returns {object} Dictionary object where
 *                   key is a hex string first 4 bytes of keccak256 hash
 *                   and value is a corresponding function signature.
 */
const getFunctionHashes = contracts => {
    const hashes = {};

    for (const fileName in contracts) {
        const fileContracts = contracts[fileName];

        for (const contractName in fileContracts) {
            const contract = fileContracts[contractName];

            const { methodIdentifiers } = contract.evm;

            for (const signature in methodIdentifiers) {
                const hash = methodIdentifiers[signature];

                hashes[hash] = signature;
            }
        }
    }

    return hashes;
};

/**
 * Extract compile errors from Solc compile error/warning messages combined array.
 * 
 * @param {string[]|object[]} compileMessages Solc compile messages combined array
 * 
 * @returns string[] Array with extracted error message strings
 */
const getCompileErrors = compileMessages => {
    const errors = [];

    for (const compileMessage of compileMessages) {
        if (compileMessage.severity === 'error') {
            errors.push(compileMessage.formattedMessage);
        }
    }

    return errors;
};

/**
 * Safely extract compiled contract bytecode value if there is any.
 * 
 * @param {object} contract Solc contract object
 * 
 * @returns {string|undefined} Extracted bytecode string or undefined if there is no bytecode.
 */
const getByteCodeString = contract => {
    return (
        contract &&
        contract.evm &&
        contract.evm.bytecode &&
        contract.evm.bytecode.object
    );
};

/*
 * Compile contracts using solc snapshot
 */

const getCompiledContracts = (input, solcSnapshot, solidityFileName, compileContractName) => {
    const compiled = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));

    if (compiled.errors) {
        const errors = getCompileErrors(compiled.errors);

        if (errors.length) {
            throw new Error('Unable to compile.\n' + errors.join('\n'));
        }
    }

    if (!compiled.contracts || !Object.keys(compiled.contracts).length) {
        throw new Error('No contracts detected after compiling');
    }

    const inputFile = compiled.contracts[solidityFileName];

    let contract, contractName;

    if (inputFile.length === 0) {
        throw new Error('No contracts found');
    } else if (inputFile.length === 1) {
        contractName = Object.keys(inputFile)[0];
        contract = inputFile[contractName];
    } else {
        if (compileContractName && inputFile[compileContractName]) {
            contractName = compileContractName;
            contract = inputFile[compileContractName];
        } else {
            /**
             * Get the contract with largest bytecode object to generate MythX analysis report.
             * If inheritance is used, the main contract is the largest as it contains the bytecode of all others.
             */

            const byteCodes = {};

            for (const key in inputFile) {
                if (inputFile.hasOwnProperty(key)) {
                    const byteCode = getByteCodeString(inputFile[key]);

                    if (byteCode) {
                        byteCodes[byteCode.length] = key;
                    }
                }
            }

            const largestByteCodeKey = Object.keys(byteCodes).reverse()[0];

            contractName = byteCodes[largestByteCodeKey];
            contract = inputFile[contractName];
        }
    }

    const byteCode = getByteCodeString(contract);

    /**
     * Bytecode would be empty if contract is only an interface.
     */
    if (!byteCode) {
        throw new Error(
            'Compiling the Solidity code did not return any bytecode. Note that abstract contracts cannot be analyzed.'
        );
    }

    const functionHashes = getFunctionHashes(compiled.contracts);

    return {
        compiled,
        contract,
        contractName,
        functionHashes
    };
};

module.exports = {
    getCompiledContracts,
    getSolcInput,
    getSolidityVersion,
    loadSolcVersion,
};
