pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/utils/Address.sol";
import "./TPLERC721PermissionedInterface.sol";
import "../../../AttributeRegistryInterface.sol";


/**
 * @title Permissioned ERC721 token: ownership is restricted to valid accounts.
 */
contract TPLERC721Permissioned is ERC721, TPLERC721PermissionedInterface {
  using Address for address;

  // Declare registry interface, used to request attributes from a jurisdiction.
  AttributeRegistryInterface internal _registry;

  // Declare attribute ID required in order to hold tokens,
  uint256 internal _validAttributeTypeID;

  // `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
  // i.e. `IERC721Receiver(0).onERC721Received.selector`
  bytes4 private constant ERC721_RECEIVED = 0x150b7a02;

  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry` and an assignable attribute type with ID `validAttributeTypeID`.
  * @param registry address The account of the associated attribute registry.  
  * @param validAttributeTypeID uint256 The ID of the required attribute type.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validAttributeTypeID
  ) public {
    _registry = AttributeRegistryInterface(registry);
    _validAttributeTypeID = validAttributeTypeID;
  }

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
  ) external view returns (bool, bytes1) {
    // This implementation does not allow attaching a value to the transfer.
    if (value > 0) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized
    }

    // The spender must be approved or the owner of the NFT.
    if (!_isApprovedOrOwner(msg.sender, tokenId)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized      
    }

    // The to address cannot be the null address.
    if (to == address(0)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized       
    }

    // The receiver must return the required magic number (if it is a contract).
    if (_safeCheckOnERC721Received(from, to, tokenId, data) != ERC721_RECEIVED) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized
    }

    // The recipient of the transfer must have the correct attribute assigned.
    if (!_registry.hasAttribute(to, _validAttributeTypeID)) {
      return (false, bytes1(hex"10")); // NOTE: error codes are not standardized      
    }

    // The transfer is approved, return true and the success status code.
    return (true, bytes1(hex"01"));
  }

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
  ) external view returns (bool, bytes1) {
    // This implementation does not allow attaching a value to the transfer.
    if (value > 0) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized
    }

    // The spender must be approved or the owner of the NFT.
    if (!_isApprovedOrOwner(msg.sender, tokenId)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized      
    }

    // The to address cannot be the null address.
    if (to == address(0)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized       
    }

    // The receiver must return the required magic number (if it is a contract).
    if (_safeCheckOnERC721Received(from, to, tokenId, "") != ERC721_RECEIVED) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized
    }

    // The recipient of the transfer must have the correct attribute assigned.
    if (!_registry.hasAttribute(to, _validAttributeTypeID)) {
      return (false, bytes1(hex"10")); // NOTE: error codes are not standardized      
    }

    // The transfer is approved, return true and the success status code.
    return (true, bytes1(hex"01"));
  }

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
  ) external view returns (bool, bytes1) {
    // avoid an unused variable warning.
    from;

    // This implementation does not allow attaching a value to the transfer.
    if (value > 0) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized
    }

    // The spender must be approved or the owner of the NFT.
    if (!_isApprovedOrOwner(msg.sender, tokenId)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized      
    }

    // The to address cannot be the null address.
    if (to == address(0)) {
      return (false, bytes1(hex"A0")); // NOTE: error codes are not standardized       
    }

    // The recipient of the transfer must have the correct attribute assigned.
    if (!_registry.hasAttribute(to, _validAttributeTypeID)) {
      return (false, bytes1(hex"10")); // NOTE: error codes are not standardized      
    }

    // The transfer is approved, return true and the success status code.
    return (true, bytes1(hex"01"));
  }

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address) {
    return address(_registry);
  }

  /**
   * @notice Get the ID of the attribute type required to receive tokens.
   * @return The ID of the required attribute type.
   */
  function getValidAttributeID() external view returns (uint256) {
    return _validAttributeTypeID;
  }

  /**
   * @dev Transfers the ownership of a given token ID to another address
   * Usage of this method is discouraged, use `safeTransferFrom` when possible
   * Requires the msg sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param tokenId uint256 ID of the token to be transferred
  */
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  )
    public
  {
    require(
      _registry.hasAttribute(to, _validAttributeTypeID),
      "Transfer failed - receiver is not approved."
    );
    super.transferFrom(from, to, tokenId);
  }

  /**
   * @dev Safely transfers the ownership of a given token ID to another address
   * If the target address is a contract, it must implement `onERC721Received`,
   * which is called upon a safe transfer, and return the magic value
   * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`;
   * otherwise, the transfer is reverted.
   *
   * Requires the msg sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param tokenId uint256 ID of the token to be transferred
  */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  )
    public
  {
    // solium-disable-next-line arg-overflow
    safeTransferFrom(from, to, tokenId, hex"");
  }

  /**
   * @dev Safely transfers the ownership of a given token ID to another address
   * If the target address is a contract, it must implement `onERC721Received`,
   * which is called upon a safe transfer, and return the magic value
   * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`;
   * otherwise, the transfer is reverted.
   * Requires the msg sender to be the owner, approved, or operator
   * @param from current owner of the token
   * @param to address to receive the ownership of the given token ID
   * @param tokenId uint256 ID of the token to be transferred
   * @param data bytes data to send along with a safe transfer check
   */
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes data
  )
    public
  {
    transferFrom(from, to, tokenId);
    // solium-disable-next-line arg-overflow
    require(_checkOnERC721Received(from, to, tokenId, data));
  }

  function _safeCheckOnERC721Received(
    address from,
    address to,
    uint256 tokenId,
    bytes data
  ) internal view returns (bytes4 result) {
    if (!to.isContract()) {
      return ERC721_RECEIVED;
    }

    bytes memory encodedParams = abi.encodeWithSelector(
      ERC721_RECEIVED,
      msg.sender,
      from,
      tokenId,
      data
    );

    uint256 maxGas = gasleft() < 10000 ? gasleft() : gasleft() - 5000;

    assembly {
      let encodedParams_data := add(0x20, encodedParams)
      let encodedParams_size := mload(encodedParams)
      
      let output := mload(0x40) // get storage start from free memory pointer
      mstore(output, 0x0)       // set up the location for output of staticcall

      let success := staticcall(
        maxGas,                 // save some gas for processing failures
        to,                     // address to call
        encodedParams_data,     // inputs are stored at pointer location
        encodedParams_size,     // inputs are 68 bytes (4 + 32 * 2)
        output,                 // return to designated free space
        0x20                    // output is one word, or 32 bytes
      )

      switch success            // instrumentation bug: use switch instead of if
      case 1 {                  // only recognize successful staticcall output 
        result := mload(output) // set the output to the return value
      }
    }
  }
}