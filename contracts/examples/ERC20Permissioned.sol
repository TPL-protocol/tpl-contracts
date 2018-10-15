pragma solidity ^0.4.25;

import "openzeppelin-zos/contracts/token/ERC20/ERC20.sol";
import "../AttributeRegistryInterface.sol";
import "../TPLTokenInterface.sol";


/**
 * @title ERC20 Permissioned Token example.
 */
contract ERC20Permissioned is Initializable, ERC20, TPLTokenInterface {

  // declare registry interface, used to request attributes from a jurisdiction
  AttributeRegistryInterface private _registry;

  // declare attribute ID required in order to receive transferred tokens
  uint256 private _validAttributeTypeID;

  /**
   * @notice Transfer an amount of `value` to a recipient at account `to`.
   * @param to address The account of the recipient.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer will succeed, false otherwise.
   * @dev Consider also returning a status code, e.g. EIP-1066
   */
  function canTransfer(address to, uint256 value) external view returns (bool) {
    return (
      super.balanceOf(msg.sender) >= value && 
      _registry.hasAttribute(to, _validAttributeTypeID)
    );
  }

  /**
   * @notice Check if an account is approved to transfer an amount of `value` to
   * a recipient at account `to` on behalf of a sender at account `from`.
   * @param to address The account of the recipient.
   * @param from address The account of the sender.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer will succeed, false otherwise.
   * @dev Consider also returning a status code, e.g. EIP-1066
   */
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool) {
    return (
      super.balanceOf(from) >= value &&
      super.allowance(from, msg.sender) >= value &&
      _registry.hasAttribute(to, _validAttributeTypeID)
    );
  }

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address) {
    return address(_registry);
  }

  /**
   * @notice Get the ID of the attribute type required to receive tokens.
   * @return The ID of the required attribute type.
   */
  function getValidAttributeID() external view returns (uint256) {
    return _validAttributeTypeID;
  }

  /**
  * @notice The initializer function, with an associated attribute registry at
  * `registry` and an assignable attribute type with ID `validAttributeTypeID`.
  * @param registry address The account of the associated attribute registry.  
  * @param validAttributeTypeID uint256 The ID of the required attribute type.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  function initialize(
    AttributeRegistryInterface registry,
    uint256 validAttributeTypeID
  )
    public
    initializer
  {
    _registry = AttributeRegistryInterface(registry);
    _validAttributeTypeID = validAttributeTypeID;
  }

  /**
   * @notice Transfer an amount of `value` to a recipient at account `to`.
   * @param to address The account of the recipient.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer was successful.
   */
  function transfer(address to, uint256 value) public returns (bool) {
    require(
      _registry.hasAttribute(to, _validAttributeTypeID),
      "Transfer failed - recipient is not approved."
    );
    return(super.transfer(to, value));
  }

  /**
   * @notice Transfer an amount of `value` to a recipient at account `to` on
   * behalf of a sender at account `from`.
   * @param to address The account of the recipient.
   * @param from address The account of the sender.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer was successful.
   */
  function transferFrom(
    address from,
    address to,
    uint256 value
  ) public returns (bool) {
    require(
      _registry.hasAttribute(to, _validAttributeTypeID),
      "Transfer failed - recipient is not approved."
    );
    return(super.transferFrom(from, to, value));
  }
}
