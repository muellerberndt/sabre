const armlet = require('armlet');
const utils = require('./utils');

const getRequestData = (input, compiledData, sourceList, solidity_file_name, mode) => {
    /* Format data for MythX API */

    const data = {
        contractName: compiledData.contractName,
        bytecode: utils.replaceLinkedLibs(compiledData.contract.evm.bytecode.object),
        sourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: utils.replaceLinkedLibs(compiledData.contract.evm.deployedBytecode.object),
        deployedSourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        sourceList,
        analysisMode: mode,
        sources: {}
    };


    for (let key in compiledData.compiled.sources) {
        if (compiledData.compiled.sources.hasOwnProperty(key)) {
            data.sources[key] = { ast: compiledData.compiled.sources[key].ast };
        }
    }

    data.mainSource = solidity_file_name;

    return data;
};

const getMythXReport = (args, ethAddress, password, data, initialDelay, timeout) => {
    /* Instantiate MythX Client */

    const client = new armlet.Client(
        {
            ethAddress,
            password,
        }
    );

    return client.analyzeWithStatus({
        data,
        analysisMode: args.mode,
        clientToolName: args.clientToolName || 'sabre',
        noCacheLookup: args.noCacheLookup,
    },
    timeout,
    initialDelay
    );
};

module.exports = {
    getMythXReport,
    getRequestData
};
