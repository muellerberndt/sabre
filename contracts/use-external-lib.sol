pragma solidity ^0.5.7;

import "./external-lib.sol";

contract UseExternalLib {
  function useExternal(uint256 _n) public pure returns (uint256) {
    return External.increment(_n);
  }
}
