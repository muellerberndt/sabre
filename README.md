# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

<p align="center">
	<img src="/static/sabre_v2.jpg" width="100%"/>
</p>

Sabre is a minimum viable [MythX](https://mythx.io) client. It compiles and analyzes a Solidity smart contract using the MythX cloud service.

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

This analysis should take about 60 to 90 seconds to finish.

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**Some links:**

- [MythX documentation](https://docs.mythx.io/en/latest/)
- [Awesome MythX Smart Contract Security](https://github.com/b-mueller/awesome-mythx-smart-contract-security)
- [The tech behind MythX smart contract security analysis](https://medium.com/consensys-diligence/the-tech-behind-mythx-smart-contract-security-analysis-32c849aedaef)
- [Detecting the top 4 critical Ethereum smart contract vulnerabilities with MythX](https://medium.com/consensys-diligence/detecting-the-top-4-critical-smart-contract-vulnerabilities-with-mythx-9c568d7db7a6?)
