const mythx = require('mythxjs');
const utils = require('./utils');

const getRequestData = (input, compiledData, fileName, args) => {
    /* Format data for MythX API */
    const data = {
        contractName: compiledData.contractName,
        bytecode: utils.replaceLinkedLibs(compiledData.contract.evm.bytecode.object),
        sourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: utils.replaceLinkedLibs(compiledData.contract.evm.deployedBytecode.object),
        deployedSourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        sourceList: Object.keys(input.sources),
        analysisMode: args.mode,
        toolName: args.clientToolName || 'sabre',
        noCacheLookup: args.noCacheLookup,
        sources: {}
    };

    for (const key in compiledData.compiled.sources) {
        const ast = compiledData.compiled.sources[key].ast;
        const source = input.sources[key].content;

        data.sources[key] = { ast, source };
    }

    data.mainSource = fileName;

    return data;
};

const failAnalysis = (reason, status) => {
    throw new Error(
        reason +
        ' ' +
        'The analysis job state is ' +
        status.toLowerCase() +
        ' and the result may become available later.'
    );
};

const awaitAnalysisFinish = async (client, uuid, initialDelay, timeout) => {
    const statuses = [ 'Error', 'Finished' ];

    let state = await client.getAnalysisStatus(uuid);

    if (statuses.includes(state.status)) {
        return state;
    }

    const timer = interval => new Promise(resolve => setTimeout(resolve, interval));

    const maxRequests = 10;
    const start = Date.now();
    const remaining = Math.max(timeout - initialDelay, 0);
    const inverted = Math.sqrt(remaining) / Math.sqrt(285);

    for (let r = 0; r < maxRequests; r++) {
        const idle = Math.min(
            r === 0 ? initialDelay : (inverted * r) ** 2,
            start + timeout - Date.now()
        );

        await timer(idle);

        if (Date.now() - start >= timeout) {
            failAnalysis(
                `User or default timeout reached after ${timeout / 1000} sec(s).`,
                state.status
            );
        }

        state = await client.getAnalysisStatus(uuid);

        if (statuses.includes(state.status)) {
            return state;
        }
    }

    failAnalysis(
        `Allowed number (${maxRequests}) of requests was reached.`,
        state.status
    );
};

const initialize = (apiUrl, ethAddress, password) => {
    return new mythx.Client(ethAddress, password, undefined, apiUrl);
};

const authenticate = async (client) => {
    return await client.login();
};

const submitDataForAnalysis = async(client, data) => {
    return await client.analyze(data);
};

const getReport = async (client, uuid) => {
    return await client.getDetectedIssues(uuid);
};

const getApiVersion = async (client) => {
    return await client.getVersion();
};

module.exports = {
    initialize,
    authenticate,
    awaitAnalysisFinish,
    submitDataForAnalysis,
    getApiVersion,
    getReport,
    getRequestData
};
