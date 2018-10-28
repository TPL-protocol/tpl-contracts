pragma solidity ^0.4.25;

import "./TPLBasicValidatorInterface.sol";
import "../../AttributeRegistryInterface.sol";
import "../../BasicJurisdictionInterface.sol";


/**
 * @title An instance of TPLBasicValidator, issue & revoke an attribute type.
 */
contract TPLBasicValidator is TPLBasicValidatorInterface {

  // declare registry interface, used to request attributes from a jurisdiction
  AttributeRegistryInterface internal _registry;

  // declare registry interface, set to same address as the registry
  BasicJurisdictionInterface internal _jurisdiction;

  // declare attribute ID required in order to receive transferred tokens
  uint256 internal _validAttributeTypeID;

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
    _jurisdiction = BasicJurisdictionInterface(registry);
    _validAttributeTypeID = validAttributeTypeID;
  }

  /**
   * @notice Check if contract is assigned as a validator on the jurisdiction.
   * @return True if validator is assigned, false otherwise.
   */  
  function isValidator() external view returns (bool) {
    uint256 totalValidators = _jurisdiction.countValidators();
    
    for (uint256 i = 0; i < totalValidators; i++) {
      address validator = _jurisdiction.getValidator(i);
      if (validator == address(this)) {
        return true;
      }
    }

    return false;
  }

  /**
   * @notice Check if the validator is approved to issue attributes of the type
   * with ID `attributeTypeID` on the jurisdiction.
   * @param attributeTypeID uint256 The ID of the attribute type in question.
   * @return True if validator is approved to issue attributes of given type.
   */  
  function canIssueAttributeType(
    uint256 attributeTypeID
  ) external view returns (bool) {
    return (
      _validAttributeTypeID == attributeTypeID &&
      _jurisdiction.canIssueAttributeType(address(this), _validAttributeTypeID)
    );
  }

  /**
   * @notice Check if the validator is approved to issue an attribute of the
   * type with ID `attributeTypeID` to account `account` on the jurisdiction.
   * @param account address The account to check for issuing the attribute to.
   * @param attributeTypeID uint256 The ID of the attribute type in question.
   * @return Bool indicating if attribute is issuable & byte with status code.
   * @dev This function could definitely use additional checks and error codes.
   */  
  function canIssueAttribute(
    address account,
    uint256 attributeTypeID
  ) external view returns (bool, bytes1) {
    // Only the predefined attribute type can be issued by this validator.
    if (_validAttributeTypeID != attributeTypeID) {
      return (false, hex"A0");
    }

    // Attributes can't be issued if one already exists on the given account.
    if (_registry.hasAttribute(account, _validAttributeTypeID)) {
      return (false, hex"B0");
    }

    return (true, hex"01");
  }

  /**
   * @notice Check if the validator is approved to revoke an attribute of the
   * type with ID `attributeTypeID` from account `account` on the jurisdiction.
   * @param account address The checked account for revoking the attribute from.
   * @param attributeTypeID uint256 The ID of the attribute type in question.
   * @return Bool indicating if attribute is revocable & byte with status code.
   * @dev This function could definitely use additional checks and error codes.
   */  
  function canRevokeAttribute(
    address account,
    uint256 attributeTypeID
  ) external view returns (bool, bytes1) {
    // Only the predefined attribute type can be revoked by this validator.
    if (_validAttributeTypeID != attributeTypeID) {
      return (false, hex"A0");
    }

    // Attributes can't be revoked if they don't exist on the given account.
    if (!_registry.hasAttribute(account, _validAttributeTypeID)) {
      return (false, hex"B0");
    }

    // Only the issuing validator can revoke an attribute.
    (address validator, bool unused) = _jurisdiction.getAttributeValidator(
      account,
      _validAttributeTypeID
    );
    unused;

    if (validator != address(this)) {
      return (false, hex"C0");
    }    

    return (true, hex"01");
  }

  /**
   * @notice Get the ID of the attribute type required to hold tokens.
   * @return The ID of the required attribute type.
   */
  function getValidAttributeID() external view returns (uint256) {
    return _validAttributeTypeID;
  }

  /**
   * @notice Get account of utilized jurisdiction and associated attribute
   * registry managed by the jurisdiction.
   * @return The account of the jurisdiction.
   */
  function getJurisdiction() external view returns (address) {
    return address(_jurisdiction);
  }

  /**
   * @notice Issue an attribute of the type with the default ID to account
   * `account` on the jurisdiction. Values are left at zero.
   * @param account address The account to issue the attribute to.
   * @return True if attribute has been successfully issued, false otherwise.
   */  
  function _issueAttribute(address account) internal returns (bool) {
    _jurisdiction.issueAttribute(account, _validAttributeTypeID, 0);
    return true;
  }

  /**
   * @notice Revoke an attribute of the type with ID `attributeTypeID` from
   * account `account` on the jurisdiction.
   * @param account address The account to revoke the attribute from.
   * @return True if attribute has been successfully revoked, false otherwise.
   */  
  function _revokeAttribute(address account) internal returns (bool) {
    _jurisdiction.revokeAttribute(account, _validAttributeTypeID);
    return true;
  }
}