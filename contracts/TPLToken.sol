pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./checks/TransactionChecker.sol";

contract TPLToken is StandardToken {

  TransactionChecker validator;

  function TPLToken(TransactionChecker _validator) public {
    validator = _validator;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(validator.transferAllowed(msg.sender, _to, _value));
    super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(validator.transferAllowed(_from, _to, _value));
    super.transferFrom(_from, _to, _value);
  }

}