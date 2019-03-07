# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

<p align="center">
	<img src="/static/sabre_v2.jpg" width="100%"/>
</p>

Minimum viable [MythX](https://mythx.io) client. Compiles a Solidity smart contract and sends it to MythX API for security analysis. Analysis steps performed:

- Static code analysis and linting (Maru)
- Multi-tx input fuzzing (Harvey)
- Multi-tx symbolic analysis (Mythril)

**Feel free to fork and reuse this code to build awesome tools.**

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

### Running an Analysis

```
$ sabre sample/token.sol
```

This submits t usually takes about 60 to 90 seconds to finish.

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**Some links:**

- [MythX documentation](https://docs.mythx.io/en/latest/)
- [Armlet client library](https://github.com/ConsenSys/armlet)
- [Awesome MythX Smart Contract Security](https://github.com/b-mueller/awesome-mythx-smart-contract-security)
