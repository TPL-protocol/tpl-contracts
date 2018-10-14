pragma solidity ^0.4.24;

import "openzeppelin-zos/contracts/Initializable.sol";
import 'openzeppelin-zos/contracts/math/SafeMath.sol';
import 'openzeppelin-zos/contracts/ownership/Ownable.sol';
import 'openzeppelin-zos/contracts/lifecycle/Pausable.sol';
import './AttributeRegistry.sol';
import './BasicJurisdictionInterface.sol';

contract BasicJurisdiction is Initializable, Ownable, Pausable, AttributeRegistry, BasicJurisdictionInterface {
  using SafeMath for uint256;

  // declare events (NOTE: consider which fields should be indexed)
  event AttributeTypeAdded(uint256 indexed attribute, string description);
  event AttributeTypeRemoved(uint256 indexed attribute);
  event ValidatorAdded(address indexed validator, string description);
  event ValidatorRemoved(address indexed validator);
  event ValidatorApprovalAdded(address validator, uint256 indexed attribute);
  event ValidatorApprovalRemoved(address validator, uint256 indexed attribute);
  event AttributeAdded(
    address validator,
    address indexed attributee,
    uint256 attribute
  );
  event AttributeRemoved(
    address validator,
    address indexed attributee,
    uint256 attribute
  );

  // validators are entities who can add or authorize addition of new attributes
  struct Validator {
    bool exists;
    uint256 index; // NOTE: consider use of uint248 to pack index with exists
    string description;
  }

  // attributes are properties that validators associate with specific addresses
  struct Attribute {
    bool exists;
    address validator;
    uint256 value;
  }

  // attributes also have associated metadata - data common to an attribute type
  struct AttributeMetadata {
    bool exists;
    uint256 index;  // NOTE: consider use of uint248 to pack index with exists
    string description;
    mapping(address => bool) approvedValidators;
  }

  // top-level information about attribute types is held in a mapping of structs
  mapping(uint256 => AttributeMetadata) attributeTypes;

  // the jurisdiction retains a mapping of addresses with assigned attributes
  mapping(address => mapping(uint256 => Attribute)) attributes;

  // there is also a mapping to identify all approved validators and their keys
  mapping(address => Validator) validators;

  // once attribute types are assigned to an ID, they cannot be modified
  mapping(uint256 => bytes32) attributeTypeHashes;

  // attribute approvals by validator are held in a mapping
  mapping(address => uint256[]) validatorApprovals;

  // IDs for all supplied attributes are held in an array (enables enumeration)
  uint256[] attributeIds;

  // addresses for all designated validators are also held in an array
  address[] validatorAddresses;

  // the initializer function
  function initialize() initializer public {
    Ownable.initialize(msg.sender);
    Pausable.initialize(msg.sender);
  }

  // the contract owner may declare attributes recognized by the jurisdiction
  function addAttributeType(
    uint256 _id,
    string _description
  ) external onlyOwner whenNotPaused {
    // prevent existing attributes with the same id from being overwritten
    require(
      isDesignatedAttribute(_id) == false,
      "an attribute type with the provided ID already exists"
    );

    // calculate a hash of the attribute type based on the type's properties
    bytes32 hash = keccak256(
      abi.encodePacked(
        _id, false, false, _description
      )
    );

    // store hash if attribute type is the first one registered with provided ID
    if (attributeTypeHashes[_id] == bytes32(0)) {
      attributeTypeHashes[_id] = hash;
    }

    // prevent addition if different attribute type with the same ID has existed
    require(
      hash == attributeTypeHashes[_id],
      'attribute type properties must match initial properties assigned to ID'
    );

    // set the attribute mapping, assigning the index as the end of attributeId
    attributeTypes[_id] = AttributeMetadata({
      exists: true,
      index: attributeIds.length,
      description: _description
      // NOTE: no approvedValidators variable declaration - must be added later
    });
    
    // add the attribute id to the end of the attributeId array
    attributeIds.push(_id);

    // log the addition of the attribute type
    emit AttributeTypeAdded(_id, _description);
  }

  // the owner may also remove attributes - necessary first step before updating
  function removeAttributeType(uint256 _id) external onlyOwner whenNotPaused {
    // if the attribute id does not exist, there is nothing to remove
    require(
      isDesignatedAttribute(_id),
      "unable to remove, no attribute type with the provided ID"
    );

    // get the attribute ID at the last index of the array
    uint256 lastAttributeId = attributeIds[attributeIds.length.sub(1)];

    // set the attributeId at attribute-to-delete.index to the last attribute ID
    attributeIds[attributeTypes[_id].index] = lastAttributeId;

    // update the index of the attribute type that was moved
    attributeTypes[lastAttributeId].index = attributeTypes[_id].index;
    
    // remove the (now duplicate) attribute ID at the end by trimming the array
    attributeIds.length--;

    // delete the attribute type's record from the mapping
    delete attributeTypes[_id];

    // log the removal of the attribute type
    emit AttributeTypeRemoved(_id);
  }

  // the jurisdiction can add new validators who can verify and sign attributes
  function addValidator(
    address _validator,
    string _description
  ) external onlyOwner whenNotPaused {
    // NOTE: a jurisdiction can add itself as a validator if desired
    // check that an empty address was not provided by mistake
    require(_validator != address(0), "must supply a valid address");

    // prevent existing validators from being overwritten
    require(
      isValidator(_validator) == false,
      "a validator with the provided address already exists"
    );
    
    // create a record for the validator
    validators[_validator] = Validator({
      exists: true,
      index: validatorAddresses.length,
      description: _description
    });

    // add the validator to the end of the validatorAddresses array
    validatorAddresses.push(_validator);
    
    // log the addition of the new validator
    emit ValidatorAdded(_validator, _description);
  }

  // the jurisdiction can remove validators, invalidating submitted attributes
  function removeValidator(address _validator) external onlyOwner whenNotPaused {
    // check that a validator exists at the provided address
    require(
      isValidator(_validator),
      "unable to remove, no validator located at the provided address"
    );

    // first, start removing validator approvals until gas is exhausted
    while (validatorApprovals[_validator].length > 0 && gasleft() > 25000) {
      // locate the last attribute ID in the validator approval group
      uint256 lastAttributeId = validatorApprovals[_validator].length.sub(1);

      // remove the record of the approval from the associated attribute type
      delete attributeTypes[validatorApprovals[_validator][lastAttributeId]].approvedValidators[_validator];

      // drop the last attribute ID from the validator approval group
      validatorApprovals[_validator].length--;
    }

    // proceed if all approvals have been successfully removed
    if (validatorApprovals[_validator].length == 0) {
      // get the validator address at the last index of the array
      address lastAddress = validatorAddresses[validatorAddresses.length.sub(1)];

      // set the address at validator-to-delete.index to last validator address
      validatorAddresses[validators[_validator].index] = lastAddress;

      // update the index of the attribute type that was moved
      validators[lastAddress].index = validators[_validator].index;
      
      // remove (duplicate) validator address at the end by trimming the array
      validatorAddresses.length--;

      // remove the validator record
      delete validators[_validator];

      // log the removal of the validator
      emit ValidatorRemoved(_validator);
    }
  }

  // the jurisdiction approves validators to assign predefined attributes
  function addValidatorApproval(
    address _validator,
    uint256 _attribute
  ) external onlyOwner whenNotPaused {
    // check that the attribute is predefined and that the validator exists
    require(
      isValidator(_validator) && isDesignatedAttribute(_attribute),
      "must specify both a valid attribute and an available validator"
    );

    // check that the validator is not already approved
    require (
      attributeTypes[_attribute].approvedValidators[_validator] == false,
      "validator is already approved on the provided attribute"
    );

    // set the validator approval status on the attribute
    attributeTypes[_attribute].approvedValidators[_validator] = true;

    // include the attribute type in the validator approval mapping
    validatorApprovals[_validator].push(_attribute);

    // log the addition of the validator's attribute type approval
    emit ValidatorApprovalAdded(_validator, _attribute);
  }

  // the jurisdiction may remove a validator's ability to approve an attribute
  function removeValidatorApproval(
    address _validator,
    uint256 _attribute
  ) external onlyOwner whenNotPaused {
    // check that the attribute is predefined and that the validator exists
    require(
      canValidate(_validator, _attribute),
      "unable to remove validator approval, attribute is already unapproved"
    );

    // remove the validator approval status from the attribute
    delete attributeTypes[_attribute].approvedValidators[_validator];
    
    // log the removal of the validator's attribute type approval
    emit ValidatorApprovalRemoved(_validator, _attribute);
  }


  // approved validators may add attributes directly to a specified address
  function addAttributeTo(
    address _who,
    uint256 _attribute,
    uint256 _value
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
      canValidate(msg.sender, _attribute),
      "only approved validators may assign attributes of this type"
    );

    require(
      attributes[_who][_attribute].validator == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][msg.sender][_attribute].exists
    // and update value if the validator is the same?

    // store attribute value and amount of ether staked in correct scope
    attributes[_who][_attribute] = Attribute({
      exists: true,
      validator: msg.sender,
      value: _value
    });

    // log the addition of the attribute
    emit AttributeAdded(msg.sender, _who, _attribute);
  }

  // the jurisdiction owner and issuing validators may remove attributes
  function removeAttributeFrom(
    address _who,
    uint256 _attribute
  ) external whenNotPaused {
    // ensure that an attribute with the given address and attribute exists
    require(
      attributes[_who][_attribute].exists,
      "only existing attributes may be removed"
    );

    // determine the assigned validator on the user attribute
    address validator = attributes[_who][_attribute].validator;
    
    // caller must be either the jurisdiction owner or the assigning validator
    require(
      msg.sender == validator || msg.sender == owner(),
      "only jurisdiction or issuing validators may revoke arbitrary attributes"
    );

    // remove the attribute from the designated user address
    delete attributes[_who][_attribute];

    // log the removal of the attribute
    emit AttributeRemoved(validator, _who, _attribute);
  }  

  // external interface for determining the existence of an attribute
  function hasAttribute(
    address _who, 
    uint256 _attribute
  ) external view returns (bool) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = attributes[_who][_attribute].validator;
    return (
      validators[validator].exists &&   // isValidator(validator)
      attributeTypes[_attribute].approvedValidators[validator] &&
      attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)    
    );
  }

  // external interface for getting the value of an attribute
  function getAttribute(
    address _who,
    uint256 _attribute
  ) external view returns (uint256 value) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = attributes[_who][_attribute].validator;
    require (
      (
        validators[validator].exists &&   // isValidator(validator)
        attributeTypes[_attribute].approvedValidators[validator] &&
        attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)
      ),
      "could not find an attribute value at the provided address and ID"
    );

    return attributes[_who][_attribute].value;
  }

  // external interface for getting the description of an attribute by ID
  function getAttributeInformation(
    uint256 _attribute
  ) external view returns (
    string description
  ) {
    return attributeTypes[_attribute].description;
  }

  // external interface for getting the description of a validator by ID
  function getValidatorInformation(
    address _validator
  ) external view returns (
    string description
  ) {
    return validators[_validator].description;
  }

  // external interface for getting the number of available attribute types
  function countAvailableAttributeIDs() external view returns (uint256) {
    return attributeIds.length;
  }

  // external interface for getting an available attribute type by ID
  function getAvailableAttributeID(uint256 _index) external view returns (uint256) {
    return attributeIds[_index];
  }

  // external interface for getting all available attribute types by ID
  function getAvailableAttributeIDs() external view returns (uint256[]) {
    return attributeIds;
  }

  // external interface for getting the number of designated validators
  function countAvailableValidators() external view returns (uint256) {
    return validatorAddresses.length;
  }

  // external interface for getting a validator's address by index
  function getAvailableValidator(
    uint256 _index
  ) external view returns (address) {
    return validatorAddresses[_index];
  }

  // external interface for getting the list of all validators by address
  function getAvailableValidators() external view returns (address[]) {
    return validatorAddresses;
  }

  // external interface to check if validator is approved to issue an attribute
  function isApproved(
    address _validator,
    uint256 _attribute
  ) external view returns (bool) {
    return canValidate(_validator, _attribute);
  }

  // external interface for determining the validator of an issued attribute
  function getAttributeValidator(
    address _who,
    uint256 _attribute
  ) external view returns (
    address validator,
    bool isStillValid
  ) {
    // NOTE: return the secondary source address if no validator is found?
    address validatorAddress = attributes[_who][_attribute].validator;
    return (
      validatorAddress,
      canValidate(validatorAddress, _attribute)
    );
  }

  // ERC-165 support (pure function - will produce a compiler warning)
  function supportsInterface(bytes4 _interfaceID) external view returns (bool) {
    return (
      _interfaceID == this.supportsInterface.selector || // ERC165
      _interfaceID == this.hasAttribute.selector // AttributeRegistry
                      ^ this.getAttribute.selector
                      ^ this.countAvailableAttributeIDs.selector
                      ^ this.getAvailableAttributeID.selector 
    ); // 0x01ffc9a7 || 0x8af1887e
  }

  // helper function, determine if a given ID corresponds to an attribute type
  function isDesignatedAttribute(uint256 _attribute) public view returns (bool) {
    return attributeTypes[_attribute].exists;
  }

  // helper function, determine if a given address corresponds to a validator
  function isValidator(address _who) public view returns (bool) {
    return validators[_who].exists;
  }

  // helper function, checks if a validator is approved to assign an attribute
  function canValidate(
    address _validator,
    uint256 _attribute
  ) internal view returns (bool) {
    return (
      validators[_validator].exists &&   // isValidator(_validator)
      attributeTypes[_attribute].approvedValidators[_validator] &&
      attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)
    );
  }
}