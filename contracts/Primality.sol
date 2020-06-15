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
