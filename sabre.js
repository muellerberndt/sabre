#!/usr/bin/env node

const env = {
    ethAddress: process.env.MYTHX_ETH_ADDRESS,
    password: process.env.MYTHX_PASSWORD,
    apiUrl: process.env.MYTHX_API_URL
};

const args = require('minimist')(process.argv.slice(2), {
    boolean: [ 'version', 'apiVersion', 'help', 'noCacheLookup', 'debug' ],
    string: [ 'mode', 'format' ],
    default: { mode: 'quick', format: 'text' },
});

let controller;

if (args.version) {
    controller = require('./lib/controllers/version');
} else if (args.apiVersion) {
    controller = require('./lib/controllers/api_version');
} else if (args.help || !args._.length) {
    controller = require('./lib/controllers/help');
} else {
    controller = require('./lib/controllers/analyze');
}

controller(env, args);
