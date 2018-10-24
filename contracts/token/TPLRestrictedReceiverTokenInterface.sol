pragma solidity ^0.4.25;


/**
 * @title TPL Restricted Receiver Token interface. EIP-165 ID: 0xca62cde9
 */
interface TPLRestrictedReceiverTokenInterface {
  /**
   * @notice Check if an account is approved to receive token transfers at
   * account `receiver`.
   * @param receiver address The account of the recipient.
   * @return True if the receiver is valid, false otherwise.
   */
  function canReceive(address receiver) external view returns (bool);

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}