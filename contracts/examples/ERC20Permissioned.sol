pragma solidity ^0.4.25;

import "openzeppelin-zos/contracts/token/ERC20/ERC20.sol";
import "../AttributeRegistryInterface.sol";
import "../TPLTokenInterface.sol";

contract ERC20Permissioned is Initializable, ERC20, TPLTokenInterface {

  // declare registry interface, used to request attributes from a jurisdiction
  AttributeRegistryInterface private _registry;

  // declare attribute ID required in order to receive transferred tokens
  uint256 private _validRecipientAttributeID;

  // initialize token with an attribute registry address and valid attribute ID
  function initialize(
    AttributeRegistryInterface registry,
    uint256 validRecipientAttributeID
  )
    initializer
    public
  {
    _registry = AttributeRegistryInterface(registry);
    _validRecipientAttributeID = validRecipientAttributeID;
  }

  // check that target is allowed to receive tokens before enabling the transfer
  function transfer(address to, uint256 value) public returns (bool) {
    require(
      _registry.hasAttribute(to, _validRecipientAttributeID),
      "Transfer failed - recipient is not approved."
    );
    return(super.transfer(to, value));
  }

  // check that the transfer is valid before enabling approved transfers as well
  function transferFrom(
    address from,
    address to,
    uint256 value
  ) public returns (bool) {
    require(
      _registry.hasAttribute(to, _validRecipientAttributeID),
      "Transfer failed - recipient is not approved."
    );
    return(super.transferFrom(from, to, value));
  }

  // in order to transfer tokens, the receiver must be valid
  // NOTE: consider returning an additional status code, e.g. EIP 1066
  function canTransfer(address to, uint256 value) external view returns (bool) {
    return (
      super.balanceOf(msg.sender) >= value && 
      _registry.hasAttribute(to, _validRecipientAttributeID)
    );
  }

  // in order to transfer tokens via transferFrom, the receiver must be valid
  // NOTE: consider returning an additional status code, e.g. EIP 1066
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool) {
    return (
      super.balanceOf(from) >= value &&
      super.allowance(from, msg.sender) >= value &&
      _registry.hasAttribute(to, _validRecipientAttributeID)
    );
  }

  // provide getter function for finding the registry address the token is using
  function getRegistry() external view returns (address) {
    return address(_registry);
  }

  // external interface for getting the required attribute ID
  function getValidAttributeID() external view returns (uint256) {
    return _validRecipientAttributeID;
  }
}
