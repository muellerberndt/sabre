const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');

var input = fs.readFileSync(process.argv[2], 'utf8');

var output = solc.compile(input, 1);
var contract = output.contracts[Object.keys(output.contracts)[0]];

/* Format data for Mythril Platform API */

var data = {
    contractName: "Hello",
    bytecode: contract.bytecode,
    sourceMap: contract.srcmap,
    deployedBytecode: contract.runtimeBytecode,
    deployedSourceMap: contract.srcmapRuntime,
    sourceList: [
      'hello.sol'
    ],
    sources: {
      'hello.sol': 'contract Hello {\n\naddress owner;\n\nfunction Hello() {\nowner = msg.sender;\n}\n}'
    },
    analysisMode: "full"
};

/* Instantiate Mythril Platform Client */

const client = new armlet.Client(
  {
      apiKey: process.env.MYTHRIL_API_KEY,
      inputApiUrl: process.env.MYTHRIL_API_URL,
      userEmail: "hello@world.com",
  }
);

client.analyze({data, timeout: 60000})
  .then(issues => {
    console.log(issues);
  }).catch(err => {
    console.log(err);
  }
);
