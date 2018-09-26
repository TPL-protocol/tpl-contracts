pragma solidity ^0.4.24;

/**
 * @title Attribute Registry interface. EIP-165 ID: 0x8af1887e
 */
interface AttributeRegistry {
  /**
   * @notice Check if an attribute has been assigned to a given address.
   * @param _who The address to check.
   * @param _attribute The ID of the attribute to check for.
   * @return True if the attribute has been assigned, false otherwise.
   */
  function hasAttribute(
  	address _who,
  	uint256 _attribute
  ) external view returns (bool);

  /**
   * @notice Retrieve the value of an attribute at a given address.
   * @param _who The address to check.
   * @param _attribute The ID of the attribute to check for.
   * @return The attribute value if an attribute is assigned, 0 otherwise.
   */
  function getAttribute(
  	address _who,
  	uint256 _attribute
  ) external view returns (uint256);

  /**
   * @notice Count all attribute IDs defined on the registry.
   * @return The total number of available attributes.
   */
  function countAvailableAttributeIDs() external view returns (uint256);

  /**
   * @notice Retrieve an attribute ID defined on the registry by index.
   * @return An attribute ID.
   */
  function getAvailableAttributeID(
    uint256 _index
  ) external view returns (uint256);
}