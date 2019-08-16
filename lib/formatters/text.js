const textFormatter = {};
const separator = '-'.repeat(20);

textFormatter.strToInt = str => parseInt(str, 10);

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
    const output = [];

    output.push(
        `==== ${mythxIssue.swcTitle} ====`,
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
