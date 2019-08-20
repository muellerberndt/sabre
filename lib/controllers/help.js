const helpText = `Minimum viable CLI for the MythX security analysis platform.

USAGE:

$ sabre [options] <solidity_file> [contract_name]

OPTIONS:
    --version                                       Print version
    --help                                          Print help message
    --apiVersion                                    Print MythX API version
    --mode <quick/full>                             Analysis mode (default=quick)
    --format <text/stylish/compact/table/html/json> Output format (default=text)
    --clientToolName <string>                       Override clientToolName
    --noCacheLookup                                 Deactivate MythX cache lookups
    --debug                                         Print MythX API request and response
`;

module.exports = async () => {
    console.log(helpText);
};
