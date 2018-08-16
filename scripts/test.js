var assert = require('assert');

var Web3 = require('web3')

var JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
var TPLTokenContractData = require('../build/contracts/TPLToken.json')

var web3 = new Web3('ws://localhost:8545')

async function signValidation(validatorSigningKeyAccount, jurisdiction, who, stake, attribute, value) {
  return web3.eth.sign(
    web3.utils.soliditySha3(
      {t: 'address', v: jurisdiction},
      {t: 'address', v: who},
      {t: 'uint256', v: stake},
      {t: 'uint256', v: attribute},
      {t: 'uint256', v: value}
    ),
    validatorSigningKeyAccount
  )
}

async function test() {
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

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const TPLTokenDeployer = new web3.eth.Contract(
    TPLTokenContractData.abi
  )

  // set up some variables that will be used for tracking account balances
  let gasCost
  let difference
  let expectedDifference
  let stakeAmount = 2 * 10 ** 14
  let expectedTransactionGas = 139000

  // set up some flags so we can delay display of a few test results
  let getAvailableAttributesTestOnePassed;
  let getAvailableAttributesTestTwoPassed;
  let getAvailableAttributesTestThreePassed;

  // *************************** deploy contracts *************************** //
  const Jurisdiction = await JurisdictionDeployer.deploy(
    {
      data: JurisdictionContractData.bytecode
    }
  ).send({
    from: address,
    gas: 5500000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  const TPLToken = await TPLTokenDeployer.deploy(
    {
      data: TPLTokenContractData.bytecode,
      arguments: [Jurisdiction.options.address, 100]
    }
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  // **************************** begin testing ***************************** //

  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

  await Jurisdiction.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓  - jurisdiction owner is set to the correct address')
    passed++
  })

  console.log(
    ' ✓  - token contract referencing jurisdiction deploys successfully'
  )
  passed++

  await TPLToken.methods.getRegistryAddress().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, Jurisdiction.options.address)
    console.log(
      ' ✓  - registry utilized by token is set to the jurisdiction address'
    )
    passed++
  })
  
  await TPLToken.methods.balanceOf(address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(balance => {
    assert.strictEqual(balance, (100).toString())
    console.log(' ✓  - deploying address has the correct balance')
    passed++
  })

  await TPLToken.methods.transfer(inattributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be transferred before valid attributes are assigned"
    )
    passed++
  })

  // create stub objects that will be used for setting and comparing values
  const validator = {
    address: validatorAddress,
    description: 'VALIDATOR_DESCRIPTION',
    replacementSigningKey: address
  }

  const validatorTwo = {
    address: attributedAddress,
    description: 'VALIDATOR_TWO_DESCRIPTION',
    replacementSigningKey: address
  }

  const attribute = {
    attributeId: 11111,
    restricted: false,
    minimumStake: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE',
    targetValidator: validatorAddress,
    targetValue: 0,
    targetValueTwo: 67890,
    targetTwoSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      11111,
      67890
    )
  }

  const restrictedAttribute = {
    attributeId: 22222,
    restricted: true,
    minimumStake: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_RESTRICTED',
    targetValidator: validatorAddress,
    targetValue: 55555,
    targetSignature: await signValidation(
      validator.replacementSigningKey,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      22222,
      55555
    )
  }

  const stakedAttribute = {
    attributeId: 33333,
    restricted: false,
    minimumStake: 10 ** 5,
    description: 'VALID_ADDRESS_ATTRIBUTE_STAKED',
    targetValidator: validatorAddress,
    targetValue: 66666,
    targetSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      2 * 10 ** 14,
      33333,
      66666
    ),
    badSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      10 ** 3,
      33333,
      66666
    )
  }

  const undefinedAttributeId = 44444

  await Jurisdiction.methods.addValidator(
    validatorAddress,
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
    console.log(' ✓  - ValidatorAdded event is logged correctly')
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
    console.log(' ✓  - multiple validators may be added')
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
    console.log(' ✓  - attempt to add null address as a validator fails')
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
    console.log(' ✓  - attempt to add validator at an existing address fails')
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
    console.log(' ✓  - attempt to add validator from non-owner account fails')
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.restricted,
    attribute.minimumStake,
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    assert.strictEqual(logs.description, attribute.description)
    console.log(' ✓  - AttributeTypeAdded event is logged correctly')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.restricted,
    attribute.minimumStake,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to add duplicate attribute type fails')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId + 1, // not a duplicate
    attribute.restricted,
    attribute.minimumStake,
    attribute.description
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to add attribute type from non-owner account fails')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    restrictedAttribute.attributeId, // not a duplicate
    restrictedAttribute.restricted,
    restrictedAttribute.minimumStake,
    restrictedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - adding multiple attribute types is supported')
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - ValidatorApprovalAdded event is logged correctly')
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
    console.log(' ✓  - attempt to add approval to undefined attribute type fails')
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
    console.log(' ✓  - attempt to add approval to undefined validator fails')
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
    console.log(' ✓  - attempt to add duplicate approval fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    restrictedAttribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to add approval from non-owner fails')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    restrictedAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - adding multiple approvals on a validator is supported')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    validatorTwo.address,
    restrictedAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - adding approvals on multiple validators is supported')
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    restrictedAttribute.attributeId,
    restrictedAttribute.targetValue
  ).send({
    from: validatorTwo.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - multiple attributes can be added to an address')
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
    address,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - attributes can be added to multiple addresses')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓  - tokens can be transferred between addresses with valid attributes"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can be transferred between addresses with valid attributes"
    )
    failed++
  })

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to add duplicate attribute fails')
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    undefinedAttributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to add undefined attribute type fails')
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
    console.log(' ✓  - interface support check for 0xffffffff fails as expected')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x13a51fda').call({
    from: address,
    gas: 30000,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓  - Registry interface support check is successful')
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
      ' ✓  - addresses can contain an attribute with a value of 0'
    )
    passed++  
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    restrictedAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(
      ' ✓  - checks for additional assigned attributes on an address succeed'
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
    console.log(' ✓  - undefined attribute types return false')
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
    console.log(' ✓  - unassigned attributes return false')
    passed++
  })

  await Jurisdiction.methods.getAttribute(
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

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    restrictedAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, restrictedAttribute.targetValue.toString())
    console.log(' ✓  - addresses can have multiple separate attribute values')
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(' ✓  - undefined attribute types return 0')
    passed++
  })
 
  await Jurisdiction.methods.getAttribute(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(' ✓  - unassigned attributes return 0')
    passed++
  })

  await Jurisdiction.methods.getAttributeInformation(
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeInformation => {
    assert.strictEqual(attribute.description, attributeInformation.description)
    assert.strictEqual(attribute.restricted, attributeInformation.isRestricted)
    assert.strictEqual(
      attribute.minimumStake.toString(),
      attributeInformation.minimumRequiredStake
    )
    console.log(' ✓ external calls can retrieve information on an attribute type')
    passed++
  })

  await Jurisdiction.methods.getAttributeInformation(
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeInformation => {
    assert.strictEqual(attributeInformation.description, '')
    assert.strictEqual(attributeInformation.isRestricted, false)
    assert.strictEqual(attributeInformation.minimumRequiredStake, (0).toString())
    console.log(' ✓  - undefined attribute types return empty values')
    passed++
  })

  await Jurisdiction.methods.getAvailableAttributes().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 2)
    assert.strictEqual(attributeIds[0], attribute.attributeId.toString())
    assert.strictEqual(
      attributeIds[1], restrictedAttribute.attributeId.toString()
    )
    getAvailableAttributesTestOnePassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestOnePassed = false
    failed++    
  })

  await Jurisdiction.methods.modifyValidatorSigningKey(
    validator.replacementSigningKey
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validators can modify their signing key')
    passed++

    const logs = receipt.events.ValidatorSigningKeyModified.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.newSigningKey, validator.replacementSigningKey)
    console.log(' ✓  - ValidatorSigningKeyModified event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.modifyValidatorSigningKey(
    validator.replacementSigningKey
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to set signing key to an existing key fails')
    passed++
  })

  await Jurisdiction.methods.modifyValidatorSigningKey(
    validatorAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ' ✓  - attempt to modify a signing key from non-validator account fails'
    )
    passed++
  })

  await Jurisdiction.methods.addValidator(
    address,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add validator with same address as a signing key fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - users cannot add attributes signed using the old signing key'
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
    assert.ok(attributeExists)
    console.log(
      ' ✓  - attributes from validators with modified signing keys return true'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttribute(
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
      ' ✓  - attribute from validators with modified signing keys return value'
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
      " ✓  - tokens can still be sent if issuing validator modifies signing key"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can still be sent if issuing validator modifies signing key"
    )
    failed++
  })

  await Jurisdiction.methods.removeAttributeFrom(
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeAttributeFrom(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - validator cannot remove attributes that do not exist')
    passed++
  })

  await Jurisdiction.methods.removeAttributeFrom(
    attributedAddress,
    restrictedAttribute.attributeId
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    console.log(' ✘  - validators may not remove attributes they did not approve')
    failed++    
  }).catch(error => {
    console.log(' ✓  - validators may not remove attributes they did not approve')
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
    console.log(' ✓  - external calls to check for removed attributes return false')
    passed++
  }).catch(error => {
    console.log(' ✘  - external calls to check for removed attributes return false')
    failed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘  - tokens can't be transferred after attributes have been revoked"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be transferred after attributes have been revoked"
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - validators can renew attributes on an old addresses')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)    
    console.log(
      " ✓  - tokens can be transferred from addresses with renewed attributes"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can be transferred from addresses with renewed attributes"
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - ValidatorApprovalRemoved event is logged correctly')
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
    console.log(' ✓  - attempt to remove non-existant validator approval fails')
    passed++
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validatorTwo.address,
    restrictedAttribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ' ✓  - attempt to remove validator approval from non-owner account fails'
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
      ' ✓  - attributes are no longer valid after validator approval is revoked'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(
      ' ✓  - attributes invalidated from revoked validator approvals return 0'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘  - tokens can't be sent if validator's attribute approval is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be sent if validator's attribute approval is removed"
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
      ' ✓  - renewing pre-existing validator approvals is supported'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘  - renewing pre-existing validator approvals is supported'
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
      ' ✓  - invalid attributes become valid after renewing validator approval'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttribute(
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
      ' ✓  - attribute values from renewed validator approvals return correctly'
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
      " ✓  - tokens can be sent if validator's attribute approval is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can be sent if validator's attribute approval is renewed"
    )
    failed++
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
    console.log(' ✓  - ValidatorRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to remove non-existant validator fails')
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
      ' ✓  - checks for attributes from removed validators return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(' ✓  - attribute values from removed validators return 0')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘  - tokens cannot be sent after issuing validator is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓  - tokens cannot be sent after issuing validator is removed"
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
    console.log(' ✓  - revoked validators can be renewed')
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
      ' ✓  - attribute checks from renewed validators return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttribute(
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
      ' ✓  - attribute values from renewed validators return correct value'
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
      " ✓  - tokens can be sent after issuing validator is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can be sent after issuing validator is renewed"
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
    console.log(' ✓  - attempt to remove validator from non-owner account fails')
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeTypeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(' ✓  - attempt to remove non-existant attribute type fails')
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
      ' ✓  - checks for attributes from removed attribute types return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(' ✓  - attribute values from removed attribute types return 0')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘  - tokens cannot be sent after required attribute type is removed"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓  - tokens cannot be sent after required attribute type is removed"
    )
    passed++
  })

  await Jurisdiction.methods.getAvailableAttributes().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 1)
    assert.strictEqual(attributeIds[0], restrictedAttribute.attributeId.toString())
    getAvailableAttributesTestTwoPassed = true
    passed++
  }).catch(error => {
    getAvailableAttributesTestTwoPassed = false
    failed++    
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    !attribute.restricted,  // modified to be restricted - how tricky of them...
    attribute.minimumStake,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    console.log(
      ' ✘  - attempt to modify parameters on attribute type renewals fails'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓  - attempt to modify parameters on attribute type renewals fails'
    )
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.restricted,
    attribute.minimumStake,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - revoked attribute types can be renewed when all properties match'
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
      ' ✓  - attribute checks from renewed attribute types return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttribute(
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
      ' ✓  - attribute values from renewed attribute types return correct value'
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
      " ✓  - tokens can be sent after required attribute type is renewed"
    )
    passed++
  }).catch(error => {
    console.log(
      " ✘  - tokens can be sent after required attribute type is renewed"
    )
    failed++
  })

  await Jurisdiction.methods.getAvailableAttributes().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeIds => {
    assert.strictEqual(attributeIds.length, 2)
    assert.strictEqual(attributeIds[1], attribute.attributeId.toString())
    assert.strictEqual(
      attributeIds[0], restrictedAttribute.attributeId.toString()
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
      ' ✓  - attempt to remove attribute types from non-owner account fails'
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
    }  - available attribute IDs are reduced after removal (mid-array is ok)`
  )

  console.log(
    ` ${
      getAvailableAttributesTestThreePassed ? '✓' : '✘'
    }  - available attribute IDs are repopulated (order moved) after renewal`
  )


  await Jurisdiction.methods.removeAttributeFrom(
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
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ users can add an attribute via signed message from approved validator'
    )
    passed++

    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeAdded event is logged correctly')
    passed++
  }).catch(error => {
    console.log(
      ' ✘ users can add an attribute via signed message from approved validator'
    )
    failed++

    console.log(' ✘  - AttributeAdded event is logged correctly')
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
    console.log(' ✓  - external calls for attributes added by users return true')
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, attribute.targetValueTwo.toString())
    console.log(' ✓  - external calls for attributes added by users return the correct value')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot add a duplicate attribute')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo + 1,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot add an attribute with modified parameters')
    passed++
  })

  await Jurisdiction.methods.removeAttribute(
    attribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ users can remove attributes directly')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attribute, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(' ✓  - signed attribute approvals cannot be reused')
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
      ' ✓  - checks for attributes removed by the user directly return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, (0).toString())
    console.log(
      ' ✓  - attribute values from attributes removed by user return 0'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {  
    console.log(
      " ✘  - tokens cannot be sent after a user removes a required attribute"
    )
    failed++
  }).catch(error => {
    console.log(
      " ✓  - tokens cannot be sent after a user removes a required attribute"
    )
    passed++
  })

  await Jurisdiction.methods.removeAttribute(
    attribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot remove an attribute that does not exist')
    passed++
  })

  await Jurisdiction.methods.removeAttribute(
    restrictedAttribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot directly remove a restricted attribute')
    passed++
  })  

  await Jurisdiction.methods.addAttributeType(
    stakedAttribute.attributeId,
    stakedAttribute.restricted,
    stakedAttribute.minimumStake,
    stakedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(' ✓ attributes can require staking ether in order to set them')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    stakedAttribute.targetValidator,
    stakedAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - validators can be approved for setting staked attribute types'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute without providing staked value fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount - 1
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute when msg.value < stake fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount + 1
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute when msg.value > stake fails: bad msgHash'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.badSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 10 ** 3 // stake asked for in badSignature - lower than required
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add if stake == msg.value < minumumRequiredStake fails'
    )
    passed++
  })

  const balance = await web3.eth.getBalance(attributedAddress)

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      ' ✓  - attribute is added if minumumRequiredStake <= stake == msg.value'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘  - attribute is added if minumumRequiredStake <= stake == msg.value'
    )
    failed++
  })

  const updatedBalanceOne = await web3.eth.getBalance(attributedAddress)
  difference = new web3.utils.BN(balance).sub(
    new web3.utils.BN(updatedBalanceOne)
  ).toString()
  expectedDifference = gasCost.add(
    new web3.utils.BN(stakeAmount)
  ).toString()
  assert.strictEqual(difference, expectedDifference)
  console.log(
    ' ✓  - address balance is reduced by the expected amount'
  )
  passed++


  await Jurisdiction.methods.removeAttribute(
    stakedAttribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(' ✓  - users can remove staked attributes directly')
    passed++
  })

  const updatedBalanceTwo = await web3.eth.getBalance(attributedAddress)
  difference = new web3.utils.BN(updatedBalanceOne).sub(
    new web3.utils.BN(updatedBalanceTwo)
  ).toString()
  expectedDifference = gasCost.sub(
    new web3.utils.BN(stakeAmount)
  ).toString()
  assert.strictEqual(difference, expectedDifference)
  console.log(
    ' ✓  - address balance is credited by the expected amount'
  )
  passed++

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 10 ** 3
  }).catch(error => {
    console.log(
      " ✓  - validators can't add attribute if minumumRequiredStake > msg.value"
    )
    passed++
  })

  const validatorBalance = await web3.eth.getBalance(validator.address)

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount * 2
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      ' ✓  - validators can add attribute if minumumRequiredStake == msg.value'
    )
    passed++
  })

  const validatorBalanceOne = await web3.eth.getBalance(validator.address)
  difference = new web3.utils.BN(validatorBalance).sub(
    new web3.utils.BN(validatorBalanceOne)
  ).toString()
  expectedDifference = gasCost.add(
    new web3.utils.BN(stakeAmount).mul(
      new web3.utils.BN(2)
    )
  ).toString()
  assert.strictEqual(difference, expectedDifference)
  console.log(
    ' ✓  - validator address balance is reduced by the expected amount'
  )
  passed++

  jurisdictionSubmitterBalance = await web3.eth.getBalance(address)

  await Jurisdiction.methods.removeAttributeFrom(
    attributedAddress,
    stakedAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      " ✓  - jurisdiction owner can remove a staked attribute"
    )
    passed++
  })

  const expectedTransactionRebate = new web3.utils.BN(10 ** 9).mul(
    new web3.utils.BN(expectedTransactionGas)
  )

  const updatedJurisdictionSubmitterBalance = await web3.eth.getBalance(address)
  difference = new web3.utils.BN(updatedJurisdictionSubmitterBalance).sub(
    new web3.utils.BN(jurisdictionSubmitterBalance)
  )
  expectedDifference = expectedTransactionRebate.sub(gasCost)
  assert.strictEqual(difference.toString(), expectedDifference.toString())
  console.log(
    ' ✓  - address balance is credited by the expected amount'
  )
  passed++
  
  console.log(
    " ✓  - jurisdiction's submitter gets transaction rebate from stake if s>t"
  )
  passed++

  const validatorBalanceTwo = await web3.eth.getBalance(validator.address)
  difference = new web3.utils.BN(validatorBalanceTwo).sub(
    new web3.utils.BN(validatorBalanceOne)
  )
  expectedDifference = new web3.utils.BN(stakeAmount).mul(
    new web3.utils.BN(2)
  ).sub(
    expectedTransactionRebate
  )
  assert.strictEqual(difference.toString(), expectedDifference.toString())
  console.log(
    ' ✓  - validator gets back remaining staked amount when owner calls if paid'
  )
  passed++

  // TODO: jurisdiction's submitter gets back back the total stake if s<=t

  // TODO: validator gets back remaining staked amount if paid when user calls

  // TODO: validator's submitter gets back transaction cost from stake if s>t
  
  // TODO: validator's submitter gets back the total stake if s<=t

  // TODO: *** users can renew staked attributes by using a new signature ***
  // (this will require modifying the required staked amount slightly)

  // TODO: users can remove invalidated attributes and reclaim the stake
  // (this requires testing removed attribute types, validators, and approvals)

  // TODO: handle all failed test cases - a bunch will halt testing if they fail

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )
  process.exit()

}

test()
