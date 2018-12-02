pragma solidity ^0.4.25;

import "../../ExtendedJurisdiction.sol";


/**
 * @title A contract that will reject payments sent to it.
 */
contract PaymentRejector {
  ExtendedJurisdiction private _jurisdiction;

  constructor(address jurisdiction) public {
    _jurisdiction = ExtendedJurisdiction(jurisdiction);
  }

  function relinquishOwnership(address newOwner) public {
    _jurisdiction.transferOwnership(newOwner);
  }

  function setValidatorSigningKey(address newKey) public {
    _jurisdiction.setValidatorSigningKey(newKey);
  }

  function addAttributeFor(
    address account,
    uint256 attributeTypeID,
    uint256 value,
    uint256 validatorFee,
    bytes signature
  ) public payable {
    _jurisdiction.addAttributeFor.value(msg.value)(
      account,
      attributeTypeID,
      value,
      validatorFee,
      signature
    );
  }

  function removeAttributeFor(
    address account,
    uint256 attributeTypeID
  ) public {
    _jurisdiction.removeAttributeFor(
      account,
      attributeTypeID
    );
  }
}