const chai = require('chai');
const fs = require('fs');
const path = require('path');
const Profiler = require('@truffle/compile-solidity/profiler');
const Resolver = require('@truffle/resolver');
const solc = require('solc');
const compiler = require('../lib/compiler');

const assert = chai.assert;

const workingDir = process.cwd();
const contractsDir = path.resolve(workingDir, 'contracts');

const resolver = new Resolver({
    working_directory: workingDir,
    contracts_build_directory: contractsDir
});

describe('Compile test', () => {
    fs.readdirSync(contractsDir).forEach(file => {
        it(`Compile contract "${file}"`, async () => {
            const filePath = path.join(contractsDir, file);

            const resolvedSources = await Profiler.resolveAllSources(
                resolver,
                [filePath],
                solc
            );

            const sources = {};

            Object.keys(resolvedSources).forEach(source => {
                sources[source] = { content: resolvedSources[source].body };
            });

            /* Get the input config for the Solidity Compiler */
            const input = compiler.getSolcInput(sources);

            let data, error;

            try {
                data = compiler.getCompiledContracts(input, solc, filePath);
            } catch (e) {
                error = e;
            }

            if (data) {
                assert.isObject(data.compiled);
                assert.isObject(data.compiled.contracts);
                assert.isObject(data.compiled.sources);
                assert.isObject(data.compiled.sources[filePath]);

                assert.isString(data.contractName);
                assert.isObject(data.functionHashes);

                assert.isObject(data.contract);
                assert.isObject(data.contract.evm);

                assert.isObject(data.contract.evm.bytecode);
                assert.isString(data.contract.evm.bytecode.object);

                assert.isObject(data.contract.evm.deployedBytecode);
                assert.isString(data.contract.evm.deployedBytecode.object);

                assert.isTrue(
                    data.contract.evm.bytecode.object.endsWith(
                        data.contract.evm.deployedBytecode.object
                    )
                );
            } else if (error) {
                const prefixes = [
                    'Compiling the Solidity code did not return any bytecode',
                    'Unable to compile',
                    'No contracts detected after compiling',
                    'No contracts found'
                ];

                assert.isTrue(prefixes.some(prefix => error.message.startsWith(prefix)));
            } else {
                assert.fail(
                    'None of compile data or compile error were detected'
                );
            }
        }).timeout(20000);
    });
});
