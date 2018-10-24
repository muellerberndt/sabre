# Sabre

A quick-and-dirty CLI for [Mythril Platform](https://mythril.ai).

## Usage

```
$ node sabre.js mycontract.sol 
[ { address: 141,
    contract: 'MAIN',
    debug: '',
    description:
     'Function fallback retrieves the transaction origin (tx.origin) using the ORIGIN opcode. Use msg.sender instead.\nSee also: https://solidity.readthedocs.io/en/develop/security-considerations.html#tx-origin',
    function: 'fallback',
    title: 'Use of tx.origin',
    type: 'Warning',
    tool: 'mythril' },
  { 'swc-id': 'SWC-100',
    filename: 'hello.sol',
    lineNumberStart: 5,
    lineNumberEnd: 7,
    contractName: 'Hello',
    'swc-link':
     'https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-100',
    'swc-title': 'Function Default Visibility',
    'swc-relationships':
     '[CWE-710: Improper Adherence to Coding Standards](https://cwe.mitre.org/data/definitions/710.html)',
    'swc-description':
     'Functions that do not have a function visibility type specified are `public` by default. This can lead to a vulnerability if a developer forgot to set the visibility and a malicious user is able to make unauthorized or unintended state changes.',
    'swc-remediation':
     'Functions can be specified as being `external`, `public`, `internal` or `private`. It is recommended to make a conscious decision on which visibility type is appropriate for a function. This can dramatically reduce the attack surface of a contract system.',
    severity: 'Critical',
    tool: 'maru' },
  { 'swc-id': 'SWC-108',
    filename: 'hello.sol',
    lineNumberStart: 3,
    lineNumberEnd: 3,
    contractName: 'Hello',
    'swc-link':
     'https://smartcontractsecurity.github.io/SWC-registry/docs/SWC-108',
    'swc-title': 'State Variable Default Visibility',
    'swc-relationships':
     '[CWE-710: Improper Adherence to Coding Standards](https://cwe.mitre.org/data/definitions/710.html)',
    'swc-description':
     'Labeling the visibility explicitly makes it easier to catch incorrect assumptions about who can access the variable.',
    'swc-remediation':
     'Variables can be specified as being `public`, `internal` or `private`. Explicitly define visibility for all state variables.',
    severity: 'Critical',
    tool: 'maru' } ]
```
