pragma solidity ^0.4.25;

interface BasicJurisdictionInterface {
  // NOTE: Basic jurisdictions will not use some of the fields on this interface

  // declare events (NOTE: consider which fields should be indexed)
  event AttributeTypeAdded(uint256 indexed attributeTypeID, string description);
  event AttributeTypeRemoved(uint256 indexed attributeTypeID);
  event ValidatorAdded(address indexed validator, string description);
  event ValidatorRemoved(address indexed validator);
  event ValidatorApprovalAdded(
    address validator,
    uint256 indexed attributeTypeID
  );
  event ValidatorApprovalRemoved(
    address validator,
    uint256 indexed attributeTypeID
  );
  event AttributeAdded(
    address validator,
    address indexed attributee,
    uint256 attributeTypeID,
    uint256 attributeValue
  );
  event AttributeRemoved(
    address validator,
    address indexed attributee,
    uint256 attributeTypeID
  );

  // the jurisdiction may declare attribute types, or categories of attributes
  function addAttributeType(
    uint256 ID,
    string description
  ) external;

  // the jurisdiction may also remove attributes - necessary before updating
  function removeAttributeType(uint256 ID) external;

  // the jurisdiction can add new validators who can verify and sign attributes
  function addValidator(address validator, string description) external;

  // the jurisdiction can remove validators, invalidating submitted attributes
  function removeValidator(address validator) external;

  // the jurisdiction approves validators to assign predefined attributes
  function addValidatorApproval(
    address validator,
    uint256 attributeTypeID
  ) external;

  // the jurisdiction may remove a validator's ability to approve an attribute
  function removeValidatorApproval(
    address validator,
    uint256 attributeTypeID
  ) external;

  // approved validators may add attributes directly to a specified address
  function addAttributeTo(
    address account,
    uint256 attributeTypeID,
    uint256 value
  ) external payable;

  // the jurisdiction and issuing validators may remove attributes
  function removeAttributeFrom(
    address account,
    uint256 attributeTypeID
  ) external;

  // external interface to check if validator is approved to issue an attribute
  function canIssueAttributeType(
    address validator,
    uint256 attributeTypeID
  ) external view returns (bool);

  // external interface for getting the description of an attribute type by ID
  function getAttributeTypeInformation(
    uint256 attributeTypeID
  ) external view returns (
    string description
  );
  
  // external interface for getting the description of a validator by ID
  function getValidatorInformation(
    address validator
  ) external view returns (
    string description
  );

  // external interface for determining the validator of an issued attribute
  function getAttributeValidator(
    address account,
    uint256 attributeTypeID
  ) external view returns (address validator, bool isStillValid);

  // external interface for getting the number of available attribute types
  function countAttributeTypes() external view returns (uint256);

  // external interface for getting an available attribute type's ID by index
  function getAttributeTypeID(uint256 index) external view returns (uint256);

  // external interface for getting IDs of all available attribute types
  function getAttributeTypeIDs() external view returns (uint256[]);

  // external interface for getting the number of designated validators
  function countValidators() external view returns (uint256);

  // external interface for getting a validator's address by index
  function getValidator(uint256 index) external view returns (address);

  // external interface for getting the list of all validators by address
  function getValidators() external view returns (address[]);
}
