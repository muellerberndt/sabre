
contract Tokensale {
    uint hardcap = 10000 ether;


    function fetchCap() public returns(uint) {
        return hardcap;
    }
}

contract Presale is Tokensale {
    uint hardcap = 1000 ether;

   
}
