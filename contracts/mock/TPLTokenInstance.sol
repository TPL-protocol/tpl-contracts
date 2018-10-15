pragma solidity ^0.4.25;

import "../examples/ERC20Permissioned.sol";
import "../AttributeRegistryInterface.sol";

contract TPLTokenInstance is Initializable, ERC20Permissioned {
  // initialize token with a jurisdiction address and an initial token balance
  function initialize(
    uint256 _initialBalance,
    AttributeRegistryInterface _jurisdictionAddress,
    uint256 _validRecipientAttributeId
  )
    initializer
    public
  {
    ERC20Permissioned.initialize(
      _jurisdictionAddress,
      _validRecipientAttributeId
    );

    _mint(msg.sender, _initialBalance);
  }

}