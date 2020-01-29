#!/usr/bin/env node

const env = {
    apiKey: process.env.MYTHX_API_KEY,
    username: process.env.MYTHX_USERNAME,
    password: process.env.MYTHX_PASSWORD,
    apiUrl: process.env.MYTHX_API_URL,
};

if (!env.username) {
    env.username = process.env.MYTHX_ETH_ADDRESS;  // for backwards compatibility
}

let { username, password, apiUrl, apiKey } = env;

if (!(username && password) && !apiKey) {
    console.log('Unauthenticated use of MythX has been discontinued. Sign up for a free a account at https://mythx.io/ and set the MYTHX_API_KEY environment variable.');

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
case 'apiVersion':
    controller = require('./lib/controllers/api_version');
    break;
default:
    controller = require('./lib/controllers/help');
    break;
}

controller(env, args);
