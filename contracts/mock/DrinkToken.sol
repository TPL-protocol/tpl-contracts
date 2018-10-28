pragma solidity ^0.4.25;

import "../examples/token/ERC20/TPLERC20RestrictedReceiver.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of TPLRestrictedReceiverToken with an initial balance.
 */
contract DrinkToken is TPLERC20RestrictedReceiver {

  string public name = "Drink Token";

  event PourDrink(address drinker);

  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry`, an assignable attribute type with ID `validAttributeTypeID`, and
  * an initial balance of `initialBalance`.
  * @param registry address The account of the associated attribute registry.  
  * @param validAttributeTypeID uint256 The ID of the required attribute type.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validAttributeTypeID
  ) public TPLERC20RestrictedReceiver(registry, validAttributeTypeID) {
    registry;
  }

  modifier over21() {
    require(
      _registry.hasAttribute(msg.sender, _validAttributeTypeID),
      "You must be over 21 to use Drink Token."
    );
    _;
  }

  function fermint() external over21 {
    _mint(msg.sender, 1);
  }

  function liquidate() external over21 {
    _burn(msg.sender, 1);
    emit PourDrink(msg.sender);
  }
}