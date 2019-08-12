# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

<p align="center">
	<img src="/static/sabre_v2.jpg" width="100%"/>
</p>

Sabre is a experimental [MythX](https://mythx.io) client. It analyzes a Solidity smart contracts using the MythX cloud service.

## Usage

### Installation

```
$ npm install -g sabre-mythx
```

### API Credentials

Use [Metamask](https://metamask.io) or a web3-enabled browser to sign up for a free account on the [MythX website](https://mythx.io) and set your API password. Set up your environment using the Ethereum address you signed up with as the username (for increased convenience add those two lines into your `.bashrc` or `.bash_profile`).

```
export MYTHX_ETH_ADDRESS=0x(...)
export MYTHX_PASSWORD=password
```

### Usage

```
$ sabre [options] <solidity_file> [contract_name]

OPTIONS:
    --version                                       Print version
    --help                                          Print help message
    --mode <quick/full>                             Analysis mode (default=quick)
    --format <text/stylish/compact/table/html/json> Output format (default=text)
    --clientToolName <string>                       Override clientToolName
    --noCacheLookup                                 Deactivate MythX cache lookups
    --debug                                         Print MythX API request and response
```

A 'quick' analysis takes 20 - 120 seconds to finish while a 'full' analysis takes approximately 30 minutes.

### Example
```
$ sabre contracts/token.sol
  ✔ Compiled with solc v0.5.7 successfully
  
  token.sol
    13:4  error  The binary subtraction can underflow  https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-101
    14:4  error  The binary addition can overflow      https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-101
  
  ✖ 2 problems (2 errors, 0 warnings)
```

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**Some links:**

- [MythX Documentation](https://docs.mythx.io/en/latest/)
- [Awesome MythX Tools](https://github.com/b-mueller/awesome-mythx-smart-contract-security)
- [The Tech Behind MythX Smart Contract Security Analysis](https://medium.com/consensys-diligence/the-tech-behind-mythx-smart-contract-security-analysis-32c849aedaef)
- [A Deep Dive into the MythX API](https://medium.com/@muellerberndt/a-deep-dive-into-the-mythx-smart-contract-security-analysis-api-3c2cd8e6a338)
- [Detecting the Top 4 Critical Smart Contract Vulnerabilities With MythX](https://medium.com/consensys-diligence/detecting-the-top-4-critical-smart-contract-vulnerabilities-with-mythx-9c568d7db7a6?)
