#!/usr/bin/env node

const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const requireFromString = require('require-from-string');
const helpers = require('./lib/helpers');
const releases = require('./lib/releases');

let ethAddress = process.env.MYTHX_ETH_ADDRESS;
let password = process.env.MYTHX_PASSWORD;

const args = require('minimist')(process.argv.slice(2), {
    boolean: [ 'noCacheLookup', 'debug', 'sendSourceCode' ],
    default: { mode: 'quick' },
});

const helpText = `Minimum viable CLI for the MythX security analysis platform.

USAGE:

$ sabre [options] <solidity_file>

OPTIONS:
    --mode <quick/full>             Analysis mode (default=quick)
    --clientToolName <string>       Override clientToolNames
    --noCacheLookup                 Deactivate MythX cache lookups
    --sendSourceCode                Send source code instead of AST
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

let sourceList = [];

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

const input = {
    language: 'Solidity',
    sources: {
        inputfile: {
            content: solidity_code
        }
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

const solidity_file_dir = path.dirname(solidity_file_path);
const import_paths = helpers.getImportPaths(solidity_code);

/*
 * Add all the relative path imports to the input `source` list recursively
 * Add directory to source path if both the import and recursive import do not start with `./`
 * TODO: Support importing contracts from `node_modules`
 */

const parseImports = (dir, filepath, updateSourcePath) => {
    try {
        const relativeFilePath = path.join(dir, filepath);
        const relativeFileDir = path.dirname(relativeFilePath);

        if (fs.existsSync(relativeFilePath)) {
            const content = fs.readFileSync(relativeFilePath).toString();
            const imports = helpers.getImportPaths(content);
            imports.map(p => parseImports(relativeFileDir, p, !(p.startsWith('./') && filepath.startsWith('./'))));

            let sourceUrl = helpers.removeRelativePathFromUrl(filepath);
            if (updateSourcePath && filepath.startsWith('./')) {
                sourceUrl = relativeFileDir.split(path.sep).pop() + '/' + sourceUrl;
            }

            if (sourceList.indexOf(sourceUrl) === -1) {
                sourceList.push(sourceUrl);
                input.sources[sourceUrl] = { content };
            }
        }
    } catch(err) {
        throw new Error(`Import ${filepath} not found`);
    }
};

/* Parse all the import sources and add them to the `sourceList` */

import_paths.map(filepath => parseImports(solidity_file_dir, filepath, false));

/* Add original solidity file to the last of the list */

sourceList.push(solidity_file_name);

const getMythXReport = solidityCompiler => {
    const compiled = JSON.parse(solidityCompiler.compile(JSON.stringify(input)));

    if (!compiled.contracts || !Object.keys(compiled.contracts).length) {
        if (compiled.errors) {
            for (const compiledError of compiled.errors) {
                console.log(chalk.red(compiledError.formattedMessage));
            }
        }
        process.exit(-1);
    }

    let { inputfile } = compiled.contracts;
    let contract, contractName;

    if (inputfile.length === 0) {
        console.log(chalk.red('✖ No contracts found'));
        process.exit(-1);
    } else if (inputfile.length === 1) {
        contractName = Object.keys(inputfile)[0];
        contract = inputfile[contractName];
    } else {

        /*
         * Get the contract with largest bytecode object to generate MythX analysis report.
         * If inheritance is used, the main contract is the largest as it contains the bytecode of all others.
        */

        let bytecodes = {};

        for (let key in inputfile) {
            if (inputfile.hasOwnProperty(key)) {
                bytecodes[inputfile[key].evm.bytecode.object.length] = key;
            }
        }

        const largestBytecodeKey = Object.keys(bytecodes).reverse()[0];
        contractName = bytecodes[largestBytecodeKey];
        contract = inputfile[contractName];
    }

    /* Format data for MythX API */

    const data = {
        contractName,
        bytecode: helpers.replaceLinkedLibs(contract.evm.bytecode.object),
        sourceMap: contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: helpers.replaceLinkedLibs(contract.evm.deployedBytecode.object),
        deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
        sourceList: sourceList,
        analysisMode: 'quick',
        sources: {}
    };

    if (args.sendSourceCode){
        data.mainSource = solidity_file_path;
        data.sources[solidity_file_name] = { source: solidity_code };
    } else {
        data.sources[solidity_file_name] = { ast: compiled.sources.inputfile.ast };
    }




    if (args.debug){
        console.log("-------------------");
        console.log("MythX Request Body:\n");
        console.log(data);
    }

    /* Instantiate MythX Client */

    const client = new armlet.Client(
        {
            ethAddress,
            password,
        }
    );

    const mythxSpinner = ora({ text: 'Analyzing ' + contractName, color: 'yellow', spinner: 'bouncingBar' }).start();

    client.analyzeWithStatus({ data, timeout: 300000, analysisMode: args.mode, clientToolName: args.clientToolName || 'sabre', noCacheLookup: args.noCacheLookup})
        .then(result => {
            // Stop the spinner and clear from the terminal
            mythxSpinner.stop();

            /* Add `solidity_file_path` to display the result in the ESLint format with the provided input path */
            data.filePath = solidity_file_path;

            /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
            data.sources = { [solidity_file_name]: { content: solidity_code }, ...input.sources };

            if (args.debug){
                console.log("-------------------");
                console.log("MythX Response Body:\n");
                console.log( JSON.stringify(result, null, 4));
                console.log("-------------------");
            }
     
            const { issues } = result;
            helpers.doReport(data, issues);
        })
        .catch(err => {
            // Stop the spinner and clear from the terminal
            mythxSpinner.stop();

            console.log(chalk.red(err));
        });
};

/* Get the version of the Solidity Compiler */

const version = helpers.getSolidityVersion(solidity_code);

/* If Solidity Contract has version specified, fetch the matching solc compiler */

if (version !== releases.latest) {
    const solcSpinner = ora({ text: `Downloading solc v${version}`, color: 'yellow', spinner: 'bouncingBar' }).start();

    try {
        helpers.loadSolcVersion(releases[version], (solcString) => {
            solcSpinner.succeed(`Compiled with solc v${version} successfully`);

            // NOTE: `solcSnapshot` has the same interface as `solc`
            const solcSnapshot = solc.setupMethods(requireFromString(solcString), 'soljson-' + releases[version] + '.js');

            getMythXReport(solcSnapshot);
        });
    } catch (err) {
        solcSpinner.fail(`Compilation with solc v${version} failed`);
        console.log(chalk.red(err));
    }

} else {
    /* Use `solc`, if the specified version in the contract matches it's latest version */

    getMythXReport(solc);
}
