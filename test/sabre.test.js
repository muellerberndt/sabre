const chai = require('chai');
const compiler = require('../lib/compiler');
const fs = require('fs');
const report = require('../lib/report');
const path = require('path');
const Profiler = require('truffle-compile/profiler');
const Resolver = require('truffle-resolver');
const solc = require('solc');

const assert = chai.assert;
const working_directory = process.cwd();
const contractsDir = 'contracts';
const resolver = new Resolver({
    working_directory,
    contracts_build_directory: path.resolve(working_directory, contractsDir),
});

describe('Contracts Compilation Test', function() {
    fs.readdirSync(contractsDir).forEach(file => {
        it(`compiling contract ${file}`, function() {
            const solidity_file_path = path.resolve(working_directory, `${contractsDir}/${file}`);

            Profiler.resolveAllSources(resolver, [solidity_file_path], solc)
                .then(resolved => {
                    const sourceList = Object.keys(resolved);
                    const allSources = {};

                    sourceList.forEach(file => {
                        allSources[file] = { content: resolved[file].body };
                    });

                    /* Get the input config for the Solidity Compiler */
                    const input = compiler.getSolcInput(allSources);

                    let compiledData;

                    try {
                        compiledData = compiler.getCompiledContracts(input, solc, solidity_file_path);

                        /**
                         * If solc version is at least 0.4.7, then swarm hash is included into the bytecode
                         * `a165627a7a72305820` is a fixed prefix of swarm info that will be appended to contract bytecode
                         *
                         * Ref: https://github.com/ConsenSys/bytecode-verifier/blob/master/src/verifier.js#L59
                         */

                        assert.isTrue(
                            compiledData.contract.evm.bytecode.object.indexOf('a165627a7a72305820') !== -1
                        );
                    } catch (err) {
                        assert.equal(err.message, '✖ Compiling the Solidity code did not return any bytecode. Note that abstract contracts cannot be analyzed.');
                    }
                })
                .catch(err => console.log(err));
        });
    });
});

describe('ESlint Issues Format Test', function() {
    it(`eslint format issues for contract token.sol`, function() {
        const solidity_file_path = path.resolve(working_directory, `${contractsDir}/token.sol`);

        Profiler.resolveAllSources(resolver, [solidity_file_path], solc)
            .then(resolved => {
                const sourceList = Object.keys(resolved);
                const allSources = {};

                sourceList.forEach(file => {
                    allSources['token.sol'] = { content: resolved[file].body };
                });

                /* Get the input config for the Solidity Compiler */
                const input = compiler.getSolcInput(allSources);

                /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
                const data = { sources: { ...input.sources } };

                /* Get the issues from the `issues.json` file to mock the API response */
                const { issues } = JSON.parse(fs.readFileSync(`issues.json`, 'utf8').toString());

                const uniqueIssues = report.formatIssues(data, issues);

                assert.equal(uniqueIssues[0].errorCount, 2);

                assert.include(
                    uniqueIssues[0].messages[0],
                    {
                        message: 'The binary subtraction can underflow.',
                        severity: 2,
                        line: 13,
                        column: 4
                    }
                );

                assert.include(
                    uniqueIssues[0].messages[1],
                    {
                        message: 'The binary addition can overflow.',
                        severity: 2,
                        line: 14,
                        column: 4
                    }
                );
            });
    });
});
