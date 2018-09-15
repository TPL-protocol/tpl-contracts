var assert = require('assert');

const JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
const TPLTokenContractData = require('../build/contracts/TPLToken.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

async function signValidation(validatorSigningKeyAccount, jurisdiction, who, fundsRequired, validatorFee, attribute, value) {
  return web3.eth.sign(
    web3.utils.soliditySha3(
      {t: 'address', v: jurisdiction},
      {t: 'address', v: who},
      {t: 'uint256', v: fundsRequired}, // stake + jurisdiction & validator fees
      {t: 'uint256', v: validatorFee},
      {t: 'uint256', v: attribute},
      {t: 'uint256', v: value}
    ),
    validatorSigningKeyAccount
  )
}

async function testGas() {
  // set to 0 for small, 1 for basic, maxUint256 for big attribute check
  // then set smallAttribute, basicAttribute, or bigAttribute var to `attribute`
  const tokenAttributeID = 0

  let gasUsage = {}
  let passed = 0
  let failed = 0
  console.log('running gas tests and obtaining metrics...')
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
  const oneAddress = '0x0000000000000000000000000000000000000001'
  const maxAddress = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'
  const maxAddressTwo = '0xffffFFFfFFffffffffffffffFfFFFfffFFFfFFfE'
  const maxUint256 = (
    '115792089237316195423570985008687907853269984665640564039457584007913129' +
    '639935'
  )

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const TPLTokenDeployer = new web3.eth.Contract(
    TPLTokenContractData.abi
  )

  // set up some variables that will be used for tracking account balances
  let balance = new web3.utils.BN()
  let updatedBalanceOne = new web3.utils.BN()
  let updatedBalanceTwo = new web3.utils.BN()
  let validatorBalance = new web3.utils.BN()
  let validatorBalanceOne = new web3.utils.BN()
  let validatorBalanceTwo = new web3.utils.BN()
  let expectedTransactionRebate = new web3.utils.BN()
  let updatedJurisdictionSubmitterBalance = new web3.utils.BN()
  let gasCost = new web3.utils.BN()
  let difference = new web3.utils.BN()
  let expectedDifference = new web3.utils.BN()
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
    gas: 5999999,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  const TPLToken = await TPLTokenDeployer.deploy(
    {
      data: TPLTokenContractData.bytecode,
      arguments: [Jurisdiction.options.address, tokenAttributeID, 100]
    }
  ).send({
    from: address,
    gas: 1999999,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  // **************************** begin testing ***************************** //

  console.log(' ✓ jurisdiction contract deployment uses less than 6M gas')
  passed++

  await Jurisdiction.methods.owner().call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓ jurisdiction owner check uses less than 25K gas')
    passed++
  })

  console.log(
    ' ✓ mock token contract deployment uses less than 2M gas'
  )
  passed++

  await TPLToken.methods.getRegistryAddress().call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, Jurisdiction.options.address)
    console.log(
      ' ✓ getRegistryAddress check uses less than 25k gas'
    )
    passed++
  })
  
  await TPLToken.methods.balanceOf(address).call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(balance => {
    assert.strictEqual(balance, (100).toString())
    console.log(' ✓ balanceOf uses less than 25k gas')
    passed++
  })

  // create stub objects that will be used for setting and comparing values
  const validator = {
    address: validatorAddress,
    //address: '0x0000000000000000000000000000000000000001',
    description: 'validator',
    replacementSigningKey: address
  }

  const validatorTwo = {
    address: addresses[2],
    description: 'VALIDATOR_TWO_DESCRIPTION',
    replacementSigningKey: address
  }

  const attribute = {
    category: 'minimum-size attribute',
    attributeId: tokenAttributeID,
    restricted: false,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: '',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 0,
    targetValueTwo: 0,
    targetTwoSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      tokenAttributeID,
      0
    )
  }

  const basicAttribute = {
    category: 'basic-size attribute',
    attributeId: tokenAttributeID,
    restricted: false,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'Attribute Type',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 1,
    targetValueTwo: 1,
    targetTwoSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      tokenAttributeID,
      1
    )
  }

  // set this as `attribute` to test for high-cost versions; toggle `restricted`
  // to false for checking the final tests (they will fail otherwise)
  const bigAttribute = {
    category: 'maximum-size attribute',
    attributeId: tokenAttributeID,
    restricted: false,
    minimumStake: 999999999999999,
    jurisdictionFee: 999999999999999,
    description: 'Attribute Type',
    targetValidator: validatorAddress,
    validatorFee: 999999999999999,
    targetValue: maxUint256,
    targetValueTwo: maxUint256,
    targetTwoSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      999999999999999 * 3,
      999999999999999,
      tokenAttributeID,
      maxUint256
    )
  }

  const restrictedAttribute = {
    attributeId: 22222,
    restricted: true,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_RESTRICTED',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 55555,
    targetSignature: await signValidation(
      validator.replacementSigningKey,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      22222,
      55555
    )
  }

  const stakedAttribute = {
    attributeId: 33333,
    restricted: false,
    minimumStake: 10 ** 5,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_STAKED',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 66666,
    targetSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      2 * 10 ** 14,
      0,
      33333,
      66666
    ),
    badSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      10 ** 3,
      0,
      33333,
      66666
    )
  }

  const stakedFeeAttribute = {
    attributeId: 77777,
    restricted: false,
    minimumStake: 10 ** 5,
    jurisdictionFee: 10 ** 7,
    description: 'VALID_ADDRESS_ATTRIBUTE_STAKED',
    targetValidator: validator.address,
    validatorFee: 10 ** 8,
    targetValue: 88888,
    targetSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      2 * 10 ** 14 + 10 ** 7 + 10 ** 8, // fundsRequired: stake, j. fee, v. fee
      10 ** 8,
      77777,
      88888
    ),
    badSignature: await signValidation(
      validatorAddress,
      Jurisdiction.options.address,
      attributedAddress,
      10 ** 3,
      10 ** 8,
      77777,
      88888
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
    gasUsage['addValidator'] = receipt.gasUsed
    passed++
  })

  await Jurisdiction.methods.getAvailableValidators(
  ).call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 1)
    assert.strictEqual(validators[0], validatorAddress)
    console.log(
      ' ✓ getAvailableValidators uses less than 25K gas when list is short'
    )
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
  })

  await Jurisdiction.methods.getAvailableValidators(
  ).call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(validators => {
    assert.strictEqual(validators.length, 2)
    assert.strictEqual(validators[0], validatorAddress)
    assert.strictEqual(validators[1], validatorTwo.address)
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.restricted,
    attribute.minimumStake,
    attribute.jurisdictionFee,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    gasUsage['addAttributeType'] = receipt.gasUsed
  })

  await Jurisdiction.methods.addAttributeType(
    restrictedAttribute.attributeId, // not a duplicate
    restrictedAttribute.restricted,
    restrictedAttribute.minimumStake,
    restrictedAttribute.jurisdictionFee,
    restrictedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
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
    gasUsage['addValidatorApproval'] = receipt.gasUsed
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
  })

  await Jurisdiction.methods.isApproved(
    attribute.targetValidator,
    attribute.attributeId
  ).call({
    from: address,
    gas: 26999,
    gasPrice: 10 ** 9,
  }).then(isApproved => {
    assert.ok(isApproved)
    console.log(
      ' ✓ external calls to check for validator approvals use less than 27K'
    )
    passed++
  })

  await Jurisdiction.methods.isApproved(
    validatorTwo.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 26999,
    gasPrice: 10 ** 9
  }).then(isApproved => {
    assert.strictEqual(isApproved, false)
    console.log(
      ' ✓ calls return false for unapproved validators with less than 27k'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 115056,
    gasPrice: 10 ** 9,
    value: attribute.minimumStake + attribute.jurisdictionFee
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['addAttributeTo'] = receipt.gasUsed

    console.log(' ✓ successful addAttributeTo costs 115056 gas or less')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 26927,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(' ✓ successful hasAttribute checks cost 26927 gas or less')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 26927,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    gasUsage['hasAttribute (success)'] = receipt.gasUsed
  })

  await Jurisdiction.methods.hasAttribute(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 26187,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(' ✓ failed hasAttribute checks cost 26187 gas or less')
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    inattributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 26187,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    gasUsage['hasAttribute (failure)'] = receipt.gasUsed
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 27628,
    gasPrice: 10 ** 9
  }).then(attributeValue => { 
    assert.strictEqual(attribute.targetValue.toString(), attributeValue)
    console.log(' ✓ successful getAttribute checks cost 27628 gas or less')
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 27628,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    gasUsage['getAttribute (success)'] = receipt.gasUsed
  })


  await Jurisdiction.methods.getAttribute(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 26504,
    gasPrice: 10 ** 9
  }).then(attributeValue => { 
    assert.strictEqual(attributeValue, '0')
    console.log(' ✓ failed getAttribute checks cost 26504 gas or less')
    passed++
  })

  await Jurisdiction.methods.getAttribute(
    inattributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 26504,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    gasUsage['getAttribute (failure)'] = receipt.gasUsed
  }) 

  await Jurisdiction.methods.addAttributeTo(
    attributedAddress,
    restrictedAttribute.attributeId,
    restrictedAttribute.targetValue
  ).send({
    from: validatorTwo.address,
    gas: 115056,
    gasPrice: 10 ** 9,
    value: restrictedAttribute.minimumStake + restrictedAttribute.jurisdictionFee
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.addAttributeTo(
    address,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 115056,
    gasPrice: 10 ** 9,
    value: attribute.minimumStake + attribute.jurisdictionFee
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 55755, // 59962: valid from & to, 55755: just valid to, 51548: none
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ permissioned transfers to valid addresses cost 55755 gas or less'
    )
    passed++
    gasUsage['transfer'] = receipt.gasUsed
  }).catch(error => {
    console.log(
      ' ✘  permissioned transfers to valid addresses cost 55755 gas or less'
    )
    failed++
  })

  await Jurisdiction.methods.supportsInterface('0x01ffc9a7').call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓ external calls to check for ERC-165 support cost < 25K gas')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x13a51fda').call({
    from: address,
    gas: 24999,
    gasPrice: 10 ** 9
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓ Registry interface support check also costs < 25K')
    passed++
  })

  await Jurisdiction.methods.getAttributeInformation(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['getAttributeInformation'] = receipt.gasUsed // string description
  })

  await Jurisdiction.methods.modifyValidatorSigningKey(
    validator.replacementSigningKey
  ).send({
    from: validatorAddress,
    gas: 59999,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 42000)
    gasUsage['modifyValidatorSigningKey'] = receipt.gasUsed
    
    console.log(
      ' ✓ modifying a signing key costs <42k after refund, <60k initially'
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeFrom(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 75999,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 41000)
    gasUsage['removeAttributeFrom'] = receipt.gasUsed

    console.log(
      ' ✓ validator removes attribute: costs <41k after refund, <76k initially'
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
    gasPrice: 10 ** 9,
    value: attribute.minimumStake + attribute.jurisdictionFee
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 38000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 19000)
    gasUsage['removeValidatorApproval'] = receipt.gasUsed

    console.log(
      ' ✓ removing attribute approvals costs <19k after refund, <38k initially'
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
  })

  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: 81000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 41000)
    gasUsage['removeValidator'] = receipt.gasUsed

    console.log(
      ' ✓ removing validators costs <41k after refund, <81k initially'
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
  })

  await Jurisdiction.methods.getValidatorInformation(
    validator.address
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['getValidatorInformation'] = receipt.gasUsed
  })

  await Jurisdiction.methods.getAvailableValidators(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['getAvailableValidators'] = receipt.gasUsed
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 139999,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 70000)
    gasUsage['removeAttributeType'] = receipt.gasUsed

    console.log(
      ' ✓ removing attribute types costs <70k after refund, <140k initially'
    )
    passed++
  })

  await Jurisdiction.methods.getAvailableAttributes().send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['getAvailableAttributes'] = receipt.gasUsed
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.restricted,
    attribute.minimumStake,
    attribute.jurisdictionFee,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.removeAttributeFrom(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.minimumStake + attribute.jurisdictionFee + attribute.validatorFee,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).call({
    from: attributedAddress,
    gas: 41999,
    gasPrice: 10 ** 9
  }).then(canAdd => {
    assert.ok(canAdd)
    console.log(
      ' ✓ checks if signed messages are valid cost < 42K'
    )
    passed++
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.minimumStake + attribute.jurisdictionFee + attribute.validatorFee,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 41999,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasUsage['canAddAttribute (success)'] = receipt.gasUsed
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo + 1,
    attribute.minimumStake + attribute.jurisdictionFee + attribute.validatorFee,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 37999,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ failed checks if signed messages are valid cost < 38K'
    )
    gasUsage['canAddAttribute (failure)'] = receipt.gasUsed
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: addresses[2],
    gas: 156999,
    gasPrice: 10 ** 9,
    value: attribute.minimumStake + attribute.jurisdictionFee + attribute.validatorFee
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ users can add an attribute via signed message for < 157K (maximum!)'
    )
    passed++
    gasUsage['addAttribute'] = receipt.gasUsed

  }).catch(error => {
    console.log(
      ' ✘ users can add an attribute via signed message for < 157K (maximum!)'
    )
    failed++
  })

  // comment this test out when checking restricted: true on bigAttribute
  await Jurisdiction.methods.removeAttribute(
    attribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 63999,
    gasPrice: 10 ** 9,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    assert.ok(receipt.gasUsed < 41000)
    gasUsage['removeAttribute'] = receipt.gasUsed
    console.log(
      ' ✓ users removing attributes costs <41k after refund, <64k initially'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘ users removing attributes costs <41k after refund, <64k initially'
    )
    failed++
  })

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )

  console.log(`\nGas usage metrics (${attribute.category}):`)
  Object.keys(gasUsage).sort().forEach(key => {
    console.log(` - ${key}: ${gasUsage[key]}`)
  })

  process.exit()
}

testGas()
