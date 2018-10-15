pragma solidity ^0.4.25;

import "../examples/ERC20Permissioned.sol";
import "../AttributeRegistryInterface.sol";

contract TPLTokenInstance is Initializable, ERC20Permissioned {
  // initialize token with a jurisdiction address and an initial token balance
  function initialize(
    uint256 initialBalance,
    AttributeRegistryInterface jurisdictionAddress,
    uint256 validRecipientAttributeId
  )
    initializer
    public
  {
    ERC20Permissioned.initialize(
      jurisdictionAddress,
      validRecipientAttributeId
    );

    _mint(msg.sender, initialBalance);
  }

}