const chalk = require('chalk');
const ora = require('ora');
const util = require('util');
const client = require('../client');

module.exports = async (env, args) => {
    const spinnerConfig = {
        text: 'Obtaining API version',
        color: 'yellow',
        spinner: 'bouncingBar'
    };

    const spinner = ora(spinnerConfig).start();

    try {
        const data = await client.getMythXApiVersion(
            env.apiUrl,
            env.ethAddress,
            env.password
        );

        spinner.stop();

        if (args.debug) {
            console.log('MythX Response Body:\n');
            console.log(util.inspect(data, { showHidden: false, depth: null }));
            console.log('-------------------');
        }

        for (const key in data) {
            console.log(key + ': ' + data[key]);
        }
    } catch (err) {
        spinner.fail('Failed to obtain API version');

        console.log(chalk.red(err));

        process.exit(1);
    }
};
