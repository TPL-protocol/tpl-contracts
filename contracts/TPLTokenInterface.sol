pragma solidity ^0.4.25;

interface TPLTokenInterface {
  // in order to transfer tokens, the receiver must be valid
  function canTransfer(address to, uint256 value) external view returns (bool);

  // in order to transfer tokens via transferFrom, the receiver must be valid
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool);

  // external interface for finding address of the registry used by the token
  function getRegistry() external view returns (address);
}
