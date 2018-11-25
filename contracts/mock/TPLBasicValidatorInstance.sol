pragma solidity ^0.4.25;

import "../examples/validator/TPLBasicValidator.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of TPLBasicValidator with external functions to add and
 * revoke a given attribute.
 */
contract TPLBasicValidatorInstance is TPLBasicValidator {

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
  ) public TPLBasicValidator(registry, validAttributeTypeID) {
    registry; // no-empty-blocks
  }

  /**
   * @notice Issue an attribute of the type with the default ID to `msg.sender`
   * on the jurisdiction. Values are left at zero and the method may be called
   * by anyone.
   */  
  function issueAttribute() external {
    require(_issueAttribute(msg.sender));
  }

  /**
   * @notice Revoke an attribute from the type with the default ID from
   * `msg.sender` on the jurisdiction. This method may be called by anyone.
   */
  function revokeAttribute() external {
    require(_revokeAttribute(msg.sender));
  }
}