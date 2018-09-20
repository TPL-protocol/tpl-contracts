pragma solidity ^0.4.24;

interface ExtendedJurisdictionInterface {
  // NOTE: this extends BasicJurisdictionInterface for StandardJurisdiction.

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

  // validators may modify the public key corresponding to their signing key.
  function modifyValidatorSigningKey(address _newSigningKey) external;

  // users of the jurisdiction add attributes by including a validator signature
  function addAttribute(
    uint256 _attribute,
    uint256 _value,
    uint256 _validatorFee,
    bytes _signature
  ) external payable;

  // others can also add attributes by including an address and valid signature
  function addAttributeFor(
    address _who,
    uint256 _attribute,
    uint256 _value,
    uint256 _validatorFee,
    bytes _signature
  ) external payable;

  // users may remove their own attributes from the jurisdiction at any time
  function removeAttribute(uint256 _attribute) external;

  // an operator who has set an attribute may also remove it, if unrestricted
  function removeAttributeFor(address _who, uint256 _attribute) external;

  // owner and issuing validators may invalidate a signed attribute approval
  function invalidateAttributeApproval(
    bytes32 _hash,
    bytes _signature
  ) external;

  // external interface for getting the hash of an attribute approval
  function getAttributeApprovalHash(
    address _who,
    address _operator,
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee
  ) external view returns (bytes32 hash);

  // users can check whether a signature for adding an attribute is still valid
  function canAddAttribute(
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee,
    bytes _signature
  ) external view returns (bool);

  // operators can check whether an attribute approval signature is still valid
  function canAddAttributeFor(
    address _who,
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee,
    bytes _signature
  ) external view returns (bool);
}
