const header = '==== Exception State ====';
const separator = '-'.repeat(header.length);
const indent = ' '.repeat(4);

const roles = {
    creator: 'CREATOR',
    attacker: 'ATTACKER',
    other: 'USER'
};

const textFormatter = {};

textFormatter.strToInt = str => parseInt(str, 10);

textFormatter.guessAccountRoleByAddress = (address) => {
    switch (address.toLowerCase().substr(0, 10)) {
        case '0xaffeaffe':
            return roles.creator;

        case '0xdeadbeef':
            return roles.attacker;
    }

    return roles.other;
};

textFormatter.stringifyValue = (value) => {
    const type = typeof value;

    if (type === 'number') {
        return String(value);
    } else if (type === 'string') {
        return value;
    } else if (value == null) {
        return 'null'
    }

    return JSON.stringify(value);
}

textFormatter.formatTestCaseInitialState = (initialState) => {
    const output = [];
    const keys = [ 'nonce', 'balance', 'storage' ];

    for (const address in initialState.accounts) {
        const data = initialState.accounts[address];
        const type = textFormatter.guessAccountRoleByAddress(address);

        output.push(`Account for ${type} at [ ${address} ]:`);

        for (const key of keys) {
            const value = textFormatter.stringifyValue(data[key]);

            output.push(indent + key + ': ' + value);
        }

        output.push('');
    }

    return output.join('\n').trimRight();
};

textFormatter.formatTestCaseSteps = (steps) => {
    const output = [];

    for (let s = 0; s < steps.length; s++) {
        const step = steps[s];
        const type = textFormatter.guessAccountRoleByAddress(step.origin);

        output.push(
            `Tx #${s}:`,
            indent + `Origin: ${step.origin} (${type})`
        );

        if (step.address === '') {
            output.push(
                indent + 'Data: [CONTRACT CREATION]',
                indent + 'Value: ' + textFormatter.stringifyValue(step.value),
            );
        } else {
            output.push(
                indent + 'Data: ' + textFormatter.stringifyValue(step.input),
                indent + 'Value: ' + textFormatter.stringifyValue(step.value),
            );
        }

        output.push('');
    }

    return output.join('\n').trimRight();
};

textFormatter.formatTestCase = (testCase) => {
    const output = [];

    if (testCase.initialState) {
        output.push(
            'Initial State:',
            '',
            textFormatter.formatTestCaseInitialState(testCase.initialState)
        );
    }

    if (testCase.steps) {
        if (testCase.initialState) {
            output.push('');
        }

        output.push(
            'Transaction Sequence:',
            '',
            textFormatter.formatTestCaseSteps(testCase.steps)
        );
    }

    return output.join('\n');
};

textFormatter.getCodeSample = (source, src) => {
    const [start, length] = src.split(':').map(textFormatter.strToInt);

    return source.substr(start, length);
}

textFormatter.formatLocation = message => {
    const start = message.line + ':' + message.column;
    const finish = message.endLine + ':' + message.endCol;

    return 'from ' + start + ' to ' + finish;
}

textFormatter.formatMessage = (message, filePath) => {
    const mythxIssue = message.mythx;
    const source = message.source;
    const output = [header];

    output.push(
        'Severity: ' + mythxIssue.severity,
        'File: ' + filePath
    );

    if (message.ruleId !== 'N/A') {
        output.push('Link: ' + message.ruleId);
    }

    output.push(
        separator,
        mythxIssue.description.head,
        mythxIssue.description.tail
    );

    let code = null;

    if (mythxIssue.locations.length) {
        const src = mythxIssue.locations[0].sourceMap.split(';')[0];

        if (src) {
            code = textFormatter.getCodeSample(source, src);
        }
    }

    output.push(
        separator,
        'Location: ' + textFormatter.formatLocation(message),
        '',
        code == null ? '<code not available>' : code
    );

    const testCases = mythxIssue.extra && mythxIssue.extra.testCases;

    if (testCases) {
        for (const testCase of testCases) {
            output.push(
                separator,
                textFormatter.formatTestCase(testCase)
            );
        }
    }

    return output.join('\n');
};

textFormatter.formatResult = result => {
    return result.messages
        .map(message => textFormatter.formatMessage(message, result.filePath))
        .join('\n\n');
};

textFormatter.run = results => {
    return results
        .map(result => textFormatter.formatResult(result))
        .join('\n\n');
};

module.exports = results => textFormatter.run(results);
