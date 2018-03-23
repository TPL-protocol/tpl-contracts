pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./Registry.sol";
import "./Attributes.sol";

contract ERC20Validator is Attributes {

  Registry registry;

  function ERC20Validator(Registry _registry) public {
    registry = _registry;
  }

  function transferAllowed(address _from, address _to, uint256 _value) public view returns (bool) {
    require(registry.hasAttribute(_from, ERC20_OPERATOR));
    require(registry.hasAttribute(_to, ERC20_OPERATOR));
    require(_value <= registry.getAttribute(_from, ERC20_SEND_AMOUNT));
    require(_value <= registry.getAttribute(_to, ERC20_RECEIVE_AMOUNT));
  }

}