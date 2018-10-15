pragma solidity ^0.4.25;

/**
 * @title Attribute Registry interface. EIP-165 ID: 0x5f46473f
 */
interface AttributeRegistryInterface {
  /**
   * @notice Check if an attribute has been assigned to a given address.
   * @param _account The address to check.
   * @param _attributeTypeID The ID of the attribute type to check for.
   * @return True if the attribute has been assigned, false otherwise.
   */
  function hasAttribute(
  	address _account,
  	uint256 _attributeTypeID
  ) external view returns (bool);

  /**
   * @notice Retrieve the value of an attribute at a given address.
   * @param _account The address to check.
   * @param _attributeTypeID The ID of the attribute type to check for.
   * @return The attribute value if an attribute is assigned, reverts otherwise.
   */
  function getAttributeValue(
  	address _account,
  	uint256 _attributeTypeID
  ) external view returns (uint256);

  /**
   * @notice Count all attribute types defined on the registry.
   * @return The total number of available attribute types.
   */
  function countAttributeTypes() external view returns (uint256);

  /**
   * @notice Retrieve an attribute type ID defined on the registry by index.
   * @return The ID of the attribute type.
   */
  function getAttributeTypeID(
    uint256 _index
  ) external view returns (uint256);
}