#!/usr/bin/env node

const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');
const helpers = require('./lib/helpers');

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
                '*': [ '*' ]
            }
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};

const compiled = JSON.parse(solc.compile(JSON.stringify(input)));

if (!compiled.contracts) {
    if (compiled.errors) {
        for (const compiledError of compiled.errors) {
            console.log(compiledError.formattedMessage);
        }
    }
    process.exit(-1);
}

if (compiled.contracts.inputfile.length === 0) {
    console.log('No contracts found');
    process.exit(-1);
}

// Show report for only the first contract.
const contractName = Object.keys(compiled.contracts.inputfile)[0];
const contract = compiled.contracts.inputfile[contractName];

/* Format data for MythX API */

const data = {
    contractName: contractName,
    bytecode: contract.evm.bytecode.object,
    sourceMap: contract.evm.deployedBytecode.sourceMap,
    deployedBytecode: contract.evm.deployedBytecode.object,
    deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
    sourceList: [ solidity_file ],
    analysisMode: 'quick',
    sources: {}
};

data.sources[solidity_file] = {source: solidity_code};

/* Instantiate MythX Client */

const client = new armlet.Client(
    {
        clientToolName: 'sabre',  // tool name useful for statistics tracking
        ethAddress: ethAddress,
        password: password,
    }
);

client.analyzeWithStatus({data, timeout: 300000})
    .then(result => {
        // const util = require('util');
        // console.log(util.inspect(result, {colors: true, depth: 6}));

        const { issues } = result;
        helpers.doReport(data, issues);
    })
    .catch(err => {
        console.log(err);
    });
