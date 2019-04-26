#!/usr/bin/env node

const solc = require('solc');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const requireFromString = require('require-from-string');
const client = require('./lib/client');
const compiler = require('./lib/compiler');
const report = require('./lib/report');
const releases = require('./lib/releases');
const util = require('util');

let ethAddress = process.env.MYTHX_ETH_ADDRESS;
let password = process.env.MYTHX_PASSWORD;

const args = require('minimist')(process.argv.slice(2), {
    boolean: [ 'noCacheLookup', 'debug', 'sendAST' ],
    default: { mode: 'quick' },
});

const helpText = `Minimum viable CLI for the MythX security analysis platform.

USAGE:

$ sabre [options] <solidity_file>

OPTIONS:
    --mode <quick/full>             Analysis mode (default=quick)
    --clientToolName <string>       Override clientToolNames
    --noCacheLookup                 Deactivate MythX cache lookups
    --sendAST                       Submit AST instead of source code
    --debug                         Print MythX API request and response
`;

if (!args._.length) {
    console.log(helpText);
    process.exit(-1);
}

if (!['quick', 'full'].includes(args.mode)) {
    console.log('Invalid analysis mode. Please use either "quick" or "full".');
    process.exit(-1);
}

const solidity_file_path = args._[0];
const solidity_file_name = path.basename(solidity_file_path);

if (!(ethAddress && password)) {
    ethAddress = '0x0000000000000000000000000000000000000000';
    password = 'trial';
}

let solidity_code;

try {
    solidity_code = fs.readFileSync(solidity_file_path, 'utf8');
} catch (err) {
    console.log('Error opening input file' + err.message);
    process.exit(-1);
}

const solidity_file_dir = path.dirname(solidity_file_path);

/* Parse all the import sources and add them to the `sourceList` */

const { sources, sourceList } = compiler.parseImports(solidity_code, solidity_file_dir);

/* Add original solidity file to the last of the list */

sourceList.push(solidity_file_name);

const input = {
    language: 'Solidity',
    sources: {
        [solidity_file_name]: {
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

/* Get the version of the Solidity Compiler */

const version = compiler.getSolidityVersion(solidity_code);

const solcSpinner = ora({ text: `Downloading solc v${version}`, color: 'yellow', spinner: 'bouncingBar' }).start();

try {
    compiler.loadSolcVersion(releases[version], (solcString) => {
        solcSpinner.succeed(`Compiled with solc v${version} successfully`);

        // NOTE: `solcSnapshot` has the same interface as `solc`
        const solcSnapshot = solc.setupMethods(requireFromString(solcString), 'soljson-' + releases[version] + '.js');

        let compiledData;

        try {
            compiledData = compiler.getCompiledContracts(input, solcSnapshot, solidity_file_name);
        } catch (e) {
            console.log(chalk.red(e.message));
            process.exit(1);
        }

        const data = client.getRequestData(
            input,
            compiledData,
            sourceList,
            solidity_file_name,
            args.sendAST
        );

        if (args.debug) {
            console.log('-------------------');
            console.log('MythX Request Body:\n');
            console.log(util.inspect(data, false, null, true /* enable colors */));
        }

        const mythxSpinner = ora({ text: 'Analyzing ' + compiledData.contractName, color: 'yellow', spinner: 'bouncingBar' }).start();

        client.getMythXReport(args, ethAddress, password, data)
            .then(result => {
                // Stop the spinner and clear from the terminal
                mythxSpinner.stop();

                /* Add `solidity_file_path` to display the result in the ESLint format with the provided input path */
                data.filePath = solidity_file_path;

                /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
                data.sources = { ...input.sources };

                if (args.debug){
                    console.log('-------------------');
                    console.log('MythX Response Body:\n');
                    console.log(util.inspect(result, { showHidden: false, depth: null }));
                    console.log('-------------------');
                }

                const { issues } = result;
                report.formatIssues(data, issues);
            })
            .catch(err => {
                // Stop the spinner and clear from the terminal
                mythxSpinner.stop();

                console.log(chalk.red(err));
            });
    });
} catch (err) {
    solcSpinner.fail(`Compilation with solc v${version} failed`);
    console.log(chalk.red(err));
}
