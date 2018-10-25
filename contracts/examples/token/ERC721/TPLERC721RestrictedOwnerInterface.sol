pragma solidity ^0.4.25;


/**
 * @title TPL ERC721 Restricted Owner interface. EIP-165 ID: 0xfe39d63a
 */
interface TPLERC721RestrictedOwnerInterface {
  /**
   * @notice Check if an account `account` is approved to own NFTs.
   * @param account address The account in question.
   * @return True if account can own NFTs, false otherwise.
   */  
  function canOwn(address account) external view returns (bool);

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}