const chai = require('chai');
const fs = require('fs');
const path = require('path');
const Profiler = require('@truffle/compile-solidity/profiler');
const Resolver = require('@truffle/resolver');
const solc = require('solc');
const compiler = require('../lib/compiler');
const report = require('../lib/report');

const assert = chai.assert;

const workingDir = process.cwd();
const contractsDir = path.resolve(workingDir, 'contracts');

const resolver = new Resolver({
    working_directory: workingDir,
    contracts_build_directory: contractsDir
});

const correctMessages = [
    {
        message: 'No pragma is set.',
        severity: 1,
        line: 1,
        column: 0
    },
    {
        message: 'State variable shadows another state variable.',
        severity: 1,
        line: 12,
        column: 4
    }
];

describe('Report test', () => {
    it('Contract TokenSale.sol', async () => {
        const filePath = path.resolve(contractsDir, 'TokenSale.sol');

        const resolvedSources = await Profiler.resolveAllSources(
            resolver,
            [filePath],
            solc
        );

        const sources = {};

        Object.keys(resolvedSources).forEach(source => {
            const baseName = path.basename(source);

            sources[baseName] = { content: resolvedSources[source].body };
        });

        /* Get the input config for the Solidity Compiler */
        const input = compiler.getSolcInput(sources);

        /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
        const data = { sources: { ...input.sources } };

        /* Get the issues from file to mock the API response */
        const { issues } = JSON.parse(
            fs.readFileSync('test/assets/TokenSale.json', 'utf8').toString()
        );

        const reports = report.formatIssues(data, issues);

        assert.equal(reports.length, 1);

        const fileReport = reports[0];

        assert.equal(fileReport.messages.length, correctMessages.length);
        assert.equal(fileReport.errorCount, 0);
        assert.equal(fileReport.warningCount, 2);

        fileReport.messages.forEach((message, index) => {
            assert.include(message, correctMessages[index]);
        });
    });
});
