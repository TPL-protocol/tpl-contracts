pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./Registry.sol";
import "./Attributes.sol";

contract TPLERC20 is StandardToken, Attributes {

  Registry registry;

  function TPLERC20(Registry _registry) public {
    registry = _registry;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(msg.sender, _to, _value));
    super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(msg.sender, _to, _value));
    super.transferFrom(_from, _to, _value);
  }

  function transferAllowed(address _from, address _to, uint256 _value) public view returns (bool) {
    require(registry.hasAttribute(_from, ERC20_OPERATOR));
    require(registry.hasAttribute(_to, ERC20_OPERATOR));
    require(_value <= registry.getAttribute(_from, ERC20_SEND_AMOUNT));
    require(_value <= registry.getAttribute(_to, ERC20_RECEIVE_AMOUNT));
  }

}