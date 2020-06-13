# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

Sabre is a security analysis tool for smart contracts written in Solidity. It uses the [MythX cloud service](https://mythx.io) which detects [a wide range of security issues](https://mythx.io/swc-coverage).

**Warning: This client is not officially supported by MythX and may not return optimal results. Please use the [MythX command line client](https://github.com/dmuhs/mythx-cli) in production environments .**

## Usage

### Installation

```
$ npm install -g sabre-mythx
```

### Setting up an Account

Sign up for a free account on the [MythX website](https://mythx.io) to generate an API key. Set the `MYTHX_API_KEY` enviroment variable by adding the following to your `.bashrc` or `.bash_profile`):

```
export MYTHX_API_KEY=eyJhbGciOiJI(...)
```

### Analyzing a Solidity File

Run `sabre analyze <solidity-file> [contract-name]` to submit a smart contract for analysis. The default mode is "quick" analysis which returns results after approximately 2 minutes. You'll also get a dashboard link where you can monitor the progress and view the report later.

#### Analysis mode

```
--mode <quick/standard/deep>
```

MythX integrates various analysis methods including static analysis, input fuzzing and symbolic execution. In the backend, each incoming analysis job is distributed to a number of workers that perform various tasks in parallel. There are two analysis modes, "quick", "standard" and "deep", that differ in the amount of resources dedicated to the analysis.


#### Report format

```
--format <text/stylish/compact/table/html/json>
```

Select the report format. By default, Sabre outputs a verbose text report. Other options `stylish`, `compact`, `table`, `html` and `json`. Note that you can also view reports for past analyses on the [dashboard](http://dashboard.mythx.io).

#### Client tool name

```
--clientToolName <string>
```

You can [integrate Sabre into your own MythX tool](https://docs.mythx.io/en/latest/building-security-tools/) and become eligible for a share of API revenues. In that case, you'll want to use the `--clientToolName` argument to override the tool id which is used by the API to identify your tool. 

```
--debug
```

Dump the API request and response when submitting an analysis.

### Other commands

Besides `analyze` the following commands are available.

```
- list              Get a list of submitted analyses.
- status <UUID>     Get the status of an already submitted analysis
- version           Print Sabre Version
- apiVersion        Print MythX API version
```
