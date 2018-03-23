pragma solidity ^0.4.19;

import "../Registry.sol";
import "./TransactionChecker.sol";

contract OperatorChecker is TransactionChecker {

  Registry registry;

  function OperatorChecker(Registry _registry) 
    TransactionChecker(_registry)
    public {
  }

  function transferAllowed(address _from, address _to, uint256 _value) public view returns (bool) {
    require(registry.hasAttribute(_from, ERC20_OPERATOR));
    require(registry.hasAttribute(_to, ERC20_OPERATOR));
  }

}