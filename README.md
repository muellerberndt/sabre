# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

<p align="center">
	<img src="/static/sabre_v2.jpg" width="100%"/>
</p>

Sabre is a security analysis tool for smart contracts written in Solidity. It uses the [MythX cloud service](https://mythx.io).

## Usage

### Installation

```
$ npm install -g sabre-mythx
```

### Setting up an Account

Use [Metamask](https://metamask.io) or a web3-enabled browser to sign up for a free account on the [MythX website](https://mythx.io). Set up your environment using the Ethereum address you signed up with as the username (for increased convenience add those two lines into your `.bashrc` or `.bash_profile`).

```
export MYTHX_ETH_ADDRESS=0x(...)
export MYTHX_PASSWORD=password
```

### Analyzing a Solidity File

Run `sabre analyze <solidity-file> [contract-name]` to submit a smart contract for analysis. The default mode is "quick" analysis which returns results after approximately 2 minutes. You'll also get a dashboard link where you can monitor the progress and view the report later.

#### Analysis options

```
--mode <quick/full>
```

MythX integrates various analysis types including static analysis, input fuzzing and symbolic execution. In the backend, each incoming analysis job is distributed to a number of workers that perform various tasks in parallel. Currently, there are two analysis modes that differ in the amount of resources dedicated to the analysis.

```
--format <text/stylish/compact/table/html/json>
```

Select the report format. By default, Sabre outputs a verbose text report. Other options `stylish`, `compact`, `table`, `html` and `json`. Note that you can also view reports for past analyses on the [dashboard](http://dashboard.mythx.io).

```
--clientToolName <string>
```

You can [integrate Sabre into your own MythX tool](https://docs.mythx.io/en/latest/building-security-tools/) and become eligible for a share of API revenues. In that case, you'll want to use the `--clientToolName` argument to override the tool id which is used by the API to identify your tool. 

```
--debug
```

Dump the API request and reponse when submitting an analysis.

### Other commands

Besides `analyze` the following commands are available.

```
- list              Get a list of submitted analyses.
- status <UUID>     Get the status of an already submitted analysis
- version           Print Sabre Version
- apiVersion:       Print MythX API version
```

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**Some links:**

- [MythX Documentation](https://docs.mythx.io/en/latest/)
- [Awesome MythX Tools](https://github.com/b-mueller/awesome-mythx-smart-contract-security)
- [The Tech Behind MythX Smart Contract Security Analysis](https://medium.com/consensys-diligence/the-tech-behind-mythx-smart-contract-security-analysis-32c849aedaef)
- [A Deep Dive into the MythX API](https://medium.com/@muellerberndt/a-deep-dive-into-the-mythx-smart-contract-security-analysis-api-3c2cd8e6a338)
- [Detecting the Top 4 Critical Smart Contract Vulnerabilities With MythX](https://medium.com/consensys-diligence/detecting-the-top-4-critical-smart-contract-vulnerabilities-with-mythx-9c568d7db7a6?)
