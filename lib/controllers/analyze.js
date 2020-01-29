const fs = require('fs');
const path = require('path');
const util = require('util');
const chalk = require('chalk');
const ora = require('ora');
const Profiler = require('@truffle/compile-solidity/profiler');
const Resolver = require('@truffle/resolver');
const client = require('../client');
const compiler = require('../compiler');
const report = require('../report');
const releases = require('../releases');

module.exports = async (env, args) => {
    let { username, password, apiUrl, apiKey } = env;

    const modes = ['quick', 'full', 'standard', 'deep'];

    if (args._.length < 2 || args._.length > 3) {
        console.log('Invalid command line. Use sabre analyze [options] <file>');

        process.exit(-1);

    }

    if (!modes.includes(args.mode)) {
        console.log('Invalid analysis mode. Available modes: quick, standard, deep');

        process.exit(-1);
    }

    const formats = ['text', 'stylish', 'compact', 'table', 'html', 'json'];

    if (!formats.includes(args.format)) {
        console.log('Invalid output format. Available formats: ' + formats.join(', ') + '.');

        process.exit(-1);
    }

    const solidityFilePath = path.resolve(process.cwd(), args._[1]);
    const solidityFileDir = path.dirname(solidityFilePath);

    const resolver = new Resolver({
        working_directory: solidityFileDir,
        contracts_build_directory: solidityFileDir
    });

    const spinner = ora({
        color: 'yellow',
        spinner: 'bouncingBar'
    });

    try {
        spinner.start('Reading input file');

        const solidityCode = fs.readFileSync(solidityFilePath, 'utf8');

        spinner.stop();

        spinner.start('Detecting solidity version');

        /* Get the version of the Solidity Compiler */
        const version = compiler.getSolidityVersion(solidityCode);

        spinner.stop();

        spinner.start(`Loading solc v${version}`);

        const { solcSnapshot, fromCache } = await compiler.loadSolcVersion(
            releases[version]
        );

        spinner.succeed(
            fromCache
                ? `Loaded solc v${version} from local cache`
                : `Downloaded solc v${version} and saved to local cache`
        );

        spinner.start('Resolving imports');

        /**
         * Resolve imported sources and read source code for each file.
         */
        const resolvedSources = await Profiler.resolveAllSources(
            resolver,
            [solidityFilePath],
            solcSnapshot
        );

        spinner.stop();

        spinner.start('Compiling source(s)');

        const allSources = {};

        for (const file in resolvedSources) {
            allSources[file] = { content: resolvedSources[file].body };
        }

        /* Get the input config for the Solidity Compiler */
        const input = compiler.getSolcInput(allSources);

        const compiledData = compiler.getCompiledContracts(
            input,
            solcSnapshot,
            solidityFilePath,
            args._[2]
        );

        spinner.succeed(`Compiled with solc v${version} successfully`);

        spinner.start('Authenticating user');

        const mxClient = client.initialize(apiUrl, username, password);

        if (apiKey) {
            await client.authenticateWithToken(mxClient, { access: apiKey });
        } else {
            await client.authenticate(mxClient);
        }

        spinner.stop();

        spinner.start('Submitting data for analysis');

        const data = client.getRequestData(
            input,
            compiledData,
            solidityFilePath,
            args
        );

        if (args.debug) {
            spinner.stop();

            console.log('-------------------');
            console.log('MythX Request Body:\n');
            console.log(util.inspect(data, false, null, true));

            spinner.start();
        }

        const { uuid } = await client.submitDataForAnalysis(mxClient, data);

        spinner.succeed(
            'Analysis job submitted: ' +
            chalk.yellow('https://dashboard.mythx.io/#/console/analyses/' + uuid)

        );

        spinner.start('Analyzing ' + compiledData.contractName);

        let initialDelay;
        let timeout;

        if (args.mode === 'quick') {
            initialDelay = 20 * 1000;
            timeout = 180 * 1000;
        } else if (args.mode === 'standard' || args.mode == 'full') {
            initialDelay = 900 * 1000;
            timeout = 1800 * 1000;
        }
        else {
            initialDelay = 2700 * 1000;
            timeout = 5400 * 1000;
        }

        await client.awaitAnalysisFinish(
            mxClient,
            uuid,
            initialDelay,
            timeout
        );

        spinner.stop();

        spinner.start('Retrieving analysis results');

        const issues = await client.getReport(mxClient, uuid);

        spinner.stop();

        spinner.start('Rendering output');

        /* Add all the imported contracts source code to the `data` to sourcemap the issue location */
        data.sources = { ...input.sources };

        /* Copy reference to compiled function hashes */
        data.functionHashes = compiledData.functionHashes;

        if (args.debug) {
            spinner.stop();

            console.log('-------------------');
            console.log('MythX Response Body:\n');
            console.log(util.inspect(issues, false, null, true));
            console.log('-------------------');

            spinner.start();
        }

        const uniqueIssues = report.formatIssues(data, issues);

        if (uniqueIssues.length === 0) {
            spinner.stop();

            console.log(chalk.green(`✔ No errors/warnings found in ${args._[0]} for contract: ${compiledData.contractName}`));
        } else {
            const formatter = report.getFormatter(args.format);
            const output = formatter(uniqueIssues);

            spinner.stop();

            console.log(output);
        }
    } catch (err) {
        if (spinner.isSpinning) {
            spinner.fail();
        }

        console.log(chalk.red(err));

        process.exit(1);
    }
};
