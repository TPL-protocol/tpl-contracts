pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/ECRecovery.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './Registry.sol';
import './JurisdictionInterface.sol';

contract Jurisdiction is Ownable, Registry, JurisdictionInterface {
  using ECRecovery for bytes32;
  using SafeMath for uint256;

  // declare events (NOTE: consider which fields should be indexed)
  event AttributeTypeAdded(uint256 indexed attribute, string description);
  event AttributeTypeRemoved(uint256 indexed attribute);
  event ValidatorAdded(address indexed validator, string description);
  event ValidatorRemoved(address indexed validator);
  event ValidatorApprovalAdded(address validator, uint256 indexed attribute);
  event ValidatorApprovalRemoved(address validator, uint256 indexed attribute);
  event ValidatorSigningKeyModified(address indexed validator, address newSigningKey);
  event AttributeAdded(address validator, address indexed attributee, uint256 attribute);
  event AttributeRemoved(address validator, address indexed attributee, uint256 attribute);
  // NOTE: consider event on value transfers: fees, stake, & transaction rebates

  // validators are entities who can add or authorize addition of new attributes
  struct Validator {
    bool exists;
    address signingKey;
    string description;
  }

  // attributes are properties that validators associate with specific addresses
  // NOTE: consider including an optional registry address, where value is an ID
  struct Attribute {
    bool exists;
    bool setUsingSignature;
    uint256 value;
    uint256 stake;
    // bytes extraData;  // consider including to provide additional flexibility
  }

  // attributes also have associated metadata - data common to an attribute type
  struct AttributeMetadata {
    bool exists;
    bool restricted;
    uint240 index;
    uint256 minimumStake;
    // uint256 jurisdictionFee; // consider to enable payments to jurisdiction
    string description;
    mapping(address => bool) approvedValidators;
  }

  // top-level information about attribute types is held in a mapping of structs
  mapping(uint256 => AttributeMetadata) attributeTypes;

  // each address in the jurisdiction has attributes originating from validators
  mapping(address => mapping(uint256 => address)) attributeValidators;

  // each validator in the jurisdiction has addresses with assigned attributes
  mapping(address => mapping(address => mapping(uint256 => Attribute))) attributes;

  // there is also a mapping to identify all approved validators and their keys
  mapping(address => Validator) validators;

  // each registered signing key maps back to a specific validator
  mapping(address => address) signingKeys;

  // once attribute types are assigned to an ID, they cannot be modified
  mapping(uint256 => bytes32) attributeTypeHashes;

  // submitted attribute approvals are retained to prevent reuse after removal 
  mapping(bytes32 => bool) usedAttributeApprovalHashes;

  // IDs for all supplied attributes are held in an array (enables enumeration)
  uint256[] attributeIds;

  // the contract owner may declare attributes recognized by the jurisdiction
  function addAttributeType(
    uint256 _id,
    bool _restrictedAccess,
    uint256 _minimumStake,
    string _description
  ) external onlyOwner {
    // prevent existing attributes with the same id from being overwritten
    require(
      isDesignatedAttribute(_id) == false,
      "an attribute type with the provided ID already exists"
    );

    // calculate a hash of the attribute type based on the type's properties
    bytes32 hash = keccak256(
      abi.encodePacked(
        address(this), _id, _restrictedAccess, _minimumStake, _description
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
      restricted: _restrictedAccess, // when true: users can't remove attribute
      index: uint240(attributeIds.length),
      minimumStake: _minimumStake, // when > 0: users must stake ether to set
      description: _description
      // NOTE: no approvedValidators variable declaration - must be added later
    });
    
    // add the attribute id to the end of the attributeId array
    attributeIds.push(_id);

    // log the addition of the attribute type
    emit AttributeTypeAdded(_id, _description);
  }

  // the owner may also remove attributes - necessary first step before updating
  function removeAttributeType(uint256 _id) external onlyOwner {
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
    
    // remove the (now duplicate) attribute ID at the end and trim the array
    delete attributeIds[attributeIds.length.sub(1)];
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
  ) external onlyOwner {
    // NOTE: a jurisdiction can add itself as a validator if desired
    // check that an empty address was not provided by mistake
    require(_validator != address(0), "must supply a valid address");

    // prevent existing validators from being overwritten
    require(
      isValidator(_validator) == false,
      "a validator with the provided address already exists"
    );

    // prevent duplicate signing keys from being created
    require(
      signingKeys[_validator] == address(0),
      "a signing key matching the provided address already exists"
    );
    
    // create a record for the validator
    validators[_validator] = Validator({
      exists: true,
      signingKey: _validator, // set initial signing key to controlling address
      description: _description
    });

    // set the initial signing key (the validator's address) resolving to itself
    signingKeys[_validator] = _validator;
    
    // log the addition of the new validator
    emit ValidatorAdded(_validator, _description);
  }

  // the jurisdiction can remove validators, invalidating submitted attributes
  function removeValidator(address _validator) external onlyOwner {
    // check that a validator exists at the provided address
    require(
      isValidator(_validator),
      "unable to remove, no validator located at the provided address"
    );

    // remove the validator's signing key from its mapping
    delete signingKeys[validators[_validator].signingKey];

    // remove the validator record
    delete validators[_validator];

    // NOTE: turns out that `delete attributes[_validator]` won't work unless an
    // additional array of attributes on each validator is stored alongside, see 
    // https://ethereum.stackexchange.com/questions/15553/how-to-delete-a-mapping
    // Moreover, it's probably best to retain this data anyway, since it would
    // still be used to locate and reclaim staked funds in invalid attributes.

    // log the removal of the validator
    emit ValidatorRemoved(_validator);
  }

  // the jurisdiction approves validators to assign predefined attributes
  function addValidatorApproval(
    address _validator,
    uint256 _attribute
  ) external onlyOwner {
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

    // log the addition of the validator's attribute type approval
    emit ValidatorApprovalAdded(_validator, _attribute);
  }

  // the jurisdiction may remove a validator's ability to approve an attribute
  function removeValidatorApproval(
    address _validator,
    uint256 _attribute
  ) external onlyOwner {
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

  function modifyValidatorSigningKey(address _newSigningKey) external {
    // NOTE: consider having the validator submit a signed proof demonstrating
    // that the provided signing key is indeed a signing key in their control -
    // this helps mitigate the fringe attack vector where a validator could set
    // the address of another validator candidate (especially in the case of a
    // deployed smart contract) as their "signing key" in order to block them
    // from being added to the jurisdiction (due to the required property of 
    // signing keys being unique, coupled with the fact that new validators are
    // set up with their address as the default initial signing key).
    require(
      isValidator(msg.sender),
      "only validators may modify validator signing keys");
 
    // prevent duplicate signing keys from being created
    require(
      signingKeys[_newSigningKey] == address(0),
      "a signing key matching the provided address already exists"
    );

    // remove validator address as the resolved value for the old key
    delete signingKeys[validators[msg.sender].signingKey];

    // set the signing key to the new value
    validators[msg.sender].signingKey = _newSigningKey;

    // add validator address as the resolved value for the new key
    signingKeys[_newSigningKey] = msg.sender;

    // log the modification of the signing key
    emit ValidatorSigningKeyModified(msg.sender, _newSigningKey);
  }

  // users of the jurisdiction add attributes by including a validator signature
  function addAttribute(
    uint256 _attribute,
    uint256 _value,
    bytes _signature
  ) external payable {
    // NOTE: determine best course of action when the attribute already exists
    // NOTE: consider utilizing bytes32 type for attributes and values
    // NOTE: does not currently support an extraData parameter, consider adding
    // NOTE: does not currently support assigning an operator to set attributes
    // NOTE: consider including _validatorFee and _jurisdictionFee arguments
    // NOTE: if msg.sender is a proxy contract, its ownership may be transferred
    // at will, circumventing any token transfer restrictions. Restricting usage
    // to only externally owned accounts may partially alleviate this concern.
    // NOTE: cosider including a salt (or better, nonce) parameter so that when
    // a user adds an attribute, then it gets revoked, the user can get a new
    // signature from the validator and renew the attribute using that. The main
    // downside is that everyone will have to keep track of the extra parameter.
    // Another solution is to just modifiy the required staked amount slightly!

    require(
      msg.value >= attributeTypes[_attribute].minimumStake,
      "attribute requires a greater staked value than is currently provided"
    );

    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 msgHash = keccak256(
      abi.encodePacked(address(this), msg.sender, msg.value, _attribute, _value)
    );

    require(
      usedAttributeApprovalHashes[msgHash] == false,
      "signed attribute approvals from validators may not be reused"
    );

    // extract the key used to sign the message hash
    address signingKey = msgHash.toEthSignedMessageHash().recover(_signature);

    // retrieve the validator who controls the extracted key
    address validator = signingKeys[signingKey];

    require(
      canValidate(validator, _attribute),
      "signature does not match an approved validator for provided attribute"
    );

    require(
      attributeValidators[msg.sender][_attribute] == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][msg.sender][_attribute].exists
    // and update value / increment stake if the validator is the same?

    // store the attribute's validator for identifying the validating scope
    attributeValidators[msg.sender][_attribute] = validator;

    // store attribute value and amount of ether staked in correct scope
    attributes[validator][msg.sender][_attribute] = Attribute({
      exists: true,
      setUsingSignature: true,
      value: _value,
      stake: msg.value
      // NOTE: no extraData included
    });

    // flag the signed approval used to assign the attribute as having been used
    usedAttributeApprovalHashes[msgHash] = true;

    // log the addition of the attribute
    emit AttributeAdded(validator, msg.sender, _attribute);
  }

  // approved validators may also add attributes directly to a specified address
  function addAttributeTo(
    address _who,
    uint256 _attribute,
    uint256 _value
  ) external payable {
    // NOTE: determine best course of action when the attribute already exists
    // NOTE: consider utilizing bytes32 type for attributes and values
    // NOTE: the jurisdiction may set itself as a validator to add attributes
    // NOTE: staking is still an option when adding an attribute directly, as it
    // could still be enforced if the jurisdiction wants to be able to revoke
    // attributes and rebate the transaction fee.
    // NOTE: if msg.sender is a proxy contract, its ownership may be transferred
    // at will, circumventing any token transfer restrictions. Restricting usage
    // to only externally owned accounts may partially alleviate this concern.
    // NOTE: if an attribute type requires a minimum stake and the validator is
    // the one to pay it, they will be refunded instead of the attribute holder.
    require(
      canValidate(msg.sender, _attribute),
      "only approved validators may assign attributes of this type"
    );

    require(
      attributeValidators[_who][_attribute] == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][msg.sender][_attribute].exists
    // and update value / increment stake if the validator is the same?

    require(
      msg.value >= attributeTypes[_attribute].minimumStake,
      "attribute requires a greater staked value than is currently provided"
    );

    // store the attribute's validator for identifying the validating scope
    attributeValidators[_who][_attribute] = msg.sender;

    // store attribute value and amount of ether staked in correct scope
    attributes[msg.sender][_who][_attribute] = Attribute({
      exists: true,
      setUsingSignature: false,
      value: _value,
      stake: msg.value
      // NOTE: no extraData included
    });

    // log the addition of the attribute
    emit AttributeAdded(msg.sender, _who, _attribute);
  }

  // users may remove their own attributes from the jurisdiction at any time
  function removeAttribute(uint256 _attribute) external {
    // attributes may only be removed by the user if they are not restricted
    require(
      attributeTypes[_attribute].restricted == false,
      "only jurisdiction or issuing validator may remove a restricted attribute"
    );

    // determine the assigned validator on the user attribute
    address validator = attributeValidators[msg.sender][_attribute];

    require(
      attributes[validator][msg.sender][_attribute].exists == true,
      "only existing attributes may be removed"
    );

    // determine if the attribute has a staked value
    uint256 stake = attributes[validator][msg.sender][_attribute].stake;

    // determine the correct address to refund the staked amount to
    address refundAddress;
    if (attributes[validator][msg.sender][_attribute].setUsingSignature) {
      refundAddress = msg.sender;
    } else {
      refundAddress = validator;
    }
    
    // remove the registered validator for the user attribute
    delete attributeValidators[msg.sender][_attribute];

    // remove the attribute from the user address
    delete attributes[validator][msg.sender][_attribute];

    // log the removal of the attribute
    emit AttributeRemoved(validator, msg.sender, _attribute);

    // if the attribute has any staked balance, refund it to the user
    if (stake > 0 && address(this).balance >= stake) {
      // NOTE: send is chosen over transfer to prevent cases where a malicious
      // fallback function could forcibly block an attribute's removal
      refundAddress.send(stake);
    }
  }

  // the jurisdiction owner and issuing validators may also remove attributes
  function removeAttributeFrom(address _who, uint256 _attribute) external {
    // determine the assigned validator on the user attribute
    address validator = attributeValidators[_who][_attribute];
    
    // caller must be either the jurisdiction owner or the assigning validator
    require(
      msg.sender == owner || msg.sender == validator,
      "only jurisdiction or issuing validators may revoke arbitrary attributes"
    );

    require(
      attributes[validator][_who][_attribute].exists == true,
      "only existing attributes may be removed"
    );

    // determine if attribute has any stake in order to refund transaction fee
    uint256 stake = attributes[validator][_who][_attribute].stake;

    // determine the correct address to refund the staked amount to
    address refundAddress;
    if (attributes[validator][msg.sender][_attribute].setUsingSignature) {
      refundAddress = _who;
    } else {
      refundAddress = validator;
    }

    // remove the registered validator for the user attribute
    delete attributeValidators[_who][_attribute];

    // remove the attribute from the designated user address
    delete attributes[validator][_who][_attribute];

    // log the removal of the attribute
    emit AttributeRemoved(validator, _who, _attribute);

    // pay out any refunds and return the excess stake to the user
    if (stake > 0 && address(this).balance >= stake) {
      // NOTE: send is chosen over transfer to prevent cases where a malicious
      // fallback function could forcibly block an attribute's removal. Another
      // option is to allow a user to pull the staked amount after the removal.
      // NOTE: refine transaction rebate gas calculation! Setting this value too
      // high gives validators the incentive to revoke valid attributes. Simply
      // checking against gasLeft() & adding the final gas usage won't give the
      // correct transaction cost, as freeing space refunds gas upon completion.
      uint256 transactionGas = 139000; // <--- WARNING: THIS IS APPROXIMATE
      uint256 transactionCost = transactionGas.mul(tx.gasprice);

      // if stake exceeds allocated transaction cost, refund user the difference
      if (stake > transactionCost) {
        // refund the excess stake to the address that contributed the funds
        refundAddress.send(stake.sub(transactionCost));

        // refund the cost of the transaction to the trasaction submitter
        tx.origin.send(transactionCost);

      // otherwise, allocate entire stake to partially refunding the transaction
      } else if (stake > 0 && address(this).balance >= stake) {
        tx.origin.send(stake);
      }
    }

  }  

  // external interface for determining the existence of an attribute
  function hasAttribute(
    address _who, 
    uint256 _attribute
  ) external view returns (bool) {
    address validator = attributeValidators[_who][_attribute];
    if (canValidate(validator, _attribute) == false) {
      return false;
    }

    return attributes[validator][_who][_attribute].exists;
  }

  // external interface for getting the value of an attribute
  function getAttribute(
    address _who,
    uint256 _attribute
  ) external view returns (uint256 value) {
    // NOTE: attributes with no validator will register as having a value of 0
    address validator = attributeValidators[_who][_attribute];
    if (canValidate(validator, _attribute) == false) {
      return 0;
    }
    return attributes[validator][_who][_attribute].value;
  }

  // external interface for getting the description of an attribute by ID
  function getAttributeInformation(
    uint256 _attribute
  ) external view returns (
    string description, bool isRestricted, uint256 minimumRequiredStake
  ) {
    return (
      attributeTypes[_attribute].description,
      attributeTypes[_attribute].restricted,
      attributeTypes[_attribute].minimumStake
    );
  }

  // external interface for getting the list of all available attributes by ID
  function getAvailableAttributes() external view returns (uint256[]) {
    return attributeIds;
  }

  // external interface for determining the validator of an issued attribute
  function getAttributeValidator(
    address _who,
    uint256 _attribute
  ) external view returns (
    address validator,
    bool isStillValid
  ) {
    return (
      attributeValidators[_who][_attribute],
      canValidate(attributeValidators[_who][_attribute], _attribute)
    );
  }

  // users can check whether a signature for adding an attribute is still valid
  function canAddAttribute(
    uint256 _attribute,
    uint256 _value,
    uint256 _stake,
    bytes _signature
  ) external view returns (bool) {
    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 msgHash = keccak256(
      abi.encodePacked(address(this), msg.sender, _stake, _attribute, _value)
    );

    address signingKey = msgHash.toEthSignedMessageHash().recover(_signature);
    address validator = signingKeys[signingKey];

    return (
      _stake >= attributeTypes[_attribute].minimumStake &&
      usedAttributeApprovalHashes[msgHash] == false &&
      canValidate(validator, _attribute)
    );
  }

  // ERC-165 support (pure function - will produce a compiler warning)
  function supportsInterface(bytes4 _interfaceID) external view returns (bool) {
    return (
      _interfaceID == this.supportsInterface.selector || // ERC165
      _interfaceID == this.hasAttribute.selector
                      ^ this.getAttribute.selector
                      ^ this.getAvailableAttributes.selector // Registry
    ); // 0x01ffc9a7 || 0x13a51fda
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
  ) public view returns (bool) {
    return (
      isValidator(_validator) &&
      isDesignatedAttribute(_attribute) &&
      attributeTypes[_attribute].approvedValidators[_validator]
    );
  }

}