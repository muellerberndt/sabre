const chalk = require('chalk');
const ora = require('ora');
const client = require('../client');

module.exports = async (env) => {
    let { username, password, apiUrl, apiKey } = env;

    const spinner = ora({
        color: 'yellow',
        spinner: 'bouncingBar'
    });

    try {
        spinner.start('Authenticating user');

        const mxClient = client.initialize(apiUrl, username, password, apiKey);

        if (!apiKey) {
            await client.authenticate(mxClient);
        }

        spinner.stop();
        console.log(chalk.green('✔ Authentication successful'));

        spinner.start('Retrieving submitted analyses');

        let list = await client.getAnalysesList(mxClient);

        console.log(chalk.green('\n✔ Analyses retrieved'));

        list.analyses.forEach(analysis => {
            console.log('--------------------------------------------');
            console.log(`API Version:		${analysis.apiVersion}`);
            console.log(`UUID:                   ${analysis.uuid}`);
            console.log(`Status:			${analysis.status}`);
            console.log(`API Version:		${analysis.apiVersion}`);
            console.log(`Submitted by:		${analysis.submittedBy}`);
            console.log(`Submitted at:		${analysis.submittedAt}`);
            console.log(`Report URL:             https://dashboard.mythx.io/#/console/analyses/${analysis.uuid}`);
            console.log('---------------------------------------------');
        });

        spinner.stop();
    } catch (err) {
        if (spinner.isSpinning) {
            spinner.fail();
        }

        console.log(chalk.red(err));

        process.exit(1);
    }
};
