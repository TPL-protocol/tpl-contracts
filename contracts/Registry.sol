pragma solidity ^0.4.24;

interface Registry {

  function hasAttribute(address _who, uint256 _attribute) external view returns (bool);
  function getAttribute(address _who, uint256 _attribute) external view returns (uint256);
  function getAvailableAttributes() external view returns (uint256[]);

}