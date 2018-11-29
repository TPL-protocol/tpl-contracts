pragma solidity ^0.4.25;


/**
 * @title TPL ERC20 Permissioned interface. EIP-165 ID: 0x7d92a55e
 */
interface TPLERC20PermissionedInterface {
  /**
   * @notice Check if an account is approved to transfer tokens to account `to`
   * of an amount `value`.
   * @param to address The account of the recipient.
   * @param value uint256 The amount to transfer.
   * @return Bool indicating if transfer will succeed & byte with a status code.
   */
  function canTransfer(
    address to,
    uint256 value
  ) external view returns (bool, bytes1);

  /**
   * @notice Check if an account is approved to transfer tokens on behalf of
   * account `from` to account `to` of an amount `value`.
   * @param from address The account holding the tokens to be sent.
   * @param to address The account of the recipient.
   * @param value uint256 The amount to transfer.
   * @return Bool indicating if transfer will succeed & byte with a status code.
   */
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool, bytes1);

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}