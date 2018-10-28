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
    bytes32 initialTokenInput = keccak256(
      abi.encodePacked(
        msg.sender,
        blockhash(block.number - 1),
        now
      )
    );

    /*
    bytes32 out;
    for (uint i = 0; i < 32; i++) {
      uint8 candidate = uint8(initialTokenInput[i]);
      while (candidate > 153 || candidate % 16 > 9) {
        candidate = candidate * 127;
      }
      out |= bytes32(bytes1(candidate) & 0xFF) >> (i * 8);
    }
    
    uint256 tokenId = uint256(out);
    */
    uint256 tokenId = uint256(initialTokenInput);

    _mint(msg.sender, tokenId);
  }
}