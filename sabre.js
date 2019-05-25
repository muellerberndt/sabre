#!/usr/bin/env node

const solc = require('solc');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const requireFromString = require('require-from-string');
const Profiler = require('truffle-compile/profiler');
const Resolver = require('truffle-resolver');
const client = require('./lib/client');
const compiler = require('./lib/compiler');
const report = require('./lib/report');
const releases = require('./lib/releases');
const util = require('util');

let ethAddress = process.env.MYTHX_ETH_ADDRESS;
let password = process.env.MYTHX_PASSWORD;

const args = require('minimist')(process.argv.slice(2), {
    boolean: [ 'noCacheLookup', 'debug', 'legacyRequest' ],
    string: [ 'mode', 'format' ],
    default: { mode: 'quick', format: 'stylish' },
});

const helpText = `Minimum viable CLI for the MythX security analysis platform.

USAGE:

$ sabre [options] <solidity_file> [contract_name]

OPTIONS:
    --mode <quick/full>                             Analysis mode (default=quick)
    --format <stylish/compact/table/html/json>      Output format (default=stylish)
    --clientToolName <string>                       Override clientToolName
    --noCacheLookup                                 Deactivate MythX cache lookups
    --legacyRequest                                 Submit source code instead of AST
    --debug                                         Print MythX API request and response
`;

if (!args._.length) {
    console.log(helpText);
    process.exit(-1);
}

if (!['quick', 'full'].includes(args.mode)) {
    console.log('Invalid analysis mode. Please use either "quick" or "full".');
    process.exit(-1);
}

if (['stylish', 'compact', 'table', 'html', 'json'].indexOf(args.format) < 0) {
    console.log('Invalid output format. Please use "stylish", "compact", "table", "html" or "json".');
    process.exit(-1);
}

const working_directory = process.cwd();
const solidity_file_path = path.resolve(working_directory, args._[0]);
const contracts_build_directory = path.dirname(solidity_file_path);

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

const resolver = new Resolver({
    working_directory,
    contracts_build_directory,
});

const allSources = {};

/* Get the version of the Solidity Compiler */

const version = compiler.getSolidityVersion(solidity_code);

const solcSpinner = ora({ text: `Downloading solc v${version}`, color: 'yellow', spinner: 'bouncingBar' }).start();

try {
    compiler.loadSolcVersion(releases[version], (solcString) => {

        // NOTE: `solcSnapshot` has the same interface as `solc`
        const solcSnapshot = solc.setupMethods(requireFromString(solcString), 'soljson-' + releases[version] + '.js');

        /* Parse all the import sources and the `sourceList` */

        Profiler.resolveAllSources(resolver, [solidity_file_path], solcSnapshot)
            .then(resolved => {
                const sourceList = Object.keys(resolved);

                sourceList.forEach(file => {
                    allSources[file] = { content: resolved[file].body };
                });

                /* Get the input config for the Solidity Compiler */

                const input = compiler.getSolcInput(allSources);

                let compiledData;

                try {
                    compiledData = compiler.getCompiledContracts(input, solcSnapshot, solidity_file_path, args._[1]);
                } catch (e) {
                    console.log(chalk.red(e.message));
                    process.exit(1);
                }

                solcSpinner.succeed(`Compiled with solc v${version} successfully`);

                const data = client.getRequestData(
                    input,
                    compiledData,
                    sourceList,
                    solidity_file_path,
                    args.legacyRequest
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

                        /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
                        data.sources = { ...input.sources };

                        if (args.debug){
                            console.log('-------------------');
                            console.log('MythX Response Body:\n');
                            console.log(util.inspect(result, { showHidden: false, depth: null }));
                            console.log('-------------------');
                        }

                        const { issues } = result;
                        const uniqueIssues = report.formatIssues(data, issues);

                        if (uniqueIssues.length === 0) {
                            console.log(chalk.green(`✔ No errors/warnings found in ${args._[0]} for contract: ${compiledData.contractName}`));
                        } else {
                            const formatter = report.getFormatter(args.format);
                            console.log(formatter(uniqueIssues));
                        }
                    })
                    .catch(err => {
                        // Stop the spinner and clear from the terminal
                        mythxSpinner.stop();

                        console.log(chalk.red(err));
                    });
            })
            .catch(err => {
                solcSpinner.fail('Resolving imports failed');
                console.log(chalk.red(err.message));
            });
    });
} catch (err) {
    solcSpinner.fail(`Compilation with solc v${version} failed`);
    console.log(chalk.red(err.message));
}
