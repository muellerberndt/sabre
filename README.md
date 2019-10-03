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

### Setup Account

Use [Metamask](https://metamask.io) or a web3-enabled browser to sign up for a free account on the [MythX website](https://mythx.io)

### Access Token (Recommended)

Login to the dashboard of your account and generate `MythX API Key` in the `Profile` tab. Set up your environment using the `MYTHX_ACCESS_TOKEN` (for increased convenience add the token into your `.bashrc` or `.bash_profile`).

```
export MYTHX_ACCESS_TOKEN=abc123...
```

### API Credentials (Unsecure)

Set your API password for the created account. Set up your environment using the Ethereum address you signed up with as the username (for increased convenience add those two lines into your `.bashrc` or `.bash_profile`).

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
    --apiVersion                                    Print MythX API version
    --mode <quick/full>                             Analysis mode (default=quick)
    --format <text/stylish/compact/table/html/json> Output format (default=text)
    --clientToolName <string>                       Override clientToolName
    --noCacheLookup                                 Deactivate MythX cache lookups
    --debug                                         Print MythX API request and response
```

A 'quick' analysis takes 20 - 120 seconds to finish while a 'full' mode analysis takes approximately 30 minutes.

### Example

```
$ sabre contracts/vulnerable.sol 
✔ Loaded solc v0.5.10 from local cache
✔ Compiled with solc v0.5.10 successfully
✔ Analysis job with UUID 647cefa9-51e6-47b1-a293-bb17dd1b991a is now in progress
==== Unprotected SELFDESTRUCT Instruction ====
Severity: High
File: /Users/bernhardmueller/Projects/sabre/contracts/vulnerable.sol
Link: https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-106
--------------------
The contract can be killed by anyone.
Anyone can kill this contract and withdraw its balance to an arbitrary address.
--------------------
Location: from 7:8 to 7:32

selfdestruct(msg.sender)
--------------------
Transaction Sequence:

Tx #1:
    Origin: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef [ ATTACKER ]
    Function: f() [ 26121ff0 ]
    Data: 0x26121ff0
    Value: 0x0

==== Floating Pragma ====
Severity: Low
File: /Users/bernhardmueller/Projects/sabre/contracts/vulnerable.sol
Link: https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-103
--------------------
A floating pragma is set.
It is recommended to make a conscious choice on what version of Solidity is used for compilation. Currently multiple versions "^0.5.7" are allowed.
--------------------
Location: from 1:0 to 1:23

pragma solidity ^0.5.7;
```

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**Some links:**

- [MythX Documentation](https://docs.mythx.io/en/latest/)
- [Awesome MythX Tools](https://github.com/b-mueller/awesome-mythx-smart-contract-security)
- [The Tech Behind MythX Smart Contract Security Analysis](https://medium.com/consensys-diligence/the-tech-behind-mythx-smart-contract-security-analysis-32c849aedaef)
- [A Deep Dive into the MythX API](https://medium.com/@muellerberndt/a-deep-dive-into-the-mythx-smart-contract-security-analysis-api-3c2cd8e6a338)
- [Detecting the Top 4 Critical Smart Contract Vulnerabilities With MythX](https://medium.com/consensys-diligence/detecting-the-top-4-critical-smart-contract-vulnerabilities-with-mythx-9c568d7db7a6?)
