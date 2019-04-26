const chai = require('chai');
const compiler = require('../lib/compiler');
const fs = require('fs');
const solc = require('solc');

const assert = chai.assert;
const contractsDir = 'contracts';

describe('Contracts Compilation Test', function() {
    fs.readdirSync(contractsDir).forEach(file => {
        it(`compiling contract ${file}`, function() {
            const solidity_code = fs.readFileSync(`${contractsDir}/${file}`, 'utf8');

            const { sources } = compiler.parseImports(solidity_code, contractsDir);

            const input = {
                language: 'Solidity',
                sources: {
                    [file]: {
                        content: solidity_code
                    },
                    ...sources
                },
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

            let compiledData;

            try {
                compiledData = compiler.getCompiledContracts(input, solc, file);
                assert.isObject(compiledData);
            } catch (err) {
                assert.equal(err.message, '✖ Compiling the Solidity code did not return any bytecode. Note that abstract contracts cannot be analyzed.');
            }
        });
    });
});
