const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');

var solidity_file = process.argv[2];
var solidity_code = fs.readFileSync(solidity_file, 'utf8');

var output = solc.compile(solidity_code, 1);
var contract = output.contracts[Object.keys(output.contracts)[0]];

/* Format data for Mythril Platform API */

var data = {
    contractName: "Contract",
    bytecode: contract.bytecode,
    sourceMap: contract.srcmap,
    deployedBytecode: contract.runtimeBytecode,
    deployedSourceMap: contract.srcmapRuntime,
    sourceList: [
      solidity_file
    ],
    sources: {
      solidity_file: solidity_code
    },
    analysisMode: "full"
};

/* Instantiate Mythril Platform Client */

const client = new armlet.Client(
  {
      ethAddress: process.env.MYTHRIL_ETH_ADDRESS,
      password: process.env.MYTHRIL_PASSWORD
  }
);

client.analyze({data, timeout: 60000})
  .then(issues => {
    console.log(issues);
  }).catch(err => {
    console.log(err);
  }
);
