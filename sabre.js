const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');

if (process.argv.length != 3) {
    console.log("Usage: " + __filename + " <solidity_file>");
    process.exit(-1);
}

var ethAddress = process.env.MYTHX_ETH_ADDRESS;
var password = process.env.MYTHX_PASSWORD;
var solidity_file = process.argv[2];

try {
    var solidity_code = fs.readFileSync(solidity_file, 'utf8');
} catch (err) {
    console.log("Error opening input file" + err.message);
    process.exit(-1);
}

var input = {
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
        }
    }
};

var compiled = JSON.parse(solc.compile(JSON.stringify(input)));

if (!compiled.contracts) {
    if (compiled.errors) {

        var len = compiled.errors.length;
        for (var i = 0; i < len; i++) {
            console.log(compiled.errors[i].formattedMessage);
        }
    }
    process.exit(-1);
}

for (var contractName in compiled.contracts.inputfile) {
    contract = compiled.contracts.inputfile[contractName];
    break;
}

/* Format data for MythX API */

var data = {
    contractName: contractName,
    bytecode: contract.evm.bytecode.object,
    sourceMap: contract.evm.deployedBytecode.sourceMap,
    deployedBytecode: contract.evm.deployedBytecode.object,
    deployedSourceMap: contract.evm.deployedBytecode.sourceMap,
    sourceList: [
      solidity_file
    ],
    analysisMode: "quick",
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

client.analyzeWithStatus({data, timeout: 120000})
    .then(result => {
        const util = require('util');
        console.log(util.inspect(result, {colors: true, depth: 6}));
  }).catch(err => {
    console.log(err);
  });
