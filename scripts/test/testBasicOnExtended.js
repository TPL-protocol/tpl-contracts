var assert = require('assert');
const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const TPLTokenContractData = require('../../build/contracts/TPLERC20RestrictedReceiverInstance.json')

module.exports = {test: async function (provider, testingContext) {
  var web3 = provider
  let passed = 0
  let failed = 0
  console.log('running tests...')
  // get available addresses and assign them to various roles
  const addresses = await Promise.resolve(web3.eth.getAccounts())
  if (addresses.length < 4) {
    console.log('cannot find enough addresses to run tests...')
    return false
  }

  const address = addresses[0]
  const validatorAddress = addresses[1]
  const attributedAddress = addresses[2]
  const inattributedAddress = addresses[3]
  const nullAddress = '0x0000000000000000000000000000000000000000'
  const badAddress = '0xbAd00BAD00BAD00bAD00bAD00bAd00BaD00bAD00'
  const unownedAddress = '0x1010101010101010101010101010101010101010'

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const TPLTokenDeployer = new web3.eth.Contract(
    TPLTokenContractData.abi
  )

  // set up some flags so we can delay display of a few test results
  let getAvailableAttributesTestOnePassed;
  let getAvailableAttributesTestTwoPassed;
  let getAvailableAttributesTestThreePassed;

  // *************************** deploy contracts *************************** //
  let deployGas;

  const latestBlock = await web3.eth.getBlock('latest')
  const gasLimit = latestBlock.gasLimit

  const Jurisdiction = await JurisdictionDeployer.deploy(
    {
      data: JurisdictionContractData.bytecode
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: TPLTokenDeployer.deploy({
        data: TPLTokenContractData.bytecode,
        arguments: [
          100,
          Jurisdiction.options.address,
          11111
        ]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const TPLToken = await TPLTokenDeployer.deploy(
    {
      data: TPLTokenContractData.bytecode,
      arguments: [
        100,
        Jurisdiction.options.address,
        11111
      ]
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })
  console.log(
    ' ✓ TPL token contract deploys successfully'
  )
  passed++



  // **************************** begin testing ***************************** //


  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

  await Jurisdiction.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓ jurisdiction owner is set to the correct address')
    passed++
  })

  console.log(
    ' ✓ token contract referencing jurisdiction deploys successfully'
  )
  passed++

  await TPLToken.methods.getRegistry().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, Jurisdiction.options.address)
    console.log(
      ' ✓ registry utilized by token is set to the jurisdiction address'
    )
    passed++
  })

  await TPLToken.methods.getValidAttributeID().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ID => {
    assert.strictEqual(ID, '11111')
    console.log(
      ' ✓ attribute ID required by token is set to the correct value'
    )
    passed++
  })

  await TPLToken.methods.balanceOf(address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(balance => {
    assert.strictEqual(balance, (100).toString())
    console.log(' ✓ deploying address has the correct balance')
    passed++
  })

  await TPLToken.methods.approve(address, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status) 
    console.log(
      " ✓ operator can be approved for transferFrom"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ operator can be approved for transferFrom"
    )
    failed++
  })

  await TPLToken.methods.transfer(inattributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ tokens can't be transferred before valid attributes are assigned"
    )
    passed++
  })

  await TPLToken.methods.transferFrom(address, inattributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ tokens can't transferFrom before valid attributes are assigned"
    )
    passed++
  })

  // create stub objects that will be used for setting and comparing values
  const validator = {
    address: validatorAddress,
    description: 'VALIDATOR_DESCRIPTION'
  }

  const validatorTwo = {
    address: attributedAddress,
    description: 'VALIDATOR_TWO_DESCRIPTION'
  }

  const attribute = {
    attributeId: 11111,
    restricted: false,
    onlyPersonal: false,
    secondarySource: nullAddress,
    secondaryId: 0,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 0,
    targetValueTwo: 67890,
    targetValueThree: 28282,
    invalidatedTargetValue: 37373,
  }

  const additionalAttribute = {
    attributeId: 22222,
    restricted: false,
    onlyPersonal: false,
    secondarySource: nullAddress,
    secondaryId: 0,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'ADDITIONAL_ATTRIBUTE',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 55555
  }

  const undefinedAttributeId = 44444

  await Jurisdiction.methods.pause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ Jurisdiction contract can be paused`)
  passed++

  await Jurisdiction.methods.addValidator(
    validator.address,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ jurisdiction owner cannot add new validators when paused')
    passed++
  })

  await Jurisdiction.methods.unpause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ Jurisdiction contract can be unpaused`)
  passed++

  await Jurisdiction.methods.addValidator(
    validator.address,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to add new validators')
    passed++

    const logs = receipt.events.ValidatorAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.description, validator.description)
    console.log(' ✓ ValidatorAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validatorDescription => {
    assert.strictEqual(validatorDescription, validator.description)
    console.log(' ✓ validator description is correctly accessible')
    passed++
  }) 

  await Jurisdiction.methods.countValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators, '1')
    console.log(' ✓ validator is added to the count of avaiable validators')
    passed++
  })  

  await Jurisdiction.methods.getValidator(
    0
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators, validatorAddress)
    console.log(' ✓ validator is added correctly to the list of validators')
    passed++
  })  

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 1)
    assert.strictEqual(validators[0], validatorAddress)
    console.log(' ✓ validator can be accessed in batch as well')
    passed++
  })  

  await Jurisdiction.methods.addValidator(
    validatorTwo.address,
    validatorTwo.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ multiple validators may be added')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 2)
    assert.strictEqual(validators[0], validatorAddress)
    assert.strictEqual(validators[1], validatorTwo.address)
    console.log(
      ' ✓ multiple validators are added correctly to the list of validators'
    )
    passed++
  })  

  await Jurisdiction.methods.addValidator(
    nullAddress,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add null address as a validator fails')
    passed++
  }) 


  await Jurisdiction.methods.addValidator(
    validatorAddress,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add validator at an existing address fails')
    passed++
  })

  await Jurisdiction.methods.addValidator(
    inattributedAddress,
    validator.description
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add validator from non-owner account fails')
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to add new attribute types')
    passed++

    const logs = receipt.events.AttributeTypeAdded.returnValues
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    assert.strictEqual(logs.description, attribute.description)
    console.log(' ✓ AttributeTypeAdded event is logged correctly')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add duplicate attribute type fails')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId + 1, // not a duplicate
    attribute.description
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add attribute type from non-owner account fails')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    additionalAttribute.attributeId, // not a duplicate
    additionalAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ adding multiple attribute types is supported')
    passed++
  }) 

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to approve validators to assign attributes')
    passed++

    const logs = receipt.events.ValidatorApprovalAdded.returnValues
    assert.strictEqual(logs.validator, attribute.targetValidator)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓ ValidatorApprovalAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    undefinedAttributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add approval to undefined attribute type fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    inattributedAddress, // not a validator
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add approval to undefined validator fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add duplicate approval fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    additionalAttribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add approval from non-owner fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    additionalAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ adding multiple approvals on a validator is supported')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    validatorTwo.address,
    additionalAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ adding approvals on multiple validators is supported')
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    attribute.targetValidator,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isApproved => {
    assert.ok(isApproved)
    console.log(
      ' ✓ external calls to check for validator approvals are supported'
    )
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    validatorTwo.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isApproved => {
    assert.strictEqual(isApproved, false)
    console.log(
      ' ✓ calls return false for unapproved validators'
    )
    passed++
  })

  /*
  // NOTE: this is one test that will fail on the standard jurisdiction, as the
  // standard jurisdiction actually accepts attached values / funds.
  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 10 ** 1
  }).catch(error => {
    console.log(' ✓ attempt to add attribute with an attached value fails')
    passed++
  })
  */

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validator is able to directly assign approved attributes')
    passed++

    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    assert.strictEqual(logs.attributeValue, attribute.targetValue.toString())
    console.log(' ✓ AttributeAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.getAttributeValidator(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValidator => { 
    assert.strictEqual(attributeValidator[0], validatorAddress)
    assert.ok(attributeValidator[1])
    console.log(' ✓ external calls can check for the validator of an attribute')
    passed++
  }) 

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    additionalAttribute.attributeId,
    additionalAttribute.targetValue
  ).send({
    from: validatorTwo.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ multiple attributes can be added to an address')
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    address,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ attributes can be added to multiple addresses')
    passed++
  })

  await TPLToken.methods.canReceive(attributedAddress).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(canReceive => {
    assert.ok(canReceive) 
    console.log(
      " ✓ accounts can be checked as valid token receivers"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ accounts can be checked as valid token receivers"
    )
    failed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can be transferred between addresses with valid attributes"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can be transferred between addresses with valid attributes"
    )
    failed++
  })

  await TPLToken.methods.transferFrom(address, attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can transferFrom between addresses with valid attributes"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can transferFrom between addresses with valid attributes"
    )
    failed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add duplicate attribute fails')
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    undefinedAttributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to add undefined attribute type fails')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x01ffc9a7').call({
    from: address,
    gas: 30000,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓ external calls to check for ERC-165 support are successful')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0xffffffff').call({
    from: address,
    gas: 30000,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.strictEqual(isSupported, false)
    console.log(' ✓ interface support check for 0xffffffff fails as expected')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x5f46473f').call({
    from: address,
    gas: 30000,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓ Registry interface support check is successful')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(' ✓ external calls can check if an address has a given attribute')
    passed++

    console.log(
      ' ✓ addresses can contain an attribute with a value of 0'
    )
    passed++  
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    additionalAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(
      ' ✓ checks for additional assigned attributes on an address succeed'
    )
    passed++  
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(' ✓ undefined attribute types return false')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(' ✓ unassigned attributes return false')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, attribute.targetValue.toString())
    console.log(' ✓ external calls retrieve an address\'s attribute value')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    additionalAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, additionalAttribute.targetValue.toString())
    console.log(' ✓ addresses can have multiple separate attribute values')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(' ✘ undefined attribute types revert on getAttribute')
    failed++
  }).catch(error => {
    console.log(' ✓ undefined attribute types revert on getAttribute')
    passed++ 
  })
 
  await Jurisdiction.methods.getAttributeValue(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(' ✘ unassigned attributes revert on getAttributeValue')
    failed++
  }).catch(error => {
    console.log(' ✓ unassigned attributes revert on getAttributeValue')
    passed++ 
  })

  await Jurisdiction.methods.getAttributeTypeDescription(
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeDescription => {
    assert.strictEqual(attribute.description, attributeDescription)
    console.log(
      ' ✓ external calls can retrieve description of an attribute type'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeTypeDescription(
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeDescription => {
    assert.strictEqual('', attributeDescription)
    console.log(' ✓ undefined attribute types return empty description')
    passed++
  })

  await Jurisdiction.methods.countAttributeTypes().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds, '2')
    getAvailableAttributesTestOnePassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestOnePassed = false
    failed++    
  })

  await Jurisdiction.methods.getAttributeTypeID(
    0
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeId => {
    assert.strictEqual(attributeId, attribute.attributeId.toString())
    getAvailableAttributesTestOnePassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestOnePassed = false
    failed++    
  })

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 2)
    assert.strictEqual(attributeIds[0], attribute.attributeId.toString())
    assert.strictEqual(
      attributeIds[1], additionalAttribute.attributeId.toString()
    )
    getAvailableAttributesTestOnePassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestOnePassed = false
    failed++    
  })

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validatorDescription => {
    assert.strictEqual(validatorDescription, validator.description)
    console.log(' ✓ external calls retrieve new description on validator')
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validator is able to directly remove attributes it approved')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓ AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ validator cannot remove attributes that do not exist')
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    additionalAttribute.attributeId
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    console.log(' ✘ validators may not remove attributes they did not approve')
    failed++    
  }).catch(error => {
    console.log(' ✓ validators may not remove attributes they did not approve')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(' ✓ external calls to check for removed attributes return false')
    passed++
  }).catch(error => {
    console.log(' ✘ external calls to check for removed attributes return false')
    failed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘ tokens can't be transferred after attributes have been revoked"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓ tokens can't be transferred after attributes have been revoked"
    )
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validators can renew attributes on an old addresses')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can be transferred from addresses with renewed attributes"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can be transferred from addresses with renewed attributes"
    )
    failed++
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove validator attribute approvals')
    passed++

    const logs = receipt.events.ValidatorApprovalRemoved.returnValues
    assert.strictEqual(logs.validator, validator.address)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓ ValidatorApprovalRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to remove non-existant validator approval fails')
    passed++
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validatorTwo.address,
    additionalAttribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ' ✓ attempt to remove validator approval from non-owner account fails'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓ attributes are no longer valid after validator approval is revoked'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(
      ' ✘ attributes invalidated on revoked approvals revert on getAttribute'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ attributes invalidated on revoked approvals revert on getAttribute'
    )
    passed++ 
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘ tokens can't be sent if validator's attribute approval is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓ tokens can't be sent if validator's attribute approval is removed"
    )
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ renewing pre-existing validator approvals is supported'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ renewing pre-existing validator approvals is supported'
    )
    failed++    
  })

  await Jurisdiction.methods.canIssueAttributeType(
    validator.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isStillValid => {
    assert.ok(isStillValid)
    console.log(
      ' ✓ checks for validator approval are correct'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ checks for validator approval are correct'
    )
    failed++    
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(
      ' ✓ invalid attributes become valid after renewing validator approval'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(
      attributeValue,
      (attribute.targetValue).toString()
    )
    console.log(
      ' ✓ attribute values from renewed validator approvals return correctly'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can be sent if validator's attribute approval is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can be sent if validator's attribute approval is renewed"
    )
    failed++
  })

  // NOTE: during coverage tests, gas is doubled to account for instrumentation
  let gasToUse = 25000
  if (testingContext === 'coverage') {
    gasToUse = gasToUse * 2
  }
  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: gasToUse, 
    gasPrice: 10 ** 9
  }).then(receipt => {
    console.log(
      " ✘ validator cannot be deleted until all approvals are deleted"
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ validator cannot be deleted until all approvals are deleted'
    )
    passed++
  })

  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove validators')
    passed++

    const logs = receipt.events.ValidatorRemoved.returnValues
    assert.strictEqual(logs.validator, validator.address)
    console.log(' ✓ ValidatorRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 1)
    assert.strictEqual(validators[0], validatorTwo.address)
    console.log(
      ' ✓ validators are removed correctly from the list of validators'
    )
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    validator.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isStillValid => {
    assert.strictEqual(isStillValid, false)
    console.log(
      ' ✓ checks for validator approval show that the approval is removed'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ checks for validator approval show that the approval is removed'
    )
    failed++    
  })

  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to remove non-existant validator fails')
    passed++
  })  

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓ checks for attributes from removed validators return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(
      ' ✘ attribute values from removed validators revert on getAttribute'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ attribute values from removed validators revert on getAttribute'
    )
    passed++ 
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘ tokens cannot be sent after issuing validator is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓ tokens cannot be sent after issuing validator is removed"
    )
    passed++
  })

  await Jurisdiction.methods.addValidator(
    validator.address,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ revoked validators can be renewed')
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    validator.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isStillValid => {
    assert.strictEqual(isStillValid, false)
    console.log(
      ' ✓ checks for renewed validator approval show they are NOT renewed'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ checks for renewed validator approval show they are NOT renewed'
    )
    failed++    
  })

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validatorDescription => {
    assert.strictEqual(validatorDescription, validator.description)
    console.log(' ✓ external calls can retrieve description on a validator')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 2)
    assert.strictEqual(validators[0], validatorTwo.address)
    assert.strictEqual(validators[1], validatorAddress)
    console.log(
      ' ✓ renewed validators are added correctly to the list of validators'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓ attribute checks from renewed validators return false (reset approval!)'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(
      ' ✘ attribute values from renewed validators revert on getAttribute'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ attribute values from renewed validators revert on getAttribute'
    )
    passed++ 
  })

  await Jurisdiction.methods.addValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ renewing pre-existing renewed validator approvals is supported'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ renewing pre-existing renewed validator approvals is supported'
    )
    failed++    
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, true)
    console.log(
      ' ✓ reset attribute checks from renewed validators return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(
      attributeValue,
      attribute.targetValue.toString()
    )
    console.log(
      ' ✓ reset attribute values from renewed validators return correct value'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can be sent after issuing validator is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can be sent after issuing validator is renewed"
    )
    failed++
  })

  await Jurisdiction.methods.removeValidator(
    validatorAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to remove validator from non-owner account fails')
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove attribute types')
    passed++

    const logs = receipt.events.AttributeTypeRemoved.returnValues
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓ AttributeTypeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓ attempt to remove non-existant attribute type fails')
    passed++
  })  

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓ checks for attributes from removed attribute types return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    console.log(
      ' ✘ attribute values on removed attribute types revert on getAttribute'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ attribute values on removed attribute types revert on getAttribute'
    )
    passed++ 
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘ tokens cannot be sent after required attribute type is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓ tokens cannot be sent after required attribute type is removed"
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 1)
    assert.strictEqual(attributeIds[0], additionalAttribute.attributeId.toString())
    getAvailableAttributesTestTwoPassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestTwoPassed = false
    failed++    
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description + 'x' // modified - how tricky of them...
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    console.log(
      ' ✘ attempt to modify parameters on attribute type renewals fails'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓ attempt to modify parameters on attribute type renewals fails'
    )
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ revoked attribute types can be renewed when all properties match'
    )
    passed++
  }) 

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, true)
    console.log(
      ' ✓ attribute checks from renewed attribute types return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(
      attributeValue,
      attribute.targetValue.toString()
    )
    console.log(
      ' ✓ attribute values from renewed attribute types return correct value'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓ tokens can be sent after required attribute type is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘ tokens can be sent after required attribute type is renewed"
    )
    failed++
  })

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 2)
    assert.strictEqual(attributeIds[1], attribute.attributeId.toString())
    assert.strictEqual(
      attributeIds[0], additionalAttribute.attributeId.toString()
    )
    getAvailableAttributesTestThreePassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestThreePassed = false
    failed++    
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ' ✓ attempt to remove attribute types from non-owner account fails'
    )
    passed++
  })

  console.log(
    ` ${
      getAvailableAttributesTestOnePassed ? '✓' : '✘'
    } external calls can get a list of all available attributes`
  )

  console.log(
    ` ${
      getAvailableAttributesTestTwoPassed ? '✓' : '✘'
    } available attribute IDs are reduced after removal (mid-array is ok)`
  )

  console.log(
    ` ${
      getAvailableAttributesTestThreePassed ? '✓' : '✘'
    } available attribute IDs are repopulated (order moved) after renewal`
  )


  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to directly remove attributes')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓ AttributeRemoved event is logged correctly')
    passed++
  })

  // TODO: attempts to pass in any unsupported parameters will fail

  // TODO: handle all failed test cases - a bunch will halt testing if they fail

  console.log(
    `completed ${passed + failed} test${passed + failed === 1 ? '' : 's'} ` + 
    `with ${failed} failure${failed === 1 ? '' : 's'}.`
  )

  if (failed > 0) {
    process.exit(1)
  }

  process.exit(0)

}}
