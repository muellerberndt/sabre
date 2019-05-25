const armlet = require('armlet');
const utils = require('./utils');

const getRequestData = (input, compiledData, sourceList, solidity_file_name, sendAST) => {
    /* Format data for MythX API */

    const data = {
        contractName: compiledData.contractName,
        bytecode: utils.replaceLinkedLibs(compiledData.contract.evm.bytecode.object),
        sourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: utils.replaceLinkedLibs(compiledData.contract.evm.deployedBytecode.object),
        deployedSourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        sourceList,
        analysisMode: 'quick',
        sources: {}
    };

    if (sendAST) {
        for (let key in compiledData.compiled.sources) {
            if (compiledData.compiled.sources.hasOwnProperty(key)) {
                data.sources[key] = { ast: compiledData.compiled.sources[key].ast };
            }
        }
    } else {
        for (let key in input.sources) {
            if (input.sources.hasOwnProperty(key)) {
                data.sources[key] = { source: input.sources[key].content };
            }
        }
    }

    data.mainSource = solidity_file_name;

    return data;
};

const getMythXReport = (args, ethAddress, password, data) => {
    /* Instantiate MythX Client */

    const client = new armlet.Client(
        {
            ethAddress,
            password,
        }
    );

    return client.analyzeWithStatus({
        data,
        timeout: 300000,
        analysisMode: args.mode,
        clientToolName: args.clientToolName || 'sabre',
        noCacheLookup: args.noCacheLookup
    });
};

module.exports = {
    getMythXReport,
    getRequestData
};
