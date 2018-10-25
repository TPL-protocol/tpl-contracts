pragma solidity ^0.4.25;


/**
 * @title TPL ERC721 Permissioned interface. EIP-165 ID: 0xadd914e4
 */
interface TPLERC721PermissionedInterface {
  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` with `msg.value` of `value`
   * and data `data` is approved. The check must fail if the recipient of the
   * transfer does not correctly implement `onERC721Received`.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   * @param value uint256 The amount of ether to include with the transaction.   
   * @param data bytes Additional data with no specified format to be included.
   * @return Bool indicating if transfer is approved & byte with a status code.
   */  
  function canSafeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 value,
    bytes data
  ) external view returns (bool, bytes1);

  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` with `msg.value` of `value`
   * is approved. The check must fail if the recipient of the transfer does not
   * correctly implement `onERC721Received`.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   * @param value uint256 The amount of ether to include with the transaction.   
   * @return Bool indicating if transfer is approved & byte with a status code.
   */
  function canSafeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 value
  ) external view returns (bool, bytes1);

  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` with `msg.value` of `value`
   * is approved. THE CALLER IS RESPONSIBLE TO CONFIRM THAT `to` IS CAPABLE OF
   * RECEIVING NFTS OR ELSE THEY MAY BE PERMANENTLY LOST.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   * @param value uint256 The amount of ether to include with the transaction.   
   * @return Bool indicating if transfer is approved & byte with a status code.
   */  
  function canTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    uint256 value
  ) external view returns (bool, bytes1);

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}