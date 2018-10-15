pragma solidity ^0.4.25;

/**
 * @title TPL Token interface. EIP-165 ID: 0x7d92a55e
 */
interface TPLTokenInterface {
  /**
   * @notice Check if an account is approved to transfer an amount of `value` to
   * a recipient at account `to`.
   * @param to address The account of the recipient.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer will succeed, false otherwise.
   * @dev Consider also returning a status code, e.g. EIP-1066
   */
  function canTransfer(address to, uint256 value) external view returns (bool);

  /**
   * @notice Check if an account is approved to transfer an amount of `value` to
   * a recipient at account `to` on behalf of a sender at account `from`.
   * @param to address The account of the recipient.
   * @param from address The account of the sender.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer will succeed, false otherwise.
   * @dev Consider also returning a status code, e.g. EIP-1066
   */
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool);

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}
