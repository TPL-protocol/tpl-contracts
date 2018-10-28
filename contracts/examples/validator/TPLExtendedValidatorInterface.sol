pragma solidity ^0.4.25;


/**
 * @title TPL Extended Validator interface (extends Basic Validator interface).
 * EIP-165 ID: 0x596c0405
 */
interface TPLExtendedValidatorInterface {
  /**
   * @notice Set a signing key on the jurisdiction with an associated public
   * key at address `newSigningKey`.
   * @param newSigningKey address The signing key to set.
   */
  function setSigningKey(address newSigningKey) external;

  /**
   * @notice Invalidate a signed attribute approval before it has been set by
   * supplying the hash of the approval `hash` and the signature `signature`.
   * @param hash bytes32 The hash of the attribute approval.
   * @param signature bytes The hash's signature, resolving to the signing key.
   */
  function invalidateAttributeApproval(bytes32 hash, bytes signature) external;

  /**
   * @notice Withdraw funds paid into the validator of amount `value` to the
   * account at `to`.
   * @param to address The address to withdraw to.
   * @param value uint256 The amount to withdraw.
   */
  function withdraw(bytes32 to, uint256 value) external;

  /**
   * @notice Get the validator's signing key on the jurisdiction.
   * @return The account referencing the public component of the signing key.
   */
  function getSigningKey() external view returns (address);

  /**
   * @notice Check if the validator is approved to issue an attribute of the
   * type with ID `attributeTypeID` to account `account` on the jurisdiction
   * when `msg.value` is set to `value`.
   * @param account address The account to issue the attribute to.
   * @param attributeTypeID uint256 The ID of the attribute type in question.
   * @param value uint256 The amount of ether included in the transaction.
   * @return Bool indicating if attribute is issuable & byte with status code.
   */
  function canIssueAttribute(
    address account,
    uint256 attributeTypeID,
    uint256 value
  ) external view returns (bool, bytes1);

  /**
   * @notice Get the hash of a given attribute approval from the jurisdiction.
   * @param account address The account specified by the attribute approval.
   * @param operator address An optional account permitted to submit approval.
   * @param attributeTypeID uint256 The ID of the attribute type in question.
   * @param value uint256 The value of the attribute in the approval.
   * @param fundsRequired uint256 The amount to be included with the approval.
   * @param validatorFee uint256 The required fee to be paid to the validator.
   * @return The hash of the attribute approval.
   */
  function getAttributeApprovalHash(
    address account,
    address operator,
    uint256 attributeTypeID,
    uint256 value,
    uint256 fundsRequired,
    uint256 validatorFee
  ) external view returns (bytes32 hash);
}