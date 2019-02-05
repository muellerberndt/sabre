# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

Minimum viable [MythX](https://mythx.io) client. Compiles a Solidity smart contract and sends it to MythX API for security analysis. Analysis performed:

- Static code analysis and linting (Maru)
- Multi-TX input fuzzing (Harvey)
- Multi-TX symbolic analysis (Mythril)

## Usage

### Installation

```
$ git clone https://github.com/b-mueller/sabre/
$ cd sabre
$ npm install && npm link
```

### Getting API Credentials

2. Use Metamask to sign up for a free account on the [MythX website](https://mythx.io) and set your API password. Set up your environment using the Ethereum address you signed up with as the username (for increased convenience add those two lines into your `.bashrc` or `.bash_profile`).

```
export MYTHX_ETH_ADDRESS=0x(...)
export MYTHX_PASSWORD=password
```

### Running an Analysis:

```
$ sabre sample/token.sol
```

Note that Sabre doesn't deal with Soldity files that define multiple contracts. If `solc-js` returns more than one contract it will simply submit the first one in the list.

## Writing your own MythX Tools

MythX tool builders will earn revenue share in Dai when we go live with paid subscription plans. Details will be released soon. Ping us on [Discord](https://discord.gg/TtYVpCT) if you'd like to get involved.

**See also:**

- [Armlet client library](https://github.com/ConsenSys/armlet)
- [MythX documentation](https://docs.mythx.io/en/latest/)
