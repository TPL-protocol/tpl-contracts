pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/ECRecovery.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './AttributeRegistry.sol';
import './JurisdictionInterface.sol';

contract Jurisdiction is Ownable, AttributeRegistry, JurisdictionInterface {
  using ECRecovery for bytes32;
  using SafeMath for uint256;

  // declare events (NOTE: consider which fields should be indexed)
  event AttributeTypeAdded(uint256 indexed attribute, string description);
  event AttributeTypeRemoved(uint256 indexed attribute);
  event ValidatorAdded(address indexed validator, string description);
  event ValidatorRemoved(address indexed validator);
  event ValidatorApprovalAdded(address validator, uint256 indexed attribute);
  event ValidatorApprovalRemoved(address validator, uint256 indexed attribute);
  event ValidatorSigningKeyModified(
    address indexed validator,
    address newSigningKey
  );
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
  event StakeAllocated(
    address indexed staker,
    uint256 indexed attribute,
    uint256 amount
  );
  event StakeRefunded(
    address indexed staker,
    uint256 indexed attribute,
    uint256 amount
  );
  event FeePaid(
    address indexed recipient,
    address indexed payee,
    uint256 indexed attribute,
    uint256 amount
  );
  event TransactionRebatePaid(
    address indexed submitter,
    address indexed payee,
    uint256 indexed attribute,
    uint256 amount
  );

  // validators are entities who can add or authorize addition of new attributes
  struct Validator {
    bool exists;
    uint88 index;
    address signingKey;
    string description;
  }

  // attributes are properties that validators associate with specific addresses
  // NOTE: consider including an optional registry address, where value is an ID
  struct Attribute {
    bool exists;
    bool setPersonally;
    address operator;
    address validator;
    uint256 value;
    uint256 stake;
    // bytes extraData;  // consider including to provide additional flexibility
  }

  // attributes also have associated metadata - data common to an attribute type
  struct AttributeMetadata {
    bool exists;
    bool restricted;
    bool onlyPersonal;
    uint72 index;
    address secondarySource;
    uint256 secondaryId;
    uint256 minimumStake;
    uint256 jurisdictionFee;
    string description;
    mapping(address => bool) approvedValidators;
  }

  // top-level information about attribute types is held in a mapping of structs
  mapping(uint256 => AttributeMetadata) attributeTypes;

  // the jurisdiction retains a mapping of addresses with assigned attributes
  mapping(address => mapping(uint256 => Attribute)) attributes;

  // there is also a mapping to identify all approved validators and their keys
  mapping(address => Validator) validators;

  // each registered signing key maps back to a specific validator
  mapping(address => address) signingKeys;

  // once attribute types are assigned to an ID, they cannot be modified
  mapping(uint256 => bytes32) attributeTypeHashes;

  // submitted attribute approvals are retained to prevent reuse after removal 
  mapping(bytes32 => bool) invalidAttributeApprovalHashes;

  // IDs for all supplied attributes are held in an array (enables enumeration)
  uint256[] attributeIds;

  // addresses for all designated validators are also held in an array
  address[] validatorAddresses;

  // the contract owner may declare attributes recognized by the jurisdiction
  function addAttributeType(
    uint256 _id,
    bool _restrictedAccess,
    bool _onlyPersonal,
    address _secondarySource,
    uint256 _secondaryId,
    uint256 _minimumStake,
    uint256 _jurisdictionFee,
    string _description
  ) external onlyOwner {
    // prevent existing attributes with the same id from being overwritten
    require(
      isDesignatedAttribute(_id) == false,
      "an attribute type with the provided ID already exists"
    );

    // calculate a hash of the attribute type based on the type's properties
    // NOTE: _jurisdictionFee and _minimumRequiredStake can be left out, since
    // the jurisdiction can modify these properties without affecting existing
    // attributes - these properties only apply to assignment of new attributes.
    // NOTE: _secondarySource and _secondaryId are left out to support cases
    // where an external contract needs to be upgraded or replaced, but it is
    // important to be aware that, while local attribute values will not be
    // affected, remote values of course may be. 
    bytes32 hash = keccak256(
      abi.encodePacked(
        _id, _restrictedAccess, _onlyPersonal, _description
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
      onlyPersonal: _onlyPersonal, // when true: operators can't add attribute
      index: uint72(attributeIds.length),
      secondarySource: _secondarySource, // the address of a remote registry
      secondaryId: _secondaryId, // the attribute id to query on remote registry
      minimumStake: _minimumStake, // when > 0: users must stake ether to set
      jurisdictionFee: _jurisdictionFee,
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
      index: uint88(validatorAddresses.length),
      signingKey: _validator, // set initial signing key to controlling address
      description: _description
    });

    // set the initial signing key (the validator's address) resolving to itself
    signingKeys[_validator] = _validator;

    // add the validator to the end of the validatorAddresses array
    validatorAddresses.push(_validator);
    
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

    // get the validator address at the last index of the array
    address lastAddress = validatorAddresses[validatorAddresses.length.sub(1)];

    // set the address at validator-to-delete.index to last validator address
    validatorAddresses[validators[_validator].index] = lastAddress;

    // update the index of the attribute type that was moved
    validators[lastAddress].index = validators[_validator].index;
    
    // remove the (now duplicate) validator address at the end & trim the array
    delete validatorAddresses[validatorAddresses.length.sub(1)];
    validatorAddresses.length--;

    // remove the validator's signing key from its mapping
    delete signingKeys[validators[_validator].signingKey];

    // remove the validator record
    delete validators[_validator];

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

  // validators may modify the public key corresponding to their signing key.
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
    uint256 _validatorFee,
    bytes _signature
  ) external payable {
    // NOTE: determine best course of action when the attribute already exists
    // NOTE: consider utilizing bytes32 type for attributes and values
    // NOTE: does not currently support an extraData parameter, consider adding
    // NOTE: if msg.sender is a proxy contract, its ownership may be transferred
    // at will, circumventing any token transfer restrictions. Restricting usage
    // to only externally owned accounts may partially alleviate this concern.
    // NOTE: cosider including a salt (or better, nonce) parameter so that when
    // a user adds an attribute, then it gets revoked, the user can get a new
    // signature from the validator and renew the attribute using that. The main
    // downside is that everyone will have to keep track of the extra parameter.
    // Another solution is to just modifiy the required stake or fee amount.

    // retrieve required minimum stake and jurisdiction fees on attribute type
    uint256 minimumStake = attributeTypes[_attribute].minimumStake;
    uint256 jurisdictionFee = attributeTypes[_attribute].jurisdictionFee;
    uint256 stake = msg.value.sub(_validatorFee).sub(jurisdictionFee);

    require(
      stake >= minimumStake,
      "attribute requires a greater value than is currently provided"
    );

    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 hash = keccak256(
      abi.encodePacked(
        address(this),
        msg.sender,
        address(0),
        msg.value,
        _validatorFee,
        _attribute,
        _value
      )
    );

    require(
      invalidAttributeApprovalHashes[hash] == false,
      "signed attribute approvals from validators may not be reused"
    );

    // extract the key used to sign the message hash
    address signingKey = hash.toEthSignedMessageHash().recover(_signature);

    // retrieve the validator who controls the extracted key
    address validator = signingKeys[signingKey];

    require(
      canValidate(validator, _attribute),
      "signature does not match an approved validator for provided attribute"
    );

    require(
      attributes[msg.sender][_attribute].validator == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][msg.sender][_attribute].exists
    // and update value / increment stake if the validator is the same?

    // store attribute value and amount of ether staked in correct scope
    attributes[msg.sender][_attribute] = Attribute({
      exists: true,
      setPersonally: true,
      operator: address(0),
      validator: validator,
      value: _value,
      stake: stake
      // NOTE: no extraData included
    });

    // flag the signed approval as invalid once it's been used to set attribute
    invalidAttributeApprovalHashes[hash] = true;

    // log the addition of the attribute
    emit AttributeAdded(validator, msg.sender, _attribute);

    // log allocation of staked funds to the attribute if applicable
    if (stake > 0) {
      emit StakeAllocated(msg.sender, _attribute, stake);
    }

    // pay jurisdiction fee to the owner of the jurisdiction if applicable
    if (jurisdictionFee > 0) {
      // NOTE: send is chosen over transfer to prevent cases where a improperly
      // configured fallback function could block addition of an attribute
      if (owner.send(jurisdictionFee)) {
        emit FeePaid(owner, msg.sender, _attribute, jurisdictionFee);
      }
    }

    // pay validator fee to the issuing validator's address if applicable
    if (_validatorFee > 0) {
      // NOTE: send is chosen over transfer to prevent cases where a improperly
      // configured fallback function could block addition of an attribute
      if (validator.send(_validatorFee)) {
        emit FeePaid(validator, msg.sender, _attribute, _validatorFee);
      }
    }
  }

  // others can also add attributes by including an address and valid signature
  function addAttributeFor(
    address _who,
    uint256 _attribute,
    uint256 _value,
    uint256 _validatorFee,
    bytes _signature
  ) external payable {
    // NOTE: determine best course of action when the attribute already exists
    // NOTE: consider utilizing bytes32 type for attributes and values
    // NOTE: does not currently support an extraData parameter, consider adding
    // NOTE: if msg.sender is a proxy contract, its ownership may be transferred
    // at will, circumventing any token transfer restrictions. Restricting usage
    // to only externally owned accounts may partially alleviate this concern.
    // NOTE: consider including a salt (or better, nonce) parameter so that when
    // a user adds an attribute, then it gets revoked, the user can get a new
    // signature from the validator and renew the attribute using that. The main
    // downside is that everyone will have to keep track of the extra parameter.
    // Another solution is to just modifiy the required stake or fee amount.

    // attributes may only be added by a third party if onlyPersonal is false
    require(
      attributeTypes[_attribute].onlyPersonal == false,
      "only operatable attributes may be added on behalf of another address"
    );

    // retrieve required minimum stake and jurisdiction fees on attribute type
    uint256 minimumStake = attributeTypes[_attribute].minimumStake;
    uint256 jurisdictionFee = attributeTypes[_attribute].jurisdictionFee;
    uint256 stake = msg.value.sub(_validatorFee).sub(jurisdictionFee);

    require(
      stake >= minimumStake,
      "attribute requires a greater value than is currently provided"
    );

    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 hash = keccak256(
      abi.encodePacked(
        address(this),
        _who,
        msg.sender,
        msg.value,
        _validatorFee,
        _attribute,
        _value
      )
    );

    require(
      invalidAttributeApprovalHashes[hash] == false,
      "signed attribute approvals from validators may not be reused"
    );

    // extract the key used to sign the message hash
    address signingKey = hash.toEthSignedMessageHash().recover(_signature);

    // retrieve the validator who controls the extracted key
    address validator = signingKeys[signingKey];

    require(
      canValidate(validator, _attribute),
      "signature does not match an approved validator for provided attribute"
    );

    require(
      attributes[_who][_attribute].validator == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][_who][_attribute].exists
    // and update value / increment stake if the validator is the same?

    // store attribute value and amount of ether staked in correct scope
    attributes[_who][_attribute] = Attribute({
      exists: true,
      setPersonally: false,
      operator: msg.sender,
      validator: validator,
      value: _value,
      stake: stake
      // NOTE: no extraData included
    });

    // flag the signed approval as invalid once it's been used to set attribute
    invalidAttributeApprovalHashes[hash] = true;

    // log the addition of the attribute
    emit AttributeAdded(validator, _who, _attribute);

    // log allocation of staked funds to the attribute if applicable
    // NOTE: the staker is the entity that pays the fee here!
    if (stake > 0) {
      emit StakeAllocated(msg.sender, _attribute, stake);
    }

    // pay jurisdiction fee to the owner of the jurisdiction if applicable
    if (jurisdictionFee > 0) {
      // NOTE: send is chosen over transfer to prevent cases where a improperly
      // configured fallback function could block addition of an attribute
      if (owner.send(jurisdictionFee)) {
        emit FeePaid(owner, msg.sender, _attribute, jurisdictionFee);
      }
    }

    // pay validator fee to the issuing validator's address if applicable
    if (_validatorFee > 0) {
      // NOTE: send is chosen over transfer to prevent cases where a improperly
      // configured fallback function could block addition of an attribute
      if (validator.send(_validatorFee)) {
        emit FeePaid(validator, msg.sender, _attribute, _validatorFee);
      }
    }
  }

  // approved validators may add attributes directly to a specified address
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
      attributes[_who][_attribute].validator == address(0),
      "duplicate attributes are not supported, remove existing attribute first"
    );
    // alternately, check attributes[validator][msg.sender][_attribute].exists
    // and update value / increment stake if the validator is the same?


    // retrieve required minimum stake and jurisdiction fees on attribute type
    uint256 minimumStake = attributeTypes[_attribute].minimumStake;
    uint256 jurisdictionFee = attributeTypes[_attribute].jurisdictionFee;
    uint256 stake = msg.value.sub(jurisdictionFee);

    require(
      stake >= minimumStake,
      "attribute requires a greater value than is currently provided"
    );

    // store attribute value and amount of ether staked in correct scope
    attributes[_who][_attribute] = Attribute({
      exists: true,
      setPersonally: false,
      operator: address(0),
      validator: msg.sender,
      value: _value,
      stake: stake
      // NOTE: no extraData included
    });

    // log the addition of the attribute
    emit AttributeAdded(msg.sender, _who, _attribute);

    // log allocation of staked funds to the attribute if applicable
    if (stake > 0) {
      emit StakeAllocated(msg.sender, _attribute, stake);
    }

    // pay jurisdiction fee to the owner of the jurisdiction if applicable
    if (jurisdictionFee > 0) {
      // NOTE: send is chosen over transfer to prevent cases where a improperly
      // configured fallback function could block addition of an attribute
      if (owner.send(jurisdictionFee)) {
        emit FeePaid(owner, msg.sender, _attribute, jurisdictionFee);
      }
    }
  }

  // users may remove their own attributes from the jurisdiction at any time
  function removeAttribute(uint256 _attribute) external {
    // attributes may only be removed by the user if they are not restricted
    require(
      attributeTypes[_attribute].restricted == false,
      "only jurisdiction or issuing validator may remove a restricted attribute"
    );

    // determine the assigned validator on the user attribute
    address validator = attributes[msg.sender][_attribute].validator;

    require(
      attributes[msg.sender][_attribute].exists,
      "only existing attributes may be removed"
    );

    // determine if the attribute has a staked value
    uint256 stake = attributes[msg.sender][_attribute].stake;

    // determine the correct address to refund the staked amount to
    address refundAddress;
    if (attributes[msg.sender][_attribute].setPersonally) {
      refundAddress = msg.sender;
    } else {
      address operator = attributes[msg.sender][_attribute].operator;
      if (operator == address(0)) {
        refundAddress = validator;
      } else {
        refundAddress = operator;
      }
    }    

    // remove the attribute from the user address
    delete attributes[msg.sender][_attribute];

    // log the removal of the attribute
    emit AttributeRemoved(validator, msg.sender, _attribute);

    // if the attribute has any staked balance, refund it to the user
    if (stake > 0 && address(this).balance >= stake) {
      // NOTE: send is chosen over transfer to prevent cases where a malicious
      // fallback function could forcibly block an attribute's removal
      if (refundAddress.send(stake)) {
        emit StakeRefunded(refundAddress, _attribute, stake);
      }
    }
  }

  // an operator who has set an attribute may also remove it, if unrestricted
  function removeAttributeFor(address _who, uint256 _attribute) external {
    // attributes may only be removed by the user if they are not restricted
    require(
      attributeTypes[_attribute].restricted == false,
      "only jurisdiction or issuing validator may remove a restricted attribute"
    );

    require(
      attributes[_who][_attribute].exists,
      "only existing attributes may be removed"
    );

    require(
      attributes[_who][_attribute].operator == msg.sender,
      "only an assigning operator may remove attribute on behalf of an address"
    );

    // determine the assigned validator on the user attribute
    address validator = attributes[_who][_attribute].validator;

    // determine if the attribute has a staked value
    uint256 stake = attributes[_who][_attribute].stake;

    // remove the attribute from the user address
    delete attributes[_who][_attribute];

    // log the removal of the attribute
    emit AttributeRemoved(validator, _who, _attribute);

    // if the attribute has any staked balance, refund it to the user
    if (stake > 0 && address(this).balance >= stake) {
      // NOTE: send is chosen over transfer to prevent cases where a malicious
      // fallback function could forcibly block an attribute's removal
      if (msg.sender.send(stake)) {
        emit StakeRefunded(msg.sender, _attribute, stake);
      }
    }
  }

  // the jurisdiction owner and issuing validators may remove attributes
  function removeAttributeFrom(address _who, uint256 _attribute) external {
    // determine the assigned validator on the user attribute
    address validator = attributes[_who][_attribute].validator;
    
    // caller must be either the jurisdiction owner or the assigning validator
    require(
      msg.sender == validator || msg.sender == owner,
      "only jurisdiction or issuing validators may revoke arbitrary attributes"
    );

    require(
      attributes[_who][_attribute].exists,
      "only existing attributes may be removed"
    );

    // determine if attribute has any stake in order to refund transaction fee
    uint256 stake = attributes[_who][_attribute].stake;

    // determine the correct address to refund the staked amount to
    address refundAddress;
    if (attributes[_who][_attribute].setPersonally) {
      refundAddress = _who;
    } else {
      address operator = attributes[_who][_attribute].operator;
      if (operator == address(0)) {
        refundAddress = validator;
      } else {
        refundAddress = operator;
      }
    }

    // remove the attribute from the designated user address
    delete attributes[_who][_attribute];

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
      uint256 transactionGas = 37700; // <--- WARNING: THIS IS APPROXIMATE
      uint256 transactionCost = transactionGas.mul(tx.gasprice);

      // if stake exceeds allocated transaction cost, refund user the difference
      if (stake > transactionCost) {
        // refund the excess stake to the address that contributed the funds
        if (refundAddress.send(stake.sub(transactionCost))) {
          emit StakeRefunded(refundAddress, _attribute, stake.sub(transactionCost));
        }

        // refund the cost of the transaction to the trasaction submitter
        if (tx.origin.send(transactionCost)) {
          emit TransactionRebatePaid(tx.origin, refundAddress, _attribute, transactionCost);
        }

      // otherwise, allocate entire stake to partially refunding the transaction
      } else if (stake > 0 && address(this).balance >= stake) {
        if (tx.origin.send(stake)) {
          emit TransactionRebatePaid(tx.origin, refundAddress, _attribute, stake);
        }
      }
    }
  }  

  // owner and issuing validators may invalidate a signed attribute approval
  function invalidateAttributeApproval(
    bytes32 _hash,
    bytes _signature
  ) external {
    // determine the assigned validator on the signed attribute approval
    address validator = signingKeys[
      _hash.toEthSignedMessageHash().recover(_signature) // signingKey
    ];
    
    // caller must be either the jurisdiction owner or the assigning validator
    require(
      msg.sender == validator || msg.sender == owner,
      "only jurisdiction or issuing validator may invalidate attribute approval"
    );

    // add the hash to the set of invalid attribute approval hashes
    invalidAttributeApprovalHashes[_hash] = true;
  }

  // external interface for determining the existence of an attribute
  function hasAttribute(
    address _who, 
    uint256 _attribute
  ) external view returns (bool) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = attributes[_who][_attribute].validator;
    return (
      (
        validators[validator].exists &&   // isValidator(validator)
        attributeTypes[_attribute].approvedValidators[validator] &&
        attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)
      ) || (
        attributeTypes[_attribute].secondarySource != address(0) &&
        
        secondaryHasAttribute(
          attributeTypes[_attribute].secondarySource,
          _who,
          attributeTypes[_attribute].secondaryId
        )

        // External call - note that if the underlying contract reverts, the
        // attribute query will also revert (ideally it would just return false)
        
        /*
        AttributeRegistry(
          attributeTypes[_attribute].secondarySource
        ).hasAttribute(
          _who, attributeTypes[_attribute].secondaryId
        )
        */
      )
    );
  }

  // external interface for getting the value of an attribute
  function getAttribute(
    address _who,
    uint256 _attribute
  ) external view returns (uint256 value) {
    // gas optimization: get validator & call canValidate function body directly
    address validator = attributes[_who][_attribute].validator;
    if (
      validators[validator].exists &&   // isValidator(validator)
      attributeTypes[_attribute].approvedValidators[validator] &&
      attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)
    ) {
      return attributes[_who][_attribute].value;
    } else if (
      attributeTypes[_attribute].secondarySource != address(0)
    ) {
      return (
        secondaryGetAttribute(
          attributeTypes[_attribute].secondarySource,
          _who,
          attributeTypes[_attribute].secondaryId
        )


        // External call - note that if the underlying contract reverts, the
        // attribute query will also revert (ideally it would just return 0)
        
        /*
        AttributeRegistry(
          attributeTypes[_attribute].secondarySource
        ).getAttribute(
          _who, attributeTypes[_attribute].secondaryId
        )
        */
      );
    }

    // NOTE: attributes with no validator will register as having a value of 0
    return 0;
  }

  // external interface for getting the description of an attribute by ID
  function getAttributeInformation(
    uint256 _attribute
  ) external view returns (
    string description,
    bool isRestricted,
    bool isOnlyPersonal,
    address secondarySource,
    uint256 secondaryId,
    uint256 minimumRequiredStake,
    uint256 jurisdictionFee
  ) {
    return (
      attributeTypes[_attribute].description,
      attributeTypes[_attribute].restricted,
      attributeTypes[_attribute].onlyPersonal,
      attributeTypes[_attribute].secondarySource,
      attributeTypes[_attribute].secondaryId,
      attributeTypes[_attribute].minimumStake,
      attributeTypes[_attribute].jurisdictionFee
    );
  }

  // external interface for getting the description of a validator by ID
  function getValidatorInformation(
    address _validator
  ) external view returns (
    address signingKey,
    string description
  ) {
      return (
        validators[_validator].signingKey,
        validators[_validator].description
      );
    }

  // external interface for getting the list of all available attributes by ID
  function getAvailableAttributes() external view returns (uint256[]) {
    return attributeIds;
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

  // external interface for getting the hash of an attribute approval
  function getAttributeApprovalHash(
    address _who,
    address _operator,
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee
  ) external view returns (bytes32 hash) {
    return keccak256(
      abi.encodePacked(
        address(this),
        _who,
        _operator,
        _fundsRequired,
        _validatorFee,
        _attribute,
        _value
      )
    );
  }

  // users can check whether a signature for adding an attribute is still valid
  function canAddAttribute(
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee,
    bytes _signature
  ) external view returns (bool) {
    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 hash = calculateAttributeApprovalHash(
      msg.sender,
      address(0),
      _attribute,
      _value,
      _fundsRequired,
      _validatorFee
    );

    // recover the address associated with the signature of the message hash
    address signingKey = hash.toEthSignedMessageHash().recover(_signature);
    
    // retrieve variables necessary to perform checks
    address validator = signingKeys[signingKey];
    uint256 minimumStake = attributeTypes[_attribute].minimumStake;
    uint256 jurisdictionFee = attributeTypes[_attribute].jurisdictionFee;

    // determine if the attribute can still be added
    return (
      _fundsRequired >= minimumStake.add(jurisdictionFee).add(_validatorFee) &&
      invalidAttributeApprovalHashes[hash] == false &&
      canValidate(validator, _attribute)
    );
  }

  // operators can check whether an attribute approval signature is still valid
  function canAddAttributeFor(
    address _who,
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee,
    bytes _signature
  ) external view returns (bool) {
    // signed data hash constructed according to EIP-191-0x45 to prevent replays
    bytes32 hash = calculateAttributeApprovalHash(
      _who,
      msg.sender,
      _attribute,
      _value,
      _fundsRequired,
      _validatorFee
    );

    // recover the address associated with the signature of the message hash
    address signingKey = hash.toEthSignedMessageHash().recover(_signature);
    
    // retrieve variables necessary to perform checks
    address validator = signingKeys[signingKey];
    uint256 minimumStake = attributeTypes[_attribute].minimumStake;
    uint256 jurisdictionFee = attributeTypes[_attribute].jurisdictionFee;

    // determine if the attribute can still be added
    return (
      _fundsRequired >= minimumStake.add(jurisdictionFee).add(_validatorFee) &&
      invalidAttributeApprovalHashes[hash] == false &&
      canValidate(validator, _attribute)
    );
  }

  // ERC-165 support (pure function - will produce a compiler warning)
  function supportsInterface(bytes4 _interfaceID) external view returns (bool) {
    return (
      _interfaceID == this.supportsInterface.selector || // ERC165
      _interfaceID == this.hasAttribute.selector
                      ^ this.getAttribute.selector
                      ^ this.getAvailableAttributes.selector //AttributeRegistry
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
  ) internal view returns (bool) {
    return (
      validators[_validator].exists &&   // isValidator(_validator)
      attributeTypes[_attribute].approvedValidators[_validator] &&
      attributeTypes[_attribute].exists  // isDesignatedAttribute(_attribute)
    );
  }

  // internal helper function for getting the hash of an attribute approval
  function calculateAttributeApprovalHash(
    address _who,
    address _operator,
    uint256 _attribute,
    uint256 _value,
    uint256 _fundsRequired,
    uint256 _validatorFee
  ) internal view returns (bytes32 hash) {
    return keccak256(
      abi.encodePacked(
        address(this),
        _who,
        _operator,
        _fundsRequired,
        _validatorFee,
        _attribute,
        _value
      )
    );
  }

  // helper function, won't revert calling hasAttribute on secondary registries
  function secondaryHasAttribute(
    address _source,
    address _who,
    uint256 _id
  ) internal view returns (bool result) {
    uint256 maxGas = gasleft() > 20000 ? 20000 : gasleft();
    bytes4 hasAttributeSignature = this.hasAttribute.selector; // 0x4b5f297a
    assembly {
      let pointer := mload(0x40) // get storage start from free memory pointer
      mstore(pointer, hasAttributeSignature) // set signature at top of storage
      mstore(add(pointer, 0x04), _who) // place first argument after signature
      mstore(add(pointer, 0x24), _id) // pad 1 word and place second argument

      let success := staticcall(
        maxGas,  // maximum of 20k gas can be forwarded
        _source, // address of registry to call
        pointer, // inputs are stored at pointer location
        0x44,    // inputs are 68 bytes (4 + 32 * 2)
        add(pointer, 0x44), // store output over free space
        0x20     // output is 32 bytes
      )

      if success {
        result := mload(add(pointer, 0x44))
      }
      
      mstore(0x40, add(pointer, 0x64)) // set storage pointer to empty space
    }
  }

  // helper function, won't revert calling getAttribute on secondary registries
  function secondaryGetAttribute(
    address _source,
    address _who,
    uint256 _id
  ) internal view returns (uint256 result) {
    uint256 maxGas = gasleft() > 20000 ? 20000 : gasleft();
    bytes4 getAttributeSignature = this.getAttribute.selector; // 0xc2ee4190
    assembly {
      let pointer := mload(0x40) // get storage start from free memory pointer
      mstore(pointer, getAttributeSignature) // set signature at top of storage
      mstore(add(pointer, 0x04), _who) // place first argument after signature
      mstore(add(pointer, 0x24), _id) // pad 1 word and place second argument

      let success := staticcall(
        maxGas,  // 20k gas max. forwarded
        _source, // address of registry to call
        pointer, // inputs are stored at pointer location
        0x44,    // inputs are 68 bytes (4 + 32 * 2)
        add(pointer, 0x44), // store output over free space
        0x20     // output is 32 bytes
      )

      if success {
        result := mload(add(pointer, 0x44))
      }

      mstore(0x40, add(pointer, 0x64)) // set storage pointer to empty space
    }
  }
}