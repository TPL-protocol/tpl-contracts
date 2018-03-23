pragma solidity ^0.4.19;

import "../Registry.sol";
import "./OperatorChecker.sol";

contract ValueChecker is OperatorChecker {

  Registry registry;

  function ValueChecker(Registry _registry) 
    OperatorChecker(_registry)
    public {
  }

  function transferAllowed(address _from, address _to, uint256 _value) public view returns (bool) {
    super.transferAllowed(_from, _to, _value);
    require(_value <= registry.getAttribute(_from, ERC20_SEND_AMOUNT));
    require(_value <= registry.getAttribute(_to, ERC20_RECEIVE_AMOUNT));
  }

}