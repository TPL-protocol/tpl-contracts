pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../examples/token/ERC20/TPLERC20Permissioned.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of an owned TPLERC20Permissioned token, with functions for
 * the owner to mint and burn tokens at will (within the limits designated by
 * the specified registry).
 */
contract TPLERC20PermissionedInstance is TPLERC20Permissioned, Ownable {
  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry`, two assignable attribute types with ID
  * `validOwnerAttributeTypeID` and `validOperatorAttributeTypeID`, an
  * assignable number of maximum token holders of `maximumOwners`, a
  * maximum allowance of owned tokens per owner of `ownershipLimit`, and an
  * attribute for if transfers are paused of `transfersPausedAttributeTypeID`.
  * @param registry address The account of the associated attribute registry.
  * @param validOwnerAttributeTypeID uint256 The ID of the required attribute
  * type in order to send or receive tokens.
  * @param validOperatorAttributeTypeID uint256 The ID of the required attribute
  * type in order to transfer tokens as an operator.
  * @param maximumOwnersAttributeTypeID uint256 The ID of the required attribute
  * type designating maximum number of allowed token holders.
  * @param ownershipLimitAttributeTypeID uint256 The ID of the required attribute
  * type designating maximum tokens that can be owned by any one token holder.
  * @param transfersPausedAttributeTypeID uint256 The ID of the required
  * attribute type designating whether transfers are paused.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validOwnerAttributeTypeID,
    uint256 validOperatorAttributeTypeID,
    uint256 maximumOwnersAttributeTypeID,
    uint256 ownershipLimitAttributeTypeID,
    uint256 transfersPausedAttributeTypeID
  ) public TPLERC20Permissioned(
    registry,
    validOwnerAttributeTypeID,
    validOperatorAttributeTypeID,
    maximumOwnersAttributeTypeID,
    ownershipLimitAttributeTypeID,
    transfersPausedAttributeTypeID
  ) {
    registry; // no-empty-blocks
  }

  function mint(address account, uint256 value) public onlyOwner {
    _mint(account, value);
  }

  function burn(address account, uint256 value) public onlyOwner {
    _burn(account, value);
  }

  function burnFrom(address account, uint256 value) public {
    _burnFrom(account, value);
  }
}