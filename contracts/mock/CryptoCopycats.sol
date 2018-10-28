pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Enumerable.sol";
import "../examples/token/ERC721/TPLERC721Permissioned.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of TPLERC721Permissioned with an initial token.
 */
contract CryptoCopycats is TPLERC721Permissioned, ERC721Enumerable {

  string public name = "Crypto Copycats";

  mapping(address => bool) private _hasAdopted;

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
    _adopt();
  }

  function adopt() external {
    require(
      _registry.hasAttribute(msg.sender, _validAttributeTypeID),
      "We only let approved owners adopt our cats!"
    );
    require(
      !_hasAdopted[msg.sender],
      "Do not adopt more than one cat, please!"
    );    
    _adopt();
  }

  function rescue(uint256 tokenId) external {
    address currentOwner = ownerOf(tokenId);
    require(
      !_registry.hasAttribute(currentOwner, _validAttributeTypeID),
      "You would steal a cat from a loving owner? You monster!"
    );
    require(
      _registry.hasAttribute(msg.sender, _validAttributeTypeID),
      "We only let approved owners rescue cats!"
    );

    _rescue(tokenId);
  }

  function _adopt() internal {
    uint256 tokenId = uint256(
      keccak256(
        abi.encodePacked(
          msg.sender,
          blockhash(block.number - 1),
          now
        )
      )
    );

    _mint(msg.sender, tokenId);
    _hasAdopted[msg.sender] = true;
  }

  function _rescue(uint256 tokenId) internal {
    // Don't over-analyze the methods we use to rescue cats...
    _burn(ownerOf(tokenId), tokenId);
    _mint(msg.sender, tokenId);
  }
}