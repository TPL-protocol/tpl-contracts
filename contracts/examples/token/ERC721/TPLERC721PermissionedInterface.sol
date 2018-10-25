pragma solidity ^0.4.25;


/**
 * @title TPL ERC721 Permissioned interface. EIP-165 ID: 0xca33cbb3
 */
interface TPLERC721PermissionedInterface {
  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` with data `data` is approved.
   * The check must fail if the recipient of the transfer does not correctly
   * implement `onERC721Received`.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   * @param data bytes Additional data with no specified format to be included.
   */  
  function canSafeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes data
  ) external payable;

  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` is approved. The check must
   * fail if the recipient of the transfer does not correctly
   * implement `onERC721Received`.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   */
  function canSafeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external payable;

  /**
   * @notice Check if a transfer of the NFT with ID `tokenId` on behalf of
   * account `from` to a recipient at account `to` is approved. THE CALLER IS
   * RESPONSIBLE TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE THEY
   * MAY BE PERMANENTLY LOST.
   * @param from address The current owner of the NFT.
   * @param to address The new owner.
   * @param tokenId uint256 The NFT to transfer.
   */  
  function canTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external payable;

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address);
}