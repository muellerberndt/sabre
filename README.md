# Sabre
[![Discord](https://img.shields.io/discord/481002907366588416.svg)](https://discord.gg/E3YrVtG)

Sabre is a security analysis tool for smart contracts written in Solidity. It uses the [MythX symbolic execution & fuzzing service](https://mythx.io) to:

- Generically detect [a wide range of security issues](https://mythx.io/swc-coverage);
- Check for assertion violations and produce counter-examples.

**Warning: This is my own MythX client hobby implementation. Please use the official [MythX command line client](https://github.com/dmuhs/mythx-cli) in production environments .**

## Usage

### Installation

```
$ npm install -g sabre-mythx
```

### Setting up an Account

Sign up for an on the [MythX website](https://mythx.io) to generate an API key. Set the `MYTHX_API_KEY` enviroment variable by adding the following to your `.bashrc` or `.bash_profile`):

```
export MYTHX_API_KEY=eyJhbGciOiJI(...)
```

### Generic bug detection

Run `sabre analyze <solidity-file> [contract-name]` to submit a smart contract for analysis. The default mode is "quick" analysis which returns results after approximately 2 minutes. You'll also get a dashboard link where you can monitor the progress and view the report later.

### Custom property checking

#### Example 1: Primality test

You're pretty sure that 973013 is a prime number. It ends with a "3" so why wouldn't it be??


```
pragma solidity ^0.5.0;

contract Primality {
    
    uint256 public largePrime = 973013;
    
    uint256 x;
    uint256 y;
    
    function setX(uint256 _x) external {
        x = _x;
    }
 
    function setY(uint256 _y) external {
        y = _y;
    }
    
    function verifyPrime() external view {
        require(x > 1 && x < largePrime);
        require(y > 1 && y < largePrime);
        assert(x*y != largePrime);
    }
}
```

Surely the assertion in `verifyPrime()` will hold for all possible inputs?


```
$ solfuzz check primality.sol
--------------------
ASSERTION VIOLATION!
/Users/bernhardmueller/Desktop/primality.sol: from 21:8 to 21:33

assert(x*y != largePrime)
--------------------
Call sequence:

    1: setY(1021)
    Sender: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa [ USER ]
    Value: 0

    2: setX(953)
    Sender: 0xaffeaffeaffeaffeaffeaffeaffeaffeaffeaffe [ CREATOR ]
    Value: 0

    3: verifyPrimeness()
    Sender: 0xaffeaffeaffeaffeaffeaffeaffeaffeaffeaffe [ CREATOR ]
    Value: 0

```

Oh no! 1021 x 953 = 973013, better pick a different number 🙄

#### Example 2: Integer precision bug

Source: [Sigma Prime](https://blog.sigmaprime.io/solidity-security.html#precision-vuln)

Here is a simple contract for buying and selling tokens. What could possibly go wrong?

```
pragma solidity ^0.5.0;

contract FunWithNumbers {
    uint constant public tokensPerEth = 10;
    uint constant public weiPerEth = 1e18;
    mapping(address => uint) public balances;

    function buyTokens() public payable {
        uint tokens = msg.value/weiPerEth*tokensPerEth; // convert wei to eth, then multiply by token rate
        balances[msg.sender] += tokens;
    }

    function sellTokens(uint tokens) public {
        require(balances[msg.sender] >= tokens);
        uint eth = tokens/tokensPerEth;
        balances[msg.sender] -= tokens;
        msg.sender.transfer(eth*weiPerEth); 
    }
}
```

Better safe than sorry! Let's check some [contract invariants](https://gist.github.com/b-mueller/0916c3700c94e94b23dfa9aa650005e8) just to be 1,700% sure that everything works as expected.

```
$ solfuzz check funwithnumbers.sol 
--------------------
ASSERTION VIOLATION!
/Users/bernhardmueller/Desktop/funwithnumbers.sol: from 47:17 to 47:131

AssertionFailed("Invariant violation: Sender token balance must increase when contract account balance increases")
--------------------
Call sequence:

    1: buyTokens()
    Sender: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3 [ USER ]
    Value: 6

--------------------
ASSERTION VIOLATION!
/Users/bernhardmueller/Desktop/funwithnumbers.sol: from 56:17 to 56:131

AssertionFailed("Invariant violation: Contract account balance must decrease when sender token balance decreases")
--------------------
Call sequence:

    1: buyTokens()
    Sender: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0 [ USER ]
    Value: 1000000000000000000

    2: sellTokens(6)
    Sender: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0 [ USER ]
    Value: 0
```

Um what?? Fractional numbers are rounded down 😲

#### Example 3: Arbitrary storage write

Source: [Ethernaut](https://ethernaut.openzeppelin.com/level/0xe83cf387ddfd13a2db5493d014ba5b328589fb5f) (I made this [a bit more complex](https://gist.github.com/b-mueller/44a995aaf764051963802a061665b446))

This [smart contract](https://gist.github.com/b-mueller/44a995aaf764051963802a061665b446) has, and will always have, only one owner. There isn't even a `transferOwnership` function. But... can you be really sure? Don't you at least want to double-check with a high-level, catch-all invariant?

```
contract VerifyRegistrar is Registrar {
    
    modifier checkInvariants {
        address old_owner = owner;
        _;
        assert(owner == old_owner);
    }
    
    function register(bytes32 _name, address _mappedAddress) checkInvariants public {
        super.register(_name, _mappedAddress);
    }
}
```

Let's check just to be 15,000% sure.


```
$ solfuzz check registrar.sol 
✔ Loaded solc v0.4.25 from local cache
✔ Compiled with solc v0.4.25 successfully
✔ Analysis job submitted: https://dashboard.mythx.io/#/console/analyses/e98a345e-7418-4209-ab99-bffdc2535d9b
--------------------
ASSERTION VIOLATION!
/Users/bernhardmueller/Desktop/registrar.sol: from 40:8 to 40:34

assert(owner == old_owner)
--------------------
Call sequence:

    1: register(b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00', 0x0000000000000000000000000000000000000000)
    Sender: 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa [ USER ]
    Value: 0
```

Ooops... better initialize those structs before using them.

#### Example 4: Pausable token

Source: [TrailofBits](https://github.com/crytic/building-secure-contracts/tree/master/program-analysis/echidna/exercises/exercise1)
 
Smart contracts get hacked all the time so it's always great to have a pause button, even if it's just a [simple token
](https://github.com/crytic/building-secure-contracts/tree/master/program-analysis/echidna/exercises/exercise1). This is even an off-switch if we pause the token and throw away the admin account? Or is it?

Why not create an instance of the contract that's infinitely paused and check if there's any way to unpause it.

```
contract VerifyToken is Token {

    event AssertionFailed(string message);

    constructor() public {
        paused();
        owner = address(0x0); // lose ownership
    }
     
     function transfer(address to, uint value) public {
        uint256 old_balance = balances[msg.sender];

        super.transfer(to, value);

        if (balances[msg.sender] != old_balance) {
            emit AssertionFailed("Tokens transferred even though this contract instance was infinitely paused!!");
        }
     }
}
```

Given that this contract is forever paused, it should never be possible to transfer any tokens right?


```
$ solfuzz check token.sol 
✔ Loaded solc v0.5.16 from local cache
✔ Compiled with solc v0.5.16 successfully
✔ Analysis job submitted: https://dashboard.mythx.io/#/console/analyses/8d4b0eb0-69d3-4d82-b6c6-bc90332a292c
--------------------
ASSERTION VIOLATION!
/Users/bernhardmueller/Desktop/token.sol: from 64:17 to 64:113

AssertionFailed("Tokens transferred even though this contract instance was infinitely paused!!")
--------------------
Call sequence:

    1: Owner()
    Sender: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef [ ATTACKER ]
    Value: 0

    2: resume()
    Sender: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef [ ATTACKER ]
    Value: 0

    3: transfer(0x0008000002400240000200104000104080001000, 614153205830163099331592192)
    Sender: 0xaffeaffeaffeaffeaffeaffeaffeaffeaffeaffe [ CREATOR ]
    Value: 0
```

Oh no 😵 Looks like somebody slipped up there when naming the constructor.

### Analysis mode

```
--mode <quick/standard/deep>
```

MythX integrates various analysis methods including static analysis, input fuzzing and symbolic execution. In the backend, each incoming analysis job is distributed to a number of workers that perform various tasks in parallel. There are two analysis modes, "quick", "standard" and "deep", that differ in the amount of resources dedicated to the analysis.


### Report format

```
--format <text/stylish/compact/table/html/json>
```

Select the report format. By default, Sabre outputs a verbose text report. Other options `stylish`, `compact`, `table`, `html` and `json`. Note that you can also view reports for past analyses on the [dashboard](http://dashboard.mythx.io).


### Other commands

Besides `analyze` the following commands are available.

```
- list              Get a list of submitted analyses.
- status <UUID>     Get the status of an already submitted analysis
- version           Print Sabre Version
- apiVersion        Print MythX API version
```
