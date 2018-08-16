pragma solidity ^0.4.24;

interface JurisdictionInterface {

  // declare events (NOTE: consider which fields should be indexed)
  event AttributeTypeAdded(uint256 indexed attribute, string description);
  event AttributeTypeRemoved(uint256 indexed attribute);
  event ValidatorAdded(address indexed validator, string description);
  event ValidatorRemoved(address indexed validator);
  event ValidatorApprovalAdded(address validator, uint256 indexed attribute);
  event ValidatorApprovalRemoved(address validator, uint256 indexed attribute);
  event ValidatorSigningKeyModified(address indexed validator, address newSigningKey);
  event AttributeAdded(address validator, address indexed attributee, uint256 attribute);
  event AttributeRemoved(address validator, address indexed attributee, uint256 attribute);
  // NOTE: consider event on value transfers: fees, stake, & transaction rebates

  // the contract owner may declare attributes recognized by the jurisdiction
  function addAttributeType(uint256 _id, bool _restrictedAccess, uint256 _minimumStake, string _description)
    external;

  // the owner may also remove attributes - necessary first step before updating
  function removeAttributeType(uint256 _id) external;

  // the jurisdiction can add new validators who can verify and sign attributes
  function addValidator(address _validator, string _description) external;

  // the jurisdiction can remove validators, invalidating submitted attributes
  function removeValidator(address _validator) external;

  // the jurisdiction approves validators to assign predefined attributes
  function addValidatorApproval(address _validator, uint256 _attribute)
    external;

  // the jurisdiction may remove a validator's ability to approve an attribute
  function removeValidatorApproval(address _validator, uint256 _attribute)
    external;

  function modifyValidatorSigningKey(address _newSigningKey) external;

  // users of the jurisdiction add attributes by including a validator signature
  function addAttribute(uint256 _attribute, uint256 _value, bytes _signature)
    external payable;

  // approved validators may also add attributes directly to a specified address
  function addAttributeTo(address _who, uint256 _attribute, uint256 _value)
    external payable;

  // users may remove their own attributes from the jurisdiction at any time
  function removeAttribute(uint256 _attribute) external;

  // the jurisdiction owner and issuing validators may also remove attributes
  function removeAttributeFrom(address _who, uint256 _attribute) external;

  // external interface for getting the description of an attribute by ID
  function getAttributeInformation(uint256 _attribute)
    external view returns (string description, bool isRestricted, uint256 minimumRequiredStake);

  // external interface for determining the validator of an issued attribute
  function getAttributeValidator(address _who, uint256 _attribute)
    external view returns (address validator, bool isStillValid);

  // users can check whether a signature for adding an attribute is still valid
  function canAddAttribute(uint256 _attribute, uint256 _value, uint256 _stake, bytes _signature)
    external view returns (bool);

}
