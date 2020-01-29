const chalk = require('chalk');
const ora = require('ora');
const client = require('../client');

module.exports = async (env, args) => {
    let { username, password, apiUrl, apiKey } = env;

    let uuid = args._[1];

    const spinner = ora({
        color: 'yellow',
        spinner: 'bouncingBar'
    });
    if (uuid) {
        try {
            spinner.start('Authenticating user');

            const mxClient = client.initialize(apiUrl, username, password, apiKey);

            if (!apiKey) {
                await client.authenticate(mxClient);
            }

            spinner.stop();
            console.log(chalk.green('✔ Authentication successful'));

            spinner.start('Retrieving Status Analysis');

            const status = await client.getAnalysisStatus(mxClient, uuid);

            console.log(chalk.green('\n✔ Analysis status retrieved'));
            console.log('--------------------------------------------');
            console.log(`API Version:		${status.apiVersion}`);
            console.log(`UUID:			    ${status.uuid}`);
            console.log(`Status:			${status.status}`);
            console.log(`API Version:		${status.apiVersion}`);
            console.log(`Submitted by:		${status.submittedBy}`);
            console.log(`Submitted at:		${status.submittedAt}`);
            console.log('---------------------------------------------');

            spinner.stop();
        } catch (err) {
            if (spinner.isSpinning) {
                spinner.fail();
            }

            console.log(chalk.red(err));

            process.exit(1);
        }
    } else {
        console.log(chalk.red('No UUID was provided'));
    }
};
