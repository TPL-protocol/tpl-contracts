pragma solidity ^0.4.25;

/**
 * @title Attribute Registry interface. EIP-165 ID: 0x5f46473f
 */
interface AttributeRegistryInterface {
  /**
   * @notice Check if an attribute has been assigned to a given address.
   * @param account The address to check.
   * @param attributeTypeID The ID of the attribute type to check for.
   * @return True if the attribute has been assigned, false otherwise.
   */
  function hasAttribute(
  	address account,
  	uint256 attributeTypeID
  ) external view returns (bool);

  /**
   * @notice Retrieve the value of an attribute at a given address.
   * @param account The address to check.
   * @param attributeTypeID The ID of the attribute type to check for.
   * @return The attribute value if an attribute is assigned, reverts otherwise.
   */
  function getAttributeValue(
  	address account,
  	uint256 attributeTypeID
  ) external view returns (uint256);

  /**
   * @notice Count all attribute types defined on the registry.
   * @return The total number of available attribute types.
   */
  function countAttributeTypes() external view returns (uint256);

  /**
   * @notice Retrieve an attribute type ID defined on the registry by index.
   * @param index The attribute type's index in the registry.   
   * @return The ID of the attribute type.
   */
  function getAttributeTypeID(
    uint256 index
  ) external view returns (uint256);
}