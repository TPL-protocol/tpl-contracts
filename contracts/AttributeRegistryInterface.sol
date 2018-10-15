pragma solidity ^0.4.25;

/**
 * @title Attribute Registry interface. EIP-165 ID: 0x5f46473f
 */
interface AttributeRegistryInterface {
  /**
   * @notice Check if an attribute of the type with ID `attributeTypeID` has
   * been assigned to the account at `account` and is still valid.
   * @param account address The account to check for a valid attribute.
   * @param attributeTypeID uint256 The ID of the attribute type to check for.
   * @return True if the attribute is assigned and valid, false otherwise.
   */
  function hasAttribute(
  	address account,
  	uint256 attributeTypeID
  ) external view returns (bool);

  /**
   * @notice Retrieve the value of the attribute of the type with ID
   * `attributeTypeID` on the account at `account`, assuming it is valid.
   * @param account address The account to check for the given attribute value.
   * @param attributeTypeID uint256 The ID of the attribute type to check for.
   * @return The attribute value if the attribute is valid, reverts otherwise.
   */
  function getAttributeValue(
  	address account,
  	uint256 attributeTypeID
  ) external view returns (uint256);

  /**
   * @notice Count the number of attribute types defined by the registry.
   * @return The number of available attribute types.
   */
  function countAttributeTypes() external view returns (uint256);

  /**
   * @notice Get the ID of the attribute type at index `index`.
   * @param index uint256 The index of the attribute type in question.
   * @return The ID of the attribute type.
   */
  function getAttributeTypeID(
    uint256 index
  ) external view returns (uint256);
}