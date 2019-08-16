const chalk = require('chalk');
const fs = require('fs');
const https = require('https');
const path = require('path');
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

/* Get solc-js of specific version from temp directory, if exists */

const getImportPaths = source => {
    let matches = [];
    let ir = /^(.*import){1}(.+){0,1}\s['"](.+)['"];/gm;
    let match = null;

    while ((match = ir.exec(source))) {
        matches.push(match[3]);
    }

    return matches;
};

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

/**
 * Returns dictionary of function signatures and their keccak256 hashes
 * for all contracts.
 * 
 * Same function signatures will be overwritten
 * as there should be no distinction between their hashes,
 * even if such functions defined in different contracts.
 * 
 * @param {Object} contracts Compiler meta-data about contracts.
 * 
 * @returns {Object} Dictionary object where
 *                   key is a hex string first 4 bytes of keccak256 hash
 *                   and value is a corresponding function signature.
 */
const getFunctionHashes = (contracts) => {
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
}

/*
 * Compile contracts using solc snapshot
 */

const getCompiledContracts = (input, solcSnapshot, solidityFileName, compileContractName) => {
    const compiled = JSON.parse(solcSnapshot.compile(JSON.stringify(input)));

    // TODO: Handle the below errors elegantly to be thrown rather than exiting
    if (!compiled.contracts || !Object.keys(compiled.contracts).length) {
        if (compiled.errors) {
            for (const compiledError of compiled.errors) {
                console.log(chalk.red(compiledError.formattedMessage));
            }
        }
        process.exit(-1);
    }

    const inputFile = compiled.contracts[solidityFileName];
    let contract, contractName;

    if (inputFile.length === 0) {
        throw new Error('✖ No contracts found');
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

            let bytecodes = {};

            for (let key in inputFile) {
                if (inputFile.hasOwnProperty(key)) {
                    bytecodes[inputFile[key].evm.bytecode.object.length] = key;
                }
            }

            const largestBytecodeKey = Object.keys(bytecodes).reverse()[0];

            contractName = bytecodes[largestBytecodeKey];
            contract = inputFile[contractName];
        }
    }

    /* Bytecode would be empty if contract is only an interface */

    if (!contract.evm.bytecode.object) {
        throw new Error('✖ Compiling the Solidity code did not return any bytecode. Note that abstract contracts cannot be analyzed.');
    }

    /* Bytecode should match the regex /^(0x)?([0-9a-fA-F]{2})+$/ */

    // if (!/^(0x)?([0-9a-fA-F]{2})+$/.test(contract.evm.bytecode.object)) {
    //     throw new Error('✖ Generated bytecode fails to match the required pattern: /^(0x)?([0-9a-fA-F]{2})+$/');
    // }

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
    getImportPaths,
    getSolcInput,
    getSolidityVersion,
    loadSolcVersion,
};
