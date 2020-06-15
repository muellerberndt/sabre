#!/usr/bin/env node

const env = {
    apiKey: process.env.MYTHX_API_KEY,
    apiUrl: process.env.MYTHX_API_URL
};

let { apiKey } = env;

if (!apiKey) {
    console.log('Unauthenticated use of MythX has been discontinued. Sign up for a account at https://mythx.io/ and set the MYTHX_API_KEY environment variable.');

    process.exit(-1);
}

const args = require('minimist')(process.argv.slice(2), {
    boolean: [ 'help', 'noCacheLookup', 'debug' ],
    string: [ 'mode', 'format' ],
    default: { mode: 'quick', format: 'text' },
});

let command = args._[0];

let controller;

switch (command) {
case 'version':
    controller = require('./lib/controllers/version');
    break;
case 'status':
    controller = require('./lib/controllers/status');
    break;
case 'list':
    controller = require('./lib/controllers/list');
    break;
case 'analyze':
    controller = require('./lib/controllers/analyze');
    break;
case 'check':
    controller = require('./lib/controllers/analyze');
    args.isCheckProperty = true;
    break;
case 'apiVersion':
    controller = require('./lib/controllers/api_version');
    break;
default:
    controller = require('./lib/controllers/help');
    break;
}

controller(env, args);
