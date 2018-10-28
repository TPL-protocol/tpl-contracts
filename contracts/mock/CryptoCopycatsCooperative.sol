pragma solidity ^0.4.25;

import "../examples/validator/TPLBasicValidator.sol";
import "../AttributeRegistryInterface.sol";


/**
 * @title An instance of TPLBasicValidator with external functions to add and
 * revoke attributes.
 */
contract CryptoCopycatsCooperative is TPLBasicValidator {

  string public name = "Crypto Copycats Cooperative";

  mapping(address => bool) private _careCoordinator;

  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry` and an assignable attribute type with ID `validAttributeTypeID`.
  * @param registry address The account of the associated attribute registry.  
  * @param validAttributeTypeID uint256 The ID of the required attribute type.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validAttributeTypeID
  ) public TPLBasicValidator(registry, validAttributeTypeID) {
    _careCoordinator[msg.sender] = true;
  }

  modifier onlyCareCoordinators() {
    require(
      _careCoordinator[msg.sender],
      "This method may only be called by a care coordinator."
    );
    _;
  }

  function addCareCoordinator(address account) external onlyCareCoordinators {
    _careCoordinator[account] = true;
  }

  /**
   * @notice Issue an attribute of the type with the default ID to `msg.sender`
   * on the jurisdiction. Values are left at zero.
   */  
  function issueAttribute(
    bool doYouLoveCats,
    bool doYouLoveDogsMoreThanCats,
    bool areYouACrazyCatLady
  ) external {
    require(doYouLoveCats, "only cat lovers allowed");
    require(doYouLoveDogsMoreThanCats, "no liars allowed");
    require(!areYouACrazyCatLady, "we are very particular");
    require(_issueAttribute(msg.sender));
  }

  /**
   * @notice Revoke an attribute from the type with the default ID from
   * `msg.sender` on the jurisdiction.
   */  
  function revokeAttribute(address account) external onlyCareCoordinators {
    require(_revokeAttribute(account));
  }
}