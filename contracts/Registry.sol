pragma solidity ^0.4.19;

interface Registry {

  function hasAttribute(address who, string attribute) public view returns (bool);
  function getAttribute(address who, string attribute) public view returns (uint256);

}