pragma solidity ^0.4.19;

import "../Registry.sol";
import "../Attributes.sol";

contract TransactionChecker is Attributes {

  Registry registry;

  function TransactionChecker(Registry _registry) public {
    registry = _registry;
  }

  function transferAllowed(address _from, address _to, uint256 _value) public view returns (bool);
}