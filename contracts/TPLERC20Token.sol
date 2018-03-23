pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./Registry.sol";
import "./ERC20Validator.sol";

contract TPLERC20Token is ERC20Validator, StandardToken {

  function TPLERC20Token(Registry _registry) 
    ERC20Validator(_registry)
    public {
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(msg.sender, _to, _value));
    super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(msg.sender, _to, _value));
    super.transferFrom(_from, _to, _value);
  }

}