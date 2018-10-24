pragma solidity ^0.4.24;


interface ExtendedJurisdictionInterface {
  // NOTE: this extends BasicJurisdictionInterface for additional functionality.

  // declare events (NOTE: consider which fields should be indexed)
  event ValidatorSigningKeyModified(
    address indexed validator,
    address newSigningKey
  );

  event StakeAllocated(
    address indexed staker,
    uint256 indexed attribute,
    uint256 amount
  );

  event StakeRefunded(
    address indexed staker,
    uint256 indexed attribute,
    uint256 amount
  );

  event FeePaid(
    address indexed recipient,
    address indexed payee,
    uint256 indexed attribute,
    uint256 amount
  );
  
  event TransactionRebatePaid(
    address indexed submitter,
    address indexed payee,
    uint256 indexed attribute,
    uint256 amount
  );

  /**
  * @notice Add a restricted attribute type with ID `ID` and description
  * `description` to the jurisdiction. Restricted attribute types can only be
  * removed by the issuing validator or the jurisdiction.
  * @param ID uint256 The ID of the restricted attribute type to add.
  * @param description string A description of the restricted attribute type.
  * @dev Once an attribute type is added with a given ID, the description or the
  * restricted status of the attribute type cannot be changed, even if the
  * attribute type is removed and added back later.
  */
  function addRestrictedAttributeType(uint256 ID, string description) external;

  /**
  * @notice Enable or disable a restriction for a given attribute type ID `ID`
  * that prevents attributes of the given type from being set by operators based
  * on the provided value for `onlyPersonal`.
  * @param ID uint256 The attribute type ID in question.
  * @param onlyPersonal bool Whether the address may only be set personally.
  */
  function setAttributeTypeOnlyPersonal(uint256 ID, bool onlyPersonal) external;

  /**
  * @notice Set a secondary source for a given attribute type ID `ID`, with an
  * address `registry` of the secondary source in question and a given
  * `sourceAttributeTypeID` for attribute type ID to check on the secondary
  * source. The secondary source will only be checked for the given attribute in
  * cases where no attribute of the given attribute type ID is assigned locally.
  * @param ID uint256 The attribute type ID to set the secondary source for.
  * @param attributeRegistry address The secondary attribute registry account.
  * @param sourceAttributeTypeID uint256 The attribute type ID on the secondary
  * source to check.
  * @dev To remove a secondary source on an attribute type, the registry address
  * should be set to the null address.
  */
  function setAttributeTypeSecondarySource(
    uint256 ID,
    address attributeRegistry,
    uint256 sourceAttributeTypeID
  ) external;

  /**
  * @notice Set a minimum required stake for a given attribute type ID `ID` and
  * an amount of `stake`, to be locked in the jurisdiction upon assignment of
  * attributes of the given type. The stake will be applied toward a transaction
  * rebate in the event the attribute is revoked, with the remainder returned to
  * the staker.
  * @param ID uint256 The attribute type ID to set a minimum required stake for.
  * @param minimumRequiredStake uint256 The minimum required funds to lock up.
  * @dev To remove a stake requirement from an attribute type, the stake amount
  * should be set to 0.
  */
  function setAttributeTypeMinimumRequiredStake(
    uint256 ID,
    uint256 minimumRequiredStake
  ) external;

  /**
  * @notice Set a required fee for a given attribute type ID `ID` and an amount
  * of `fee`, to be paid to the owner of the jurisdiction upon assignment of
  * attributes of the given type.
  * @param ID uint256 The attribute type ID to set the required fee for.
  * @param fee uint256 The required fee amount to be paid upon assignment.
  * @dev To remove a fee requirement from an attribute type, the fee amount
  * should be set to 0.
  */
  function setAttributeTypeJurisdictionFee(uint256 ID, uint256 fee) external;

  // validators may set a public key corresponding to their signing key.
  function setValidatorSigningKey(address newSigningKey) external;

  // users of the jurisdiction add attributes by including a validator signature
  function addAttribute(
    uint256 attributeTypeID,
    uint256 value,
    uint256 validatorFee,
    bytes signature
  ) external payable;

  // users may remove unrestricted attributes from the jurisdiction at any time
  function removeAttribute(uint256 attributeTypeID) external;

  // others can also add attributes by including an address and valid signature
  function addAttributeFor(
    address account,
    uint256 attributeTypeID,
    uint256 value,
    uint256 validatorFee,
    bytes signature
  ) external payable;

  // an operator who has set an unrestricted attribute may also remove it
  function removeAttributeFor(address account, uint256 attributeTypeID) external;

  // owner and issuing validators may invalidate a signed attribute approval
  function invalidateAttributeApproval(
    bytes32 hash,
    bytes signature
  ) external;

  // external interface for getting the hash of an attribute approval
  function getAttributeApprovalHash(
    address account,
    address operator,
    uint256 attributeTypeID,
    uint256 value,
    uint256 fundsRequired,
    uint256 validatorFee
  ) external view returns (bytes32 hash);

  // users can check whether a signature for adding an attribute is still valid
  function canAddAttribute(
    uint256 attributeTypeID,
    uint256 value,
    uint256 fundsRequired,
    uint256 validatorFee,
    bytes signature
  ) external view returns (bool);

  // operators can check whether an attribute approval signature is still valid
  function canAddAttributeFor(
    address account,
    uint256 attributeTypeID,
    uint256 value,
    uint256 fundsRequired,
    uint256 validatorFee,
    bytes signature
  ) external view returns (bool);

  // external interface for getting information on an attribute type by ID
  function getAttributeTypeInformation(
    uint256 attributeTypeID
  ) external view returns (
    string description,
    bool isRestricted,
    bool isOnlyPersonal,
    address secondarySource,
    uint256 secondaryId,
    uint256 minimumRequiredStake,
    uint256 jurisdictionFee
  );
  
  // external interface for getting the signing key of a validator by address
  function getValidatorSigningKey(
    address validator
  ) external view returns (
    address signingKey
  );
}
