const chalk = require('chalk');
const ora = require('ora');
const client = require('../client');

module.exports = async (env, args) => {
    let { ethAddress, password, apiUrl } = env;

    let uuid = args._[1];

    const spinner = ora({
        color: 'yellow',
        spinner: 'bouncingBar'
    });
    if (uuid) {
        try {
            spinner.start('Authenticating user');

            const mxClient = client.initialize(apiUrl, ethAddress, password);

            await client.authenticate(mxClient);

            spinner.stop();
            console.log(chalk.green('✔ Authentication successful'));

            spinner.start('Retrieving Report');

            const issues = await client.getReport(mxClient, uuid);
						
			
            console.log(chalk.green('\n✔ Report retrieved'));
			

            issues.forEach(issue => {
                issue.issues.forEach((obj) => {
                    let location = obj.locations.filter(location => location.sourceType === 'solidity-file');
                    console.log(`==== ${obj.swcTitle} ====`);
                    console.log(`Severity:	${obj.severity}`);
                    console.log(`File:		${location[0].sourceList[0]}`);
                    console.log(`Link:		https://smartcontractsecurity.github.io/SWC-registry/docs/${obj.swcID ? obj.swcID : 'N/A'}`);
                    console.log('--------------------');
                    console.log(`${obj.description.head}`);
                    console.log(`${obj.description.tail}`);
                    console.log('--------------------\n');
                });
            });

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
