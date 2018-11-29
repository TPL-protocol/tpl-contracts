pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol";
import "../examples/token/ERC721/TPLERC721Permissioned.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of TPLERC721Permissioned with an initial token.
 */
contract TPLERC721PermissionedInstance is TPLERC721Permissioned, ERC721Enumerable {
  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry`, an assignable attribute type with ID `validAttributeTypeID`, and
  * an initial NFT assigned to the creator.
  * @param registry address The account of the associated attribute registry.  
  * @param validAttributeTypeID uint256 The ID of the required attribute type.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validAttributeTypeID
  ) public TPLERC721Permissioned(registry, validAttributeTypeID) {
    _mockMint();
  }

  function _mockMint() internal {
    uint256 tokenId = uint256(
      keccak256(
        abi.encodePacked(
          msg.sender,
          blockhash(block.number - 1)
        )
      )
    );

    _mint(msg.sender, tokenId);
  }
}