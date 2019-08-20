const mythx = require('mythxjs');
const utils = require('./utils');

const getRequestData = (compiledData, sourceList, solidity_file_name, args) => {
    /* Format data for MythX API */
    const data = {
        contractName: compiledData.contractName,
        bytecode: utils.replaceLinkedLibs(compiledData.contract.evm.bytecode.object),
        sourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        deployedBytecode: utils.replaceLinkedLibs(compiledData.contract.evm.deployedBytecode.object),
        deployedSourceMap: compiledData.contract.evm.deployedBytecode.sourceMap,
        sourceList,
        analysisMode: args.mode,
        toolName: args.clientToolName || 'sabre',
        noCacheLookup: args.noCacheLookup,
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

const failAnalysis = (reason, status, uuid) => {
    throw new Error(
        reason + ' ' +
        `The analysis job state is ${status.toLowerCase()} ` +
        `and the result may become available later. UUID: ${uuid}.`
    );
};

const watchMythXAnalysis = async (client, analysis, initialDelay, timeout) => {
    const statuses = [ 'Error', 'Finished' ];

    let state = await client.getAnalysisStatus(analysis.uuid);

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
                state.status,
                analysis.uuid
            );
        }

        state = await client.getAnalysisStatus(analysis.uuid);

        if (statuses.includes(state.status)) {
            return state;
        }
    }

    failAnalysis(
        `Allowed number (${maxRequests}) of requests was reached.`,
        state.status,
        analysis.uuid
    );
};

const getMythXReport = async (apiUrl, ethAddress, password, data, initialDelay, timeout) => {
    /* Instantiate MythX Client */
    const client = new mythx.Client(ethAddress, password, undefined, apiUrl);

    await client.login();

    const analysis = await client.analyze(data);

    await watchMythXAnalysis(client, analysis, initialDelay, timeout);

    const issues = await client.getDetectedIssues(analysis.uuid);

    return {
        uuid: analysis.uuid,
        issues
    };
};

const getMythXApiVersion = async (apiUrl, ethAddress, password) => {
    const client = new mythx.Client(ethAddress, password, undefined, apiUrl);
    const data = await client.getVersion();

    return data;
};

module.exports = {
    getMythXApiVersion,
    getMythXReport,
    getRequestData
};
