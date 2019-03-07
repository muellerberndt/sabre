#!/usr/bin/env node

const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');
const helpers = require('./lib/helpers');
const releases = require('./lib/releases');

if (process.argv.length != 3) {
    console.log('Usage: ' + __filename + ' <solidity_file>');
    process.exit(-1);
}

let ethAddress = process.env.MYTHX_ETH_ADDRESS;
let password = process.env.MYTHX_PASSWORD;
const solidity_file = process.argv[2];

if (!(ethAddress && password)) {
    ethAddress = '0x0000000000000000000000000000000000000000';
    password = 'trial';
}

let solidity_code;

try {
    solidity_code = fs.readFileSync(solidity_file, 'utf8');
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
                '*': ['*']
            }
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};

const getMythXReport = solidityCompiler => {
    const compiled = JSON.parse(solidityCompiler.compile(JSON.stringify(input)));

    if (!compiled.contracts) {
        if (compiled.errors) {
            for (const compiledError of compiled.errors) {
                console.log(compiledError.formattedMessage);
            }
        }
        process.exit(-1);
    }

    let { inputfile } = compiled.contracts;
    let contract, contractName;

    if (inputfile.length === 0) {
        console.log('No contracts found');
        process.exit(-1);
    } else if (inputfile.length === 1) {
        contractName = Object.keys(inputfile)[0];
        contract = inputfile[contractName];
    } else {
        /* Get the contract with largest bytecode object to generate MythX analysis report */

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
        contractName: contractName,
        bytecode: contract.evm.bytecode.object,
        sourceMap: contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: contract.evm.deployedBytecode.object,
        deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
        sourceList: [solidity_file],
        analysisMode: 'quick',
        sources: {}
    };

    data.sources[solidity_file] = { source: solidity_code };

    /* Instantiate MythX Client */

    const client = new armlet.Client(
        {
            clientToolName: 'sabre',  // tool name useful for statistics tracking
            ethAddress: ethAddress,
            password: password,
        }
    );

    client.analyzeWithStatus({ data, timeout: 300000 })
        .then(result => {
            const { issues } = result;
            helpers.doReport(data, issues);
        })
        .catch(err => {
            console.log(err);
        });
};

/* Regex to match the version format of the Solidity */

const versionMatch = /\d{1,2}\.\d{1,2}\.\d{1,2}/.exec(solidity_code);

/* If Solidity Contract has version specified, fetch the matching solc compiler */

if (solidity_code.indexOf('pragma solidity') !== -1 && versionMatch && versionMatch[0] !== releases.latest) {
    /* Get the solc remote version snapshot of the specified version in the contract */

    solc.loadRemoteVersion(releases[versionMatch[0]], function (err, solcSnapshot) {
        if (err) {
            console.error(err);
        } else {
            // NOTE: `solcSnapshot` has the same interface as `solc`
            getMythXReport(solcSnapshot);
        }
    });
} else {
    /* Use `solc`, if the specified version in the contract matches it's latest version */

    getMythXReport(solc);
}
