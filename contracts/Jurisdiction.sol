pragma solidity ^0.4.19;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Registry.sol";

contract Jurisdiction is Ownable, Registry {

  event ValidatorAdded(address validator);
  event ValidatorRemoved(address validator);

  mapping(address => mapping(string => uint256)) attributes;

  mapping(address => bool) validators;

  modifier onlyValidator() {
    require(isValidator(msg.sender));
    _;
  }

  function addValidator(address validator) public onlyOwner {
    validators[validator] = true;
    ValidatorAdded(validator);
  }

  function removeValidator(address validator) public onlyOwner {
    validators[validator] = false;
    ValidatorRemoved(validator);
  }

  function isValidator(address who) public view returns (bool) {
    return validators[who];
  }

  function addAttribute(address who, string attribute, uint256 value) public onlyValidator {
    attributes[who][attribute] = value;
  }

  function hasAttribute(address who, string attribute) public view returns (bool)  {
    return attributes[who][attribute] != 0;
  }

  function getAttribute(address who, string attribute) public view returns (uint256) {
    return attributes[who][attribute];
  }
}
