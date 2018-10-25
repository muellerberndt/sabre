const armlet = require('armlet');
const solc = require('solc');
const fs = require('fs');


var filename = process.argv[2]; 
if (fs.statSync(filename)){
  var input = fs.readFileSync(filename, 'utf8');

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
        [filename]
      ],
      sources: {
        [filename]: input
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

  client.analyze({data})
    .then(issues => {
      console.log(issues);
    }).catch(err => {
      console.log(err);
    }
  );
}   
else {
  console.log(filename + " is not a file");
}
