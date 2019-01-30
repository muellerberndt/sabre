const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');

var solidity_file = process.argv[2];
var solidity_code = fs.readFileSync(solidity_file, 'utf8');

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

for (var contractName in compiled.contracts.inputfile) {
    contract = compiled.contracts.inputfile[contractName];
    break;
}

/* Format data for Mythril Platform API */

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

/* Instantiate Mythril Platform Client */

const client = new armlet.Client(
  {
    ethAddress: process.env.MYTHX_ETH_ADDRESS,
    password: process.env.MYTHX_PASSWORD,
    platforms: ['sabre']  // client chargeback
  }
);

client.analyze({data, timeout: 60000})
  .then(issues => {
    console.log(issues);
  }).catch(err => {
    console.log(err);
  }
);
