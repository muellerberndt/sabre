const helpText = `Minimum viable CLI for the MythX security analysis platform.

USAGE:

$ sabre

COMMANDS:
	analyze	[options] <solidity_file> [contract_name]			Generically test for ~50 security bugs
	check [options] <solidity_file> [contract_name]				Check for assertion violations and print counter-examples
	list									Get a list of submitted analyses.
	status <UUID>								Get the status of an already submitted analysis
	version									Print version
	help									Print help message
	apiVersion								Print MythX API version

	
OPTIONS:
	--mode <quick/standard/deep>						Analysis mode (default=quick)
	--format <text/stylish/compact/table/html/json> 			Output format (default=text)
	--clientToolName <string>                       			Override clientToolName
	--noCacheLookup                                 			Deactivate MythX cache lookups
	--debug                                         			Print MythX API request and response
`;

module.exports = async () => {
    console.log(helpText);
};
