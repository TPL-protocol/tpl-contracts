pragma solidity ^0.4.25;

interface TPLTokenInterface {
  // getter function for finding the address of the registry used by the token
  function getRegistryAddress() external view returns (address);

  // in order to transfer tokens, the receiver must be valid
  function canTransfer(address _to, uint256 _value) external view returns (bool);

  // in order to transfer tokens via transferFrom, the receiver must be valid
  function canTransferFrom(
    address _from,
    address _to,
    uint256 _value
  ) external view returns (bool);
}
