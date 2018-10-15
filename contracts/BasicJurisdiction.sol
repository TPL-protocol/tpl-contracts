pragma solidity ^0.4.25;

import "openzeppelin-zos/contracts/Initializable.sol";
import "openzeppelin-zos/contracts/math/SafeMath.sol";
import "openzeppelin-zos/contracts/ownership/Ownable.sol";
import "openzeppelin-zos/contracts/lifecycle/Pausable.sol";
import "./AttributeRegistryInterface.sol";
import "./BasicJurisdictionInterface.sol";

contract BasicJurisdiction is Initializable, Ownable, Pausable, AttributeRegistryInterface, BasicJurisdictionInterface {
  using SafeMath for uint256;

  // validators are entities who can add or authorize addition of new attributes
  struct Validator {
    bool exists;
    uint256 index; // NOTE: consider use of uint248 to pack index with exists
    string description;
  }

  // attributes are properties that validators associate with specific addresses
  struct IssuedAttribute {
    bool exists;
    address validator;
    uint256 value;
  }

  // attributes also have associated type - metadata common to each attribute
  struct AttributeType {
    bool exists;
    uint256 index;  // NOTE: consider use of uint248 to pack index with exists
    string description;
    mapping(address => bool) approvedValidators;
  }

  // top-level information about attribute types is held in a mapping of structs
  mapping(uint256 => AttributeType) private _attributeTypes;

  // the jurisdiction retains a mapping of addresses with assigned attributes
  mapping(address => mapping(uint256 => IssuedAttribute)) private _issuedAttributes;

  // there is also a mapping to identify all approved validators and their keys
  mapping(address => Validator) private _validators;

  // once attribute types are assigned to an ID, they cannot be modified
  mapping(uint256 => bytes32) private _attributeTypeHashes;

  // attribute approvals by validator are held in a mapping
  mapping(address => uint256[]) private _validatorApprovals;

  // IDs for all supplied attributes are held in an array (enables enumeration)
  uint256[] private _attributeIDs;

  // addresses for all designated validators are also held in an array
  address[] private _validatorAccounts;

  // the initializer function
  function initialize() public initializer {
    Ownable.initialize(msg.sender);
    Pausable.initialize(msg.sender);
  }

  // the contract owner may declare attributes recognized by the jurisdiction
  function addAttributeType(
    uint256 ID,
    string description
  ) external onlyOwner whenNotPaused {
    // prevent existing attributes with the same id from being overwritten
    require(
      isAttributeType(ID) == false,
      "an attribute type with the provided ID already exists"
    );

    // calculate a hash of the attribute type based on the type's properties
    bytes32 hash = keccak256(
      abi.encodePacked(
        ID, false, false, description
      )
    );

    // store hash if attribute type is the first one registered with provided ID
    if (_attributeTypeHashes[ID] == bytes32(0)) {
      _attributeTypeHashes[ID] = hash;
    }

    // prevent addition if different attribute type with the same ID has existed
    require(
      hash == _attributeTypeHashes[ID],
      "attribute type properties must match initial properties assigned to ID"
    );

    // set the attribute mapping, assigning the index as the end of attributeId
    _attributeTypes[ID] = AttributeType({
      exists: true,
      index: _attributeIDs.length,
      description: description
      // NOTE: no approvedValidators variable declaration - must be added later
    });
    
    // add the attribute type id to the end of the attributeId array
    _attributeIDs.push(ID);

    // log the addition of the attribute type
    emit AttributeTypeAdded(ID, description);
  }

  // the owner may also remove attributes - necessary first step before updating
  function removeAttributeType(uint256 ID) external onlyOwner whenNotPaused {
    // if the attribute id does not exist, there is nothing to remove
    require(
      isAttributeType(ID),
      "unable to remove, no attribute type with the provided ID"
    );

    // get the attribute ID at the last index of the array
    uint256 lastAttributeID = _attributeIDs[_attributeIDs.length.sub(1)];

    // set the attributeId at attribute-to-delete.index to the last attribute ID
    _attributeIDs[_attributeTypes[ID].index] = lastAttributeID;

    // update the index of the attribute type that was moved
    _attributeTypes[lastAttributeID].index = _attributeTypes[ID].index;
    
    // remove the (now duplicate) attribute ID at the end by trimming the array
    _attributeIDs.length--;

    // delete the attribute type's record from the mapping
    delete _attributeTypes[ID];

    // log the removal of the attribute type
    emit AttributeTypeRemoved(ID);
  }

  // the jurisdiction can add new validators who can verify and sign attributes
  function addValidator(
    address validator,
    string description
  ) external onlyOwner whenNotPaused {
    // NOTE: a jurisdiction can add itself as a validator if desired
    // check that an empty address was not provided by mistake
    require(validator != address(0), "must supply a valid address");

    // prevent existing validators from being overwritten
    require(
      isValidator(validator) == false,
      "a validator with the provided address already exists"
    );
    
    // create a record for the validator
    _validators[validator] = Validator({
      exists: true,
      index: _validatorAccounts.length,
      description: description
    });

    // add the validator to the end of the _validatorAccounts array
    _validatorAccounts.push(validator);
    
    // log the addition of the new validator
    emit ValidatorAdded(validator, description);
  }

  // the jurisdiction can remove validators, invalidating submitted attributes
  function removeValidator(address validator) external onlyOwner whenNotPaused {
    // check that a validator exists at the provided address
    require(
      isValidator(validator),
      "unable to remove, no validator located at the provided address"
    );

    // first, start removing validator approvals until gas is exhausted
    while (_validatorApprovals[validator].length > 0 && gasleft() > 25000) {
      // locate the last attribute ID in the validator approval group
      uint256 lastAttributeId = _validatorApprovals[validator].length.sub(1);

      // remove the record of the approval from the associated attribute type
      delete _attributeTypes[_validatorApprovals[validator][lastAttributeId]].approvedValidators[validator];

      // drop the last attribute ID from the validator approval group
      _validatorApprovals[validator].length--;
    }

    // proceed if all approvals have been successfully removed
    if (_validatorApprovals[validator].length == 0) {
      // get the validator address at the last index of the array
      address lastAccount = _validatorAccounts[_validatorAccounts.length.sub(1)];

      // set the address at validator-to-delete.index to last validator address
      _validatorAccounts[_validators[validator].index] = lastAccount;

      // update the index of the attribute type that was moved
      _validators[lastAccount].index = _validators[validator].index;
      
      // remove (duplicate) validator address at the end by trimming the array
      _validatorAccounts.length--;

      // remove the validator record
      delete _validators[validator];

      // log the removal of the validator
      emit ValidatorRemoved(validator);
    }
  }

  // the jurisdiction approves validators to assign predefined attributes
  function addValidatorApproval(
    address validator,
    uint256 attributeTypeID
  ) external onlyOwner whenNotPaused {
    // check that the attribute is predefined and that the validator exists
    require(
      isValidator(validator) && isAttributeType(attributeTypeID),
      "must specify both a valid attribute and an available validator"
    );

    // check that the validator is not already approved
    require (
      _attributeTypes[attributeTypeID].approvedValidators[validator] == false,
      "validator is already approved on the provided attribute"
    );

    // set the validator approval status on the attribute
    _attributeTypes[attributeTypeID].approvedValidators[validator] = true;

    // include the attribute type in the validator approval mapping
    _validatorApprovals[validator].push(attributeTypeID);

    // log the addition of the validator's attribute type approval
    emit ValidatorApprovalAdded(validator, attributeTypeID);
  }

  // the jurisdiction may remove a validator's ability to approve an attribute
  function removeValidatorApproval(
    address validator,
    uint256 attributeTypeID
  ) external onlyOwner whenNotPaused {
    // check that the attribute is predefined and that the validator exists
    require(
      canValidate(validator, attributeTypeID),
      "unable to remove validator approval, attribute is already unapproved"
    );

    // remove the validator approval status from the attribute
    delete _attributeTypes[attributeTypeID].approvedValidators[validator];
    
    // log the removal of the validator's attribute type approval
    emit ValidatorApprovalRemoved(validator, attributeTypeID);
  }

  // approved validators may add attributes directly to a specified address
  function addAttributeTo(
    address account,
    uint256 attributeTypeID,
    uint256 value
  ) external payable whenNotPaused {
    // NOTE: determine best course of action when the attribute already exists
    // NOTE: consider utilizing bytes32 type for attributes and values
    // NOTE: the jurisdiction may set itself as a validator to add attributes
    // NOTE: if msg.sender is a proxy contract, its ownership may be transferred
    // at will, circumventing any token transfer restrictions. Restricting usage
    // to only externally owned accounts may partially alleviate this concern.
    require(
      msg.value == 0,
      "Basic jurisdictions do not support payments when assigning attributes"
    );

    require(
      canValidate(msg.sender, attributeTypeID),
      "only approved validators may assign attributes of this type"
    );

    require(
      _issuedAttributes[account][attributeTypeID].validator == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check _issuedAttributes[validator][msg.sender][_attribute].exists
    // and update value if the validator is the same?

    // store attribute value and amount of ether staked in correct scope
    _issuedAttributes[account][attributeTypeID] = IssuedAttribute({
      exists: true,
      validator: msg.sender,
      value: value
    });

    // log the addition of the attribute
    emit AttributeAdded(msg.sender, account, attributeTypeID, value);
  }

  // the jurisdiction owner and issuing validators may remove attributes
  function removeAttributeFrom(
    address account,
    uint256 attributeTypeID
  ) external whenNotPaused {
    // ensure that an attribute with the given address and attribute exists
    require(
      _issuedAttributes[account][attributeTypeID].exists,
      "only existing attributes may be removed"
    );

    // determine the assigned validator on the user attribute
    address validator = _issuedAttributes[account][attributeTypeID].validator;
    
    // caller must be either the jurisdiction owner or the assigning validator
    require(
      msg.sender == validator || msg.sender == owner(),
      "only jurisdiction or issuing validators may revoke arbitrary attributes"
    );

    // remove the attribute from the designated user address
    delete _issuedAttributes[account][attributeTypeID];

    // log the removal of the attribute
    emit AttributeRemoved(validator, account, attributeTypeID);
  }  

  // external interface for determining the existence of an attribute
  function hasAttribute(
    address account, 
    uint256 attributeTypeID
  ) external view returns (bool) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = _issuedAttributes[account][attributeTypeID].validator;
    return (
      _validators[validator].exists &&   // isValidator(validator)
      _attributeTypes[attributeTypeID].approvedValidators[validator] &&
      _attributeTypes[attributeTypeID].exists  // isAttributeType(attributeTypeID)    
    );
  }

  // external interface for getting the value of an attribute
  function getAttributeValue(
    address account,
    uint256 attributeTypeID
  ) external view returns (uint256 value) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = _issuedAttributes[account][attributeTypeID].validator;
    require (
      (
        _validators[validator].exists &&   // isValidator(validator)
        _attributeTypes[attributeTypeID].approvedValidators[validator] &&
        _attributeTypes[attributeTypeID].exists  // isAttributeType(attributeTypeID)
      ),
      "could not find an attribute value at the provided address and ID"
    );

    return _issuedAttributes[account][attributeTypeID].value;
  }

  // external interface to check if validator is approved to issue an attribute
  function canIssueAttributeType(
    address validator,
    uint256 attributeTypeID
  ) external view returns (bool) {
    return canValidate(validator, attributeTypeID);
  }

  // external interface for getting the description of an attribute by ID
  function getAttributeTypeInformation(
    uint256 attributeTypeID
  ) external view returns (
    string description
  ) {
    return _attributeTypes[attributeTypeID].description;
  }

  // external interface for getting the description of a validator by ID
  function getValidatorInformation(
    address validator
  ) external view returns (
    string description
  ) {
    return _validators[validator].description;
  }

  // external interface for determining the validator of an issued attribute
  function getAttributeValidator(
    address account,
    uint256 attributeTypeID
  ) external view returns (
    address validator,
    bool isStillValid
  ) {
    // NOTE: return the secondary source address if no validator is found?
    address validatorAccount = _issuedAttributes[account][attributeTypeID].validator;
    return (
      validatorAccount,
      canValidate(validatorAccount, attributeTypeID)
    );
  }

  // external interface for getting the number of available attribute types
  function countAttributeTypes() external view returns (uint256) {
    return _attributeIDs.length;
  }

  // external interface for getting an available attribute type's ID by index
  function getAttributeTypeID(uint256 index) external view returns (uint256) {
    return _attributeIDs[index];
  }

  // external interface for getting IDs of all available attribute types
  function getAttributeTypeIDs() external view returns (uint256[]) {
    return _attributeIDs;
  }

  // external interface for getting the number of designated validators
  function countValidators() external view returns (uint256) {
    return _validatorAccounts.length;
  }

  // external interface for getting a validator's address by index
  function getValidator(
    uint256 index
  ) external view returns (address) {
    return _validatorAccounts[index];
  }

  // external interface for getting the list of all validators by address
  function getValidators() external view returns (address[]) {
    return _validatorAccounts;
  }

  // ERC-165 support (pure function - will produce a compiler warning)
  function supportsInterface(bytes4 interfaceID) external view returns (bool) {
    return (
      interfaceID == this.supportsInterface.selector || // ERC165
      interfaceID == this.hasAttribute.selector // AttributeRegistryInterface
                     ^ this.getAttributeValue.selector
                     ^ this.countAttributeTypes.selector
                     ^ this.getAttributeTypeID.selector 
    ); // 0x01ffc9a7 || 0x5f46473f
  }

  // helper function, determine if a given ID corresponds to an attribute type
  function isAttributeType(uint256 attributeTypeID) public view returns (bool) {
    return _attributeTypes[attributeTypeID].exists;
  }

  // helper function, determine if a given address corresponds to a validator
  function isValidator(address account) public view returns (bool) {
    return _validators[account].exists;
  }

  // helper function, checks if a validator is approved to assign an attribute
  function canValidate(
    address validator,
    uint256 attributeTypeID
  ) internal view returns (bool) {
    return (
      _validators[validator].exists &&   // isValidator(validator)
      _attributeTypes[attributeTypeID].approvedValidators[validator] &&
      _attributeTypes[attributeTypeID].exists // isAttributeType(attributeTypeID)
    );
  }
}