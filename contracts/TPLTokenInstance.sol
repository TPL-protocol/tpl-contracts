pragma solidity ^0.4.24;

import "./TPLToken.sol";
import "./AttributeRegistry.sol";

contract TPLTokenInstance is Initializable, TPLToken {
  // initialize token with a jurisdiction address and an initial token balance
  function initialize(
    uint256 _initialBalance,
    AttributeRegistry _jurisdictionAddress,
    uint256 _validRecipientAttributeId
  )
    initializer
    public
  {
    TPLToken.initialize(
      _jurisdictionAddress,
      _validRecipientAttributeId
    );

    _mint(msg.sender, _initialBalance);
  }

}