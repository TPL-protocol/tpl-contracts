var assert = require('assert');

const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const TPLTokenContractData = require('../../build/contracts/TPLERC20RestrictedReceiverInstance.json')

module.exports = {test: async function (provider, testingContext) {
  var web3 = provider

  function getAttributeApprovalHash(
    jurisdictionAddress,
    assigneeAddress,
    operatorAddress, // set to 0 when assigned personally
    fundsRequired, // stake + jurisdiction fee + validator fee
    validatorFee,
    attributeID,
    attributeValue
  ) {
    if (operatorAddress === 0) {
      operatorAddress = '0x0000000000000000000000000000000000000000'
    }
    return web3.utils.soliditySha3(
      {t: 'address', v: jurisdictionAddress},
      {t: 'address', v: assigneeAddress},
      {t: 'address', v: operatorAddress},
      {t: 'uint256', v: fundsRequired},
      {t: 'uint256', v: validatorFee},
      {t: 'uint256', v: attributeID},
      {t: 'uint256', v: attributeValue}
    )
  }

  async function signValidation(
    validatorSigningKey,
    jurisdictionAddress,
    assigneeAddress,
    operatorAddress,
    fundsRequired, // stake + jurisdiction fee + validator fee
    validatorFee,
    attributeID,
    attributeValue
  ) {
    return web3.eth.sign(
      getAttributeApprovalHash(
        jurisdictionAddress,
        assigneeAddress,
        operatorAddress,
        fundsRequired,
        validatorFee,
        attributeID,
        attributeValue
      ),
      validatorSigningKey
    )
  }
  
  // NOTE: still needs additional tests written to cover fees and related events

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

  // NaughtyRegistry contract just throws when calling hasAttribute / getAttribute
  const NaughtyRegistryContractData = {
    "abi": [
      {
        "constant": true,
        "inputs": [
          {
            "name": "_who",
            "type": "address"
          },
          {
            "name": "_attribute",
            "type": "uint256"
          }
        ],
        "name": "hasAttribute",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_who",
            "type": "address"
          },
          {
            "name": "_attribute",
            "type": "uint256"
          }
        ],
        "name": "getAttribute",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ],
    "bytecode": "0x608060405234801561001057600080fd5b50610151806100206000396000f30060806040526004361061004c576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680634b5f297a14610051578063c2ee4190146100b6575b600080fd5b34801561005d57600080fd5b5061009c600480360381019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610117565b604051808215151515815260200191505060405180910390f35b3480156100c257600080fd5b50610101600480360381019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061011e565b6040518082815260200191505060405180910390f35b6000806000fd5b6000806000fd00a165627a7a723058209e08fb8dd84f961b5f82aed443c53712d6e9682182a4f81dd8db090b3a287f6a0029",
  }

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const TPLTokenDeployer = new web3.eth.Contract(
    TPLTokenContractData.abi
  )

  const NaughtyRegistryDeployer = new web3.eth.Contract(
    NaughtyRegistryContractData.abi
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
  let expectedTransactionGas = 37700

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
    process.exit(1)
  })

  const SecondaryJurisdiction = await JurisdictionDeployer.deploy(
    {
      data: JurisdictionContractData.bytecode
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })

  const TPLToken = await TPLTokenDeployer.deploy(
    {
      data: TPLTokenContractData.bytecode,
      arguments: [100, Jurisdiction.options.address, 11111]
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })

  const NaughtyRegistry = await NaughtyRegistryDeployer.deploy(
    {
      data: NaughtyRegistryContractData.bytecode
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })

  // **************************** begin testing ***************************** //

  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

  await Jurisdiction.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓  - jurisdiction owner is set to the correct address')
    passed++
  })

  console.log(
    ' ✓  - token contract referencing jurisdiction deploys successfully'
  )
  passed++

  await TPLToken.methods.getRegistry().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, Jurisdiction.options.address)
    console.log(
      ' ✓  - registry utilized by token is set to the jurisdiction address'
    )
    passed++
  })

  await Jurisdiction.methods.recoverableTokens(TPLToken.options.address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(tokens => {
    assert.strictEqual(tokens, '0')
    console.log(
      ' ✓  - recoverable token balance of registry is initially zero'
    )
    passed++
  })

  await TPLToken.methods.balanceOf(address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(balance => {
    assert.strictEqual(balance, (100).toString())
    console.log(' ✓  - deploying address has the correct balance')
    passed++
  })

  await TPLToken.methods.transfer(inattributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be transferred before valid attributes are assigned"
    )
    passed++
  })

  await Jurisdiction.methods.recoverTokens(
    TPLToken.options.address,
    inattributedAddress,
    0
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - tokens cannot be recovered before attribute is assigned'
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
    targetTwoSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      0,
      11111,
      67890
    ),
    targetTwoOperatorSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      inattributedAddress,
      0,
      0,
      11111,
      67890
    ),
    signatureToInvalidate: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      0,
      11111,
      37373
    ),
    targetThreeSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      unownedAddress,
      inattributedAddress,
      0,
      0,
      11111,
      28282
    ),    
  }

  const restrictedAttribute = {
    attributeId: 22222,
    restricted: true,
    onlyPersonal: false,
    secondarySource: nullAddress,
    secondaryId: 0,
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
      0,
      22222,
      55555
    )
  }

  const stakedAttribute = {
    attributeId: 33333,
    restricted: false,
    onlyPersonal: false,
    secondarySource: nullAddress,
    secondaryId: 0,
    minimumStake: 10 ** 5,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_STAKED',
    targetValidator: validatorAddress,
    validatorFee: 0,
    targetValue: 66666,
    targetSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      2 * 10 ** 14,
      0,
      33333,
      66666
    ),
    badSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      10 ** 3,
      0,
      33333,
      66666
    )
  }

  const stakedFeeAttribute = {
    attributeId: 77777,
    restricted: false,
    onlyPersonal: false,
    secondarySource: nullAddress,
    secondaryId: 0,
    minimumStake: 10 ** 5,
    jurisdictionFee: 10 ** 7,
    description: 'VALID_ADDRESS_ATTRIBUTE_STAKED',
    targetValidator: validator.address,
    validatorFee: 10 ** 8,
    targetValue: 88888,
    targetSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      2 * 10 ** 14 + 10 ** 7 + 10 ** 8, // fundsRequired: stake, j. fee, v. fee
      10 ** 8,
      77777,
      88888
    ),
    targetOperatorSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      inattributedAddress,
      2 * 10 ** 14 + 10 ** 7 + 10 ** 8, // fundsRequired: stake, j. fee, v. fee
      10 ** 8,
      77777,
      88888
    ),
    badSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      0,
      10 ** 3,
      10 ** 8,
      77777,
      88888
    )
  }

  const undefinedAttributeId = 44444

  const secondaryAttribute = {
    attributeId: 99999,
    restricted: false,
    onlyPersonal: false,
    secondarySource: SecondaryJurisdiction.options.address,
    secondaryId: 10101,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_SECONDARY',
    targetValidator: validator.address,
    validatorFee: 0,
    targetValue: 20202,
    newTargetValue: 30303
  }

  const onlyPersonalAttribute = {
    attributeId: 63636,
    restricted: false,
    onlyPersonal: true,
    secondarySource: nullAddress,
    secondaryId: 0,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'VALID_ADDRESS_ATTRIBUTE_ONLY_PERSONAL',
    targetValidator: validator.address,
    validatorFee: 0,
    targetValue: 36363,
    badSignature: await signValidation(
      validator.address,
      Jurisdiction.options.address,
      attributedAddress,
      inattributedAddress,
      0,
      0,
      63636,
      36363
    )
  }

  const badSecondaryAttribute = {
    attributeId: 40404,
    restricted: false,
    onlyPersonal: false,
    secondarySource: badAddress,
    secondaryId: 70707,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'BAD_ADDRESS_ATTRIBUTE_SECONDARY',
    targetValidator: 0,
    validatorFee: 0,
    targetValue: 0
  }

  const naughtySecondaryAttribute = {
    attributeId: 40804,
    restricted: false,
    onlyPersonal: false,
    secondarySource: NaughtyRegistry.options.address,
    secondaryId: 70407,
    minimumStake: 0,
    jurisdictionFee: 0,
    description: 'NAUGHTY_ADDRESS_ATTRIBUTE_SECONDARY',
    targetValidator: 0,
    validatorFee: 0,
    targetValue: 0
  }

  await Jurisdiction.methods.addValidator(
    validator.address,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validatorInformation => {
    assert.strictEqual(validatorInformation, validator.description)
    console.log(' ✓  - validator description is correctly accessible')
    passed++
  }) 

  await Jurisdiction.methods.getValidatorSigningKey(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validatorInformation => {
    assert.strictEqual(validatorInformation, validator.address)
    console.log(' ✓  - validator signing key is correctly accessible')
    passed++
  }) 

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validators => {
    assert.strictEqual(validators.length, 1)
    assert.strictEqual(validators[0], validatorAddress)
    console.log(' ✓  - validator is added correctly to the list of validators')
    passed++
  })  

  await Jurisdiction.methods.addValidator(
    validatorTwo.address,
    validatorTwo.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - multiple validators may be added')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validators => {
    assert.strictEqual(validators.length, 2)
    assert.strictEqual(validators[0], validatorAddress)
    assert.strictEqual(validators[1], validatorTwo.address)
    console.log(
      ' ✓  - multiple validators are added correctly to the list of validators'
    )
    passed++
  })  

  await Jurisdiction.methods.addValidator(
    nullAddress,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to add validator from non-owner account fails')
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to add new attribute types')
    passed++

    const logs = receipt.events.AttributeTypeAdded.returnValues
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    assert.strictEqual(logs.description, attribute.description)
    console.log(' ✓  - AttributeTypeAdded event is logged correctly')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to add duplicate attribute type fails')
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId + 1, // not a duplicate
    attribute.description
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to add attribute type from non-owner account fails')
    passed++
  }) 

  await Jurisdiction.methods.addRestrictedAttributeType(
    restrictedAttribute.attributeId, // not a duplicate
    restrictedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - adding multiple attribute types is supported')
    passed++
  }) 

  await Jurisdiction.methods.addRestrictedAttributeType(
    restrictedAttribute.attributeId, // duplicate
    restrictedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - adding duplicate restricted attribute types is not supported'
    )
    passed++
  }) 

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to approve validators to assign attributes')
    passed++

    const logs = receipt.events.ValidatorApprovalAdded.returnValues
    assert.strictEqual(logs.validator, attribute.targetValidator)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - ValidatorApprovalAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    undefinedAttributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - adding approvals on multiple validators is supported')
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    attribute.targetValidator,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(isApproved => {
    assert.ok(isApproved)
    console.log(
      ' ✓  - external calls to check for validator approvals are supported'
    )
    passed++
  })

  await Jurisdiction.methods.canIssueAttributeType(
    validatorTwo.address,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(isApproved => {
    assert.strictEqual(isApproved, false)
    console.log(
      ' ✓  - calls return false for unapproved validators'
    )
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validator is able to directly assign approved attributes')
    passed++

    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    restrictedAttribute.attributeId,
    restrictedAttribute.targetValue
  ).send({
    from: validatorTwo.address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - multiple attributes can be added to an address')
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    address,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - attributes can be added to multiple addresses')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.recoverTokens(
    TPLToken.options.address,
    attributedAddress,
    0
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    console.log(
      ' ✓  - tokens can be "recovered" once attribute is assigned'
    )
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to add duplicate attribute fails')
    passed++
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    undefinedAttributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to add undefined attribute type fails')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x01ffc9a7').call({
    from: address,
    gas: 300000,
    gasPrice: 10 ** 1
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(' ✓ external calls to check for ERC-165 support are successful')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0xffffffff').call({
    from: address,
    gas: 300000,
    gasPrice: 10 ** 1
  }).then(isSupported => { 
    assert.strictEqual(isSupported, false)
    console.log(' ✓  - interface support check for 0xffffffff fails as expected')
    passed++
  })

  await Jurisdiction.methods.supportsInterface('0x5f46473f').call({
    from: address,
    gas: 300000,
    gasPrice: 10 ** 1
  }).then(isSupported => { 
    assert.ok(isSupported)
    console.log(
      ' ✓  - Attribute Registry interface support check is successful'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(' ✓  - unassigned attributes return false')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, attribute.targetValue.toString())
    console.log(" ✓ external calls retrieve an address's attribute value")
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    restrictedAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, restrictedAttribute.targetValue.toString())
    console.log(' ✓  - addresses can have multiple separate attribute values')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - getting undefined attribute types will revert')
    passed++
  })
 
  await Jurisdiction.methods.getAttributeValue(
    inattributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - getting unassigned attributes will revert')
    passed++
  })

  await Jurisdiction.methods.getAttributeTypeInformation(
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getAttributeTypeInformation(
    undefinedAttributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeInformation => {
    assert.strictEqual(attributeInformation.description, '')
    assert.strictEqual(attributeInformation.isRestricted, false)
    assert.strictEqual(attributeInformation.minimumRequiredStake, (0).toString())
    console.log(' ✓  - undefined attribute types return empty values')
    passed++
  })

  await Jurisdiction.methods.countAttributeTypes().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeIds => {
    assert.strictEqual(attributeIds, '2')
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
    gasPrice: 10 ** 1
  }).then(attributeId => {
    assert.strictEqual(attributeId, attribute.attributeId.toString())
    passed++
  }).catch(error => {
    getAvailableAttributesTestOnePassed = false
    failed++
  })

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.setValidatorSigningKey(
    validator.replacementSigningKey
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getValidatorSigningKey(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validatorInformation => {
    assert.strictEqual(validatorInformation, validator.replacementSigningKey)
    console.log(' ✓  - external calls retrieve new signing key on validator')
    passed++
  })

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validatorInformation => {
    assert.strictEqual(validatorInformation, validator.description)
    console.log(' ✓  - external calls retrieve same description on validator')
    passed++
  })

  await Jurisdiction.methods.setValidatorSigningKey(
    validator.replacementSigningKey
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to set signing key to an existing key fails')
    passed++
  })

  await Jurisdiction.methods.setValidatorSigningKey(
    validatorAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(receipt => { 
    console.log(
      " ✘  - attempt to add validator with same address as a signing key fails"
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add validator with same address as a signing key fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
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
    gasPrice: 10 ** 1
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(
      ' ✓  - attributes from validators with modified signing keys return true'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ validator is able to directly remove attributes it approved')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - validator cannot remove attributes that do not exist')
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    restrictedAttribute.attributeId
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - validators can renew attributes on an old addresses')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove validator attribute approvals')
    passed++

    const logs = receipt.events.ValidatorApprovalRemoved.returnValues
    assert.strictEqual(logs.validator, validator.address)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - ValidatorApprovalRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => { 
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - attributes are no longer valid after validator approval is revoked'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - attributes invalidated from revoked validator approvals revert'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => { 
    assert.ok(attributeExists)
    console.log(
      ' ✓  - invalid attributes become valid after renewing validator approval'
    )
    passed++  
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove validators')
    passed++

    const logs = receipt.events.ValidatorRemoved.returnValues
    assert.strictEqual(logs.validator, validator.address)
    console.log(' ✓  - ValidatorRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validators => {
    assert.strictEqual(validators.length, 1)
    assert.strictEqual(validators[0], validatorTwo.address)
    console.log(
      ' ✓  - validators are removed correctly from the list of validators'
    )
    passed++
  })

  await Jurisdiction.methods.removeValidator(
    validator.address
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for attributes from removed validators return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attribute values from removed validators revert')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - revoked validators can be renewed')
    passed++
  })

  await Jurisdiction.methods.getValidatorDescription(
    validator.address
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validatorInformation => {
    assert.strictEqual(validatorInformation, validator.description)
    console.log(' ✓  - external calls can retrieve information on a validator')
    passed++
  })

  await Jurisdiction.methods.getValidators(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(validators => {
    assert.strictEqual(validators.length, 2)
    assert.strictEqual(validators[0], validatorTwo.address)
    assert.strictEqual(validators[1], validatorAddress)
    console.log(
      ' ✓  - renewed validators are added correctly to the list of validators'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - attribute checks from renewed validators return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - attribute values from renewed validators revert'
    )
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    validator.address,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - renewing pre-existing validator approvals post-renewal supported'
    )
    passed++
  }).catch(error => {
    console.log(
      ' ✘  - renewing pre-existing validator approvals post-renewal supported'
    )
    failed++    
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, true)
    console.log(
      ' ✓  - attribute checks from reapproved attribute types return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(
      attributeValue,
      attribute.targetValue.toString()
    )
    console.log(
      ' ✓  - attribute values from reapproved attribute types return correctly'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be sent after validator renewal until reapproval"
    )
    failed++
  })

  await Jurisdiction.methods.removeValidator(
    validatorAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attempt to remove validator from non-owner account fails')
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner can remove attribute types')
    passed++

    const logs = receipt.events.AttributeTypeRemoved.returnValues
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeTypeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for attributes from removed attribute types return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(' ✓  - attribute values from removed attribute types revert')
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    attribute.description + 'X' // modified description - how tricky of them...
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    console.log(
      ' ✘  - attempt to modify description on attribute type renewals fails'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓  - attempt to modify description on attribute type renewals fails'
    )
    passed++
  }) 

  await Jurisdiction.methods.addRestrictedAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    console.log(
      ' ✘  - attempt to modify restricted status on renewals fails'
    )
    failed++
  }).catch(error => {
    console.log(
      ' ✓  - attempt to modify restricted status on renewals fails'
    )
    passed++
  }) 

  await Jurisdiction.methods.addAttributeType(
    attribute.attributeId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, true)
    console.log(
      ' ✓  - attribute checks from renewed attribute types return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getAttributeTypeIDs().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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

  await Jurisdiction.methods.getAttributeTypeID(
    2
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      " ✓  - Out-of-range attribute type IDs revert"
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeType(
    attribute.attributeId
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
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


  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to directly remove attributes')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    0,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.ok(canAdd)
    console.log(
      ' ✓ users can check if signed messages from approved validator are valid'
    )
    passed++
  })

  await Jurisdiction.methods.canAddAttributeFor(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValueTwo,
    0,
    attribute.validatorFee,
    attribute.targetTwoOperatorSignature
  ).call({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.ok(canAdd)
    console.log(
      ' ✓ operator can check if signed msgs from approved validator are valid'
    )
    passed++
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo + 1,
    0,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, false)
    console.log(
      ' ✓  - altered signed messages from approved validator are invalid'
    )
    passed++
  })

  await Jurisdiction.methods.canAddAttributeFor(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValueTwo + 1,
    0,
    attribute.validatorFee,
    attribute.targetTwoOperatorSignature
  ).call({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, false)
    console.log(
      ' ✓ altered signed operator messages from approved validator are invalid'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeApprovalHash(
    attributedAddress,
    nullAddress,
    attribute.attributeId,
    attribute.invalidatedTargetValue,
    0,
    attribute.validatorFee
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(hash => {
    assert.strictEqual(hash, getAttributeApprovalHash(
      Jurisdiction.options.address,
      attributedAddress,
      0,
      0,
      attribute.validatorFee,
      attribute.attributeId,
      attribute.invalidatedTargetValue
    ))
    console.log(
      ' ✓  - attribute approval hashes are correctly constructed'
    )
    passed++
  })

  // make sure that the attribute is ok before invalidating
  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.invalidatedTargetValue,
    0,
    attribute.validatorFee,
    attribute.signatureToInvalidate
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, true)
  })

  await Jurisdiction.methods.invalidateAttributeApproval(
    getAttributeApprovalHash(
      Jurisdiction.options.address,
      attributedAddress,
      nullAddress,
      0,
      attribute.validatorFee,
      attribute.attributeId,
      attribute.invalidatedTargetValue
    ),
    attribute.signatureToInvalidate
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - non-validators cannot invalidate a signed attribute approval'
    )
    passed++
  }) 

  await Jurisdiction.methods.invalidateAttributeApproval(
    getAttributeApprovalHash(
      Jurisdiction.options.address,
      attributedAddress,
      nullAddress,
      0,
      attribute.validatorFee,
      attribute.attributeId,
      attribute.invalidatedTargetValue
    ),
    attribute.signatureToInvalidate
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - validators can invalidate signed attribute approvals')
    passed++
  })  

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.invalidatedTargetValue,
    0,
    attribute.validatorFee,
    attribute.signatureToInvalidate
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, false)
    console.log(
      ' ✓  - attribute approval validity checks return false after invalidation'
    )
    passed++    
  })

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    attribute.attributeId,
    attribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    0,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, false)
    console.log(
      ' ✓  - checks to add an attribute if one already exists return false'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - users cannot add an attribute if one already exists'
    )
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    attribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
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
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
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

  await Jurisdiction.methods.canAddAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    0,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).call({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(canAdd => {
    assert.strictEqual(canAdd, false)
    console.log(
      ' ✓  - users cannot reuse signed messages from approved validator'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.ok(attributeExists)
    console.log(' ✓  - external calls for attributes added by users return true')
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, attribute.targetValueTwo.toString())
    console.log(' ✓  - external calls for attributes added by users return the correct value')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot add a duplicate attribute')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo + 1,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
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
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓ users can remove attributes directly')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    attribute.attributeId,
    attribute.targetValueTwo,
    attribute.validatorFee,
    attribute.targetTwoSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
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
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for attributes removed by the user directly return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    attribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - attribute values from attributes removed by user revert'
    )
    passed++
  })

  await TPLToken.methods.transfer(attributedAddress, 10).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1,
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
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(' ✓  - users cannot directly remove a restricted attribute')
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    stakedAttribute.attributeId,
    stakedAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeMinimumRequiredStake(
    stakedAttribute.attributeId,
    stakedAttribute.minimumStake
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
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
    gasPrice: 10 ** 1
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
    stakedAttribute.validatorFee,
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
    stakedAttribute.validatorFee,
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

  await Jurisdiction.methods.addAttributeFor(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.validatorFee,
    stakedAttribute.targetSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 10 ** 7 + 10 ** 8 + 1
  }).catch(error => {
    console.log(
      ' ✓  - operator attempt to add attribute when stake < minimumStake fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeFor(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.validatorFee,
    stakedAttribute.targetSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount - 1
  }).catch(error => {
    console.log(
      ' ✓  - operator attempt to add attribute when msg.value < stake fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.validatorFee,
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
    stakedAttribute.validatorFee,
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

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 10 ** 8 // jurisdiction fee
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - validators can issue attributes that require jurisdiction fees'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeFor(
    attributedAddress,
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.validatorFee,
    stakedAttribute.targetSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount
  }).catch(error => {
    console.log(
      ' ✓  - operator attempt to add attribute that already exists fails'
    )
    passed++
  })

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    stakedAttribute.attributeId
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - validators can revoke attributes that required jurisdiction fees'
    )
    passed++
  })

  balance = await web3.eth.getBalance(attributedAddress)

  await Jurisdiction.methods.addAttribute(
    stakedAttribute.attributeId,
    stakedAttribute.targetValue,
    stakedAttribute.validatorFee,
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

    const logs = receipt.events.StakeAllocated.returnValues
    assert.strictEqual(logs.staker, attributedAddress)
    assert.strictEqual(logs.attribute, stakedAttribute.attributeId.toString())
    assert.strictEqual(logs.amount, stakeAmount.toString())
    console.log(' ✓  - StakeAllocated event is logged correctly')
    passed++
  }).catch(error => {
    console.log(
      ' ✘  - attribute is added if minumumRequiredStake <= stake == msg.value'
    )
    failed++
  
    console.log(' ✘  - StakeAllocated event is logged correctly')
    failed++
  })

  updatedBalanceOne = await web3.eth.getBalance(attributedAddress)
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

    const logs = receipt.events.StakeRefunded.returnValues
    assert.strictEqual(logs.staker, attributedAddress)
    assert.strictEqual(logs.attribute, stakedAttribute.attributeId.toString())
    assert.strictEqual(logs.amount, stakeAmount.toString())
    console.log(' ✓  - StakeRefunded event is logged correctly')
    passed++

  }).catch(error => {
    console.log(
      ' ✘  - users can remove staked attributes directly'
    )
    failed++
  
    console.log(' ✘  - StakeRefunded event is logged correctly')
    failed++
  })

  updatedBalanceTwo = await web3.eth.getBalance(attributedAddress)
  difference = new web3.utils.BN(updatedBalanceOne).sub(
    new web3.utils.BN(updatedBalanceTwo)
  )
  expectedDifference = new web3.utils.BN(gasCost).sub(
    new web3.utils.BN(stakeAmount)
  )
  if (difference.cmp(expectedDifference) == 0) {
    console.log(
      ' ✓  - address balance is credited by the expected amount'
    )
    passed++
  } else {
    console.log(
      ' ✘  - address balance is credited by the expected amount'
    )
    failed++
  }

  await Jurisdiction.methods.issueAttribute(
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

  validatorBalance = await web3.eth.getBalance(validator.address)

  await Jurisdiction.methods.issueAttribute(
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
      ' ✓  - validators can add attribute if minumumRequiredStake >= msg.value'
    )
    passed++

    const logs = receipt.events.StakeAllocated.returnValues
    assert.strictEqual(logs.staker, validator.address)
    assert.strictEqual(logs.attribute, stakedAttribute.attributeId.toString())
    assert.strictEqual(
      logs.amount,
      new web3.utils.BN(stakeAmount).mul(new web3.utils.BN(2)).toString()
    )
    console.log(' ✓  - StakeAllocated event is logged correctly')
    passed++

  }).catch(error => {
    console.log(
      ' ✘  - validators can add attribute if minumumRequiredStake >= msg.value'
    )
    failed++
  
    console.log(' ✘  - StakeAllocated event is logged correctly')
    failed++
  })

  validatorBalanceOne = await web3.eth.getBalance(validator.address)
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

  await Jurisdiction.methods.revokeAttribute(
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

    expectedTransactionRebate = new web3.utils.BN(10 ** 9).mul(
      new web3.utils.BN(expectedTransactionGas)
    )

    const logs = receipt.events.StakeRefunded.returnValues
    assert.strictEqual(logs.staker, validator.address)
    assert.strictEqual(logs.attribute, stakedAttribute.attributeId.toString())
    assert.strictEqual(
      logs.amount,
      new web3.utils.BN(stakeAmount).mul(
        new web3.utils.BN(2)).sub(
        expectedTransactionRebate
      ).toString()
    )
    console.log(' ✓  - StakeRefunded event is logged correctly')
    passed++

    const logs2 = receipt.events.TransactionRebatePaid.returnValues
    assert.strictEqual(logs2.submitter, address)
    assert.strictEqual(logs2.attribute, stakedAttribute.attributeId.toString())
    assert.strictEqual(logs2.amount, expectedTransactionRebate.toString())
    console.log(' ✓  - TransactionRebatePaid event is logged correctly')
    passed++

  }).catch(error => {
    console.log(
      ' ✘  - jurisdiction owner can remove a staked attribute'
    )
    failed++
  
    console.log(' ✘  - StakeRefunded event is logged correctly')
    failed++

    console.log(' ✘  - TransactionRebatePaid event is logged correctly')
    failed++
  })

  expectedTransactionRebate = new web3.utils.BN(10 ** 9).mul(
    new web3.utils.BN(expectedTransactionGas)
  )

  updatedJurisdictionSubmitterBalance = await web3.eth.getBalance(address)
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

  validatorBalanceTwo = await web3.eth.getBalance(validator.address)
  difference = new web3.utils.BN(validatorBalanceTwo).sub(
    new web3.utils.BN(validatorBalanceOne)
  )
  expectedDifference = new web3.utils.BN(stakeAmount).mul(
    new web3.utils.BN(2)
  ).sub(
    expectedTransactionRebate
  )
  if (difference.cmp(expectedDifference) == 0) {
    console.log(
      ' ✓  - validator gets back remaining staked amount when owner calls if paid'
    )
    passed++
  } else {
    console.log(
      ' ✘  - validator gets back remaining staked amount when owner calls if paid'
    )
    failed++
  }

  await Jurisdiction.methods.setAttributeTypeMinimumRequiredStake(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.minimumStake
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - minimum stake cannot be set on non-existant attribute types'
    )
    passed++
  })

  await Jurisdiction.methods.setAttributeTypeJurisdictionFee(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.jurisdictionFee
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - jurisdiction fees cannot be set on non-existant attribute types'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeMinimumRequiredStake(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.minimumStake
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeJurisdictionFee(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.jurisdictionFee
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(' ✓ attributes can require fees in order to set them')
    passed++
  })

  await Jurisdiction.methods.addValidatorApproval(
    stakedFeeAttribute.targetValidator,
    stakedFeeAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓  - validators can be approved to set attribute types requiring fees'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue,
    stakedFeeAttribute.validatorFee,
    stakedFeeAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute without providing fees fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue,
    stakedFeeAttribute.validatorFee,
    stakedFeeAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount + stakedFeeAttribute.jurisdictionFee + stakedFeeAttribute.validatorFee - 1
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute when msg.value < stake + fees fails'
    )
    passed++
  })

  await Jurisdiction.methods.addAttribute(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue,
    stakedFeeAttribute.validatorFee,
    stakedFeeAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount + stakedFeeAttribute.jurisdictionFee + stakedFeeAttribute.validatorFee + 1
  }).catch(error => {
    console.log(
      ' ✓  - attempt to add attribute when msg.value > stake fails: bad msgHash'
    )
    passed++
  })

  balance = await web3.eth.getBalance(attributedAddress)

  await Jurisdiction.methods.addAttribute(
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue,
    stakedFeeAttribute.validatorFee,
    stakedFeeAttribute.targetSignature
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakeAmount + stakedFeeAttribute.jurisdictionFee + stakedFeeAttribute.validatorFee
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      ' ✓  - attribute is added if msg.value == stake + fees'
    )
    passed++

    const logs = receipt.events.StakeAllocated.returnValues
    assert.strictEqual(logs.staker, attributedAddress)
    assert.strictEqual(logs.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs.amount, new web3.utils.BN(stakeAmount).toString())
    console.log(' ✓  - StakeAllocated event is logged correctly')
    passed++

    const logs2 = receipt.events.FeePaid[0].returnValues // jurisdiction fees
    assert.strictEqual(logs2.recipient, address)
    assert.strictEqual(logs2.payee, attributedAddress)
    assert.strictEqual(logs2.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs2.amount, stakedFeeAttribute.jurisdictionFee.toString())
    console.log(' ✓  - FeePaid event for jurisdiction is logged correctly')
    passed++

    const logs3 = receipt.events.FeePaid[1].returnValues // validator fees
    assert.strictEqual(logs3.recipient, validator.address)
    assert.strictEqual(logs3.payee, attributedAddress)
    assert.strictEqual(logs3.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs3.amount, stakedFeeAttribute.validatorFee.toString())
    console.log(' ✓  - FeePaid event for validator is logged correctly')
    passed++

  }).catch(error => {
    console.log(
      ' ✘  - attribute is added if msg.value == stake + fees'
    )
    failed++
  
    console.log(' ✘  - StakeAllocated event is logged correctly')
    failed++

    console.log(' ✘  - FeePaid event for jurisdiction is logged correctly')
    failed++

    console.log(' ✘  - FeePaid event for validator is logged correctly')
    failed++
  })

  updatedBalanceOne = await web3.eth.getBalance(attributedAddress)
  difference = new web3.utils.BN(balance).sub(
    new web3.utils.BN(updatedBalanceOne)
  )
  expectedDifference = gasCost.add(
    new web3.utils.BN(stakeAmount).add(
    new web3.utils.BN(stakedFeeAttribute.jurisdictionFee)).add(
    new web3.utils.BN(stakedFeeAttribute.validatorFee))
  )
  
  if (difference.cmp(expectedDifference) == 0) {
    console.log(
      ' ✓  - address balance is reduced by the expected amount'
    )
    passed++
  } else {
    console.log(
      ' ✘  - address balance is reduced by the expected amount'
    )
    failed++
  }


  // TODO: jurisdiction owner address balance is credited by the expected amount
  // TODO: validator address balance is credited by the expected amount

  await Jurisdiction.methods.removeAttribute(
    stakedFeeAttribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(' ✓  - users can remove attributes with fees directly')
    passed++
  }).catch(error => {
    console.log(
      ' ✘  - users can remove attributes with fees directly'
    )
    failed++   
  })

  updatedBalanceTwo = await web3.eth.getBalance(attributedAddress)
  difference = new web3.utils.BN(updatedBalanceOne).sub(
    new web3.utils.BN(updatedBalanceTwo)
  )
  expectedDifference = gasCost.sub(
    new web3.utils.BN(stakeAmount)
  )
  if (expectedDifference.cmp(difference) == 0) {
    console.log(
      ' ✓  - address balance is credited by the expected amount'
    )
    passed++
  } else {
    console.log(difference.toString(), expectedDifference.toString())
    console.log(difference.sub(expectedDifference).toString())
    console.log(
      ' ✘  - address balance is credited by the expected amount'
    )
    failed++
  }

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakedFeeAttribute.minimumStake + stakedFeeAttribute.jurisdictionFee - 1
  }).catch(error => {
    console.log(
      " ✓  - validators can't add attribute if minumumRequiredStake > msg.value"
    )
    passed++
  })

  validatorBalance = await web3.eth.getBalance(validator.address)

  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    stakedFeeAttribute.attributeId,
    stakedFeeAttribute.targetValue
  ).send({
    from: validator.address,
    gas: 5000000,
    gasPrice: 10 ** 9,
    value: stakedFeeAttribute.jurisdictionFee + stakeAmount * 2
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      ' ✓  - validators can add attribute if required stake + fee >= msg.value'
    )
    passed++


    const logs = receipt.events.StakeAllocated.returnValues
    assert.strictEqual(logs.staker, validator.address)
    assert.strictEqual(logs.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs.amount, new web3.utils.BN(stakeAmount * 2).toString())
    console.log(
      ' ✓  - StakeAllocated event is logged correctly on manual validator call'
    )
    passed++

    const logs2 = receipt.events.FeePaid.returnValues // jurisdiction fees
    assert.strictEqual(logs2.recipient, address)
    assert.strictEqual(logs2.payee, validator.address)
    assert.strictEqual(logs2.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs2.amount, stakedFeeAttribute.jurisdictionFee.toString())
    console.log(
      ' ✓  - FeePaid event for jurisdiction logged correctly on validator call'
    )
    passed++


  })

  validatorBalanceOne = await web3.eth.getBalance(validator.address)
  difference = new web3.utils.BN(validatorBalance).sub(
    new web3.utils.BN(validatorBalanceOne)
  ).toString()
  expectedDifference = gasCost.add(
    new web3.utils.BN(stakeAmount).mul(
      new web3.utils.BN(2)
    ).add(
      new web3.utils.BN(stakedFeeAttribute.jurisdictionFee)
    )
  ).toString()
  assert.strictEqual(difference, expectedDifference)
  console.log(
    ' ✓  - validator address balance is reduced by the expected amount'
  )
  passed++

  // TODO: jurisdiction owner address balance is credited by the expected amount

  jurisdictionSubmitterBalance = await web3.eth.getBalance(address)

  await Jurisdiction.methods.revokeAttribute(
    attributedAddress,
    stakedFeeAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    assert.ok(receipt.status)
    gasCost = new web3.utils.BN(receipt.gasUsed).mul(new web3.utils.BN(10 ** 9))
    console.log(
      " ✓  - jurisdiction owner can remove an attribute with fees"
    )
    passed++

    expectedTransactionRebate = new web3.utils.BN(10 ** 9).mul(
      new web3.utils.BN(expectedTransactionGas)
    )

    const logs = receipt.events.StakeRefunded.returnValues
    assert.strictEqual(logs.staker, validator.address)
    assert.strictEqual(logs.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(
      logs.amount,
      new web3.utils.BN(stakeAmount).mul(
        new web3.utils.BN(2)).sub(
        expectedTransactionRebate
      ).toString()
    )
    console.log(' ✓  - StakeRefunded event is logged correctly')
    passed++

    const logs2 = receipt.events.TransactionRebatePaid.returnValues
    assert.strictEqual(logs2.submitter, address)
    assert.strictEqual(logs2.attribute, stakedFeeAttribute.attributeId.toString())
    assert.strictEqual(logs2.amount, expectedTransactionRebate.toString())
    console.log(' ✓  - TransactionRebatePaid event is logged correctly')
    passed++
  })

  expectedTransactionRebate = new web3.utils.BN(10 ** 9).mul(
    new web3.utils.BN(expectedTransactionGas)
  )

  updatedJurisdictionSubmitterBalance = await web3.eth.getBalance(address)
  difference = new web3.utils.BN(updatedJurisdictionSubmitterBalance).sub(
    new web3.utils.BN(jurisdictionSubmitterBalance)
  )
  expectedDifference = expectedTransactionRebate.sub(gasCost)
  assert.strictEqual(difference.toString(), expectedDifference.toString())  
  console.log(
    " ✓  - jurisdiction's submitter gets transaction rebate from stake if s>t"
  )
  passed++

  validatorBalanceTwo = await web3.eth.getBalance(validator.address)
  difference = new web3.utils.BN(validatorBalanceTwo).sub(
    new web3.utils.BN(validatorBalanceOne)
  )
  expectedDifference = new web3.utils.BN(stakeAmount).mul(
    new web3.utils.BN(2)
  ).sub(
    new web3.utils.BN(expectedTransactionRebate)
  )
  if (difference.cmp(expectedDifference) == 0) {
    console.log(
      ' ✓  - validator gets back stake less rebate when owner calls if paid'
    )
    passed++
  } else {
    console.log(difference.toString(), expectedDifference.toString())
    console.log(difference.sub(expectedDifference).toString())
    console.log(
      ' ✘  - validator gets back stake less rebate when owner calls if paid'
    )
    failed++
  }


  //// TODO: more secondary source tests!!
  //  - attribute types can have secondary sources set
  await Jurisdiction.methods.addAttributeType(
    secondaryAttribute.attributeId,
    secondaryAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeSecondarySource(
    secondaryAttribute.attributeId,
    secondaryAttribute.secondarySource,
    secondaryAttribute.secondaryId,
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(
      " ✓ attribute types can designate secondary source registry address & ID"
    )
    passed++
  })

  //  - checks for the attribute before it is set return false
  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    secondaryAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for the attribute before it is set return false'
    )
    passed++
  })

  //  - checks for the attribute value before it is set return 0
  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    secondaryAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - checks for the attribute value before it is set revert'
    )
    passed++
  })

  //  - approve the validator to add the attribute on the secondary jurisdiction
  await Jurisdiction.methods.addValidatorApproval(
    secondaryAttribute.targetValidator,
    secondaryAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.ValidatorApprovalAdded.returnValues
    assert.strictEqual(logs.validator, attribute.targetValidator)
    assert.strictEqual(
      logs.attributeTypeID,
      secondaryAttribute.attributeId.toString()
    )
    console.log(
      ' ✓  - validators can be approved to set attributes w/ secondary sources'
    )
    passed++
  })

  //  - add a validator to secondary jurisdiction
  await SecondaryJurisdiction.methods.addValidator(
    validatorAddress,
    validator.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.ValidatorAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.description, validator.description)
  })

  //  - add an attribute type to secondary jurisdiction
  await SecondaryJurisdiction.methods.addAttributeType(
    secondaryAttribute.secondaryId,
    attribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    const logs = receipt.events.AttributeTypeAdded.returnValues
    assert.strictEqual(
      logs.attributeTypeID,
      secondaryAttribute.secondaryId.toString()
    )
    assert.strictEqual(logs.description, attribute.description)
  }) 

  //  - approve the validator to add the attribute on the secondary jurisdiction
  await SecondaryJurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    secondaryAttribute.secondaryId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.ValidatorApprovalAdded.returnValues
    assert.strictEqual(logs.validator, attribute.targetValidator)
    assert.strictEqual(logs.attributeTypeID, secondaryAttribute.secondaryId.toString())
  })

  // - add an attribute to the secondary jurisdiction
  await SecondaryJurisdiction.methods.issueAttribute(
    attributedAddress,
    secondaryAttribute.secondaryId,
    secondaryAttribute.targetValue
  ).send({
    from: validatorAddress,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(
      logs.attributeTypeID,
      secondaryAttribute.secondaryId.toString()
    )
  })

  //  - checks for the attribute once it is set return true
  await SecondaryJurisdiction.methods.hasAttribute(
    attributedAddress,
    secondaryAttribute.secondaryId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.ok(attributeExists)
    console.log(
      ' ✓  - direct checks for attribute on secondary once set return true'
    )
    passed++
  })

  //  - checks for the attribute value once it is set return correct value
  await SecondaryJurisdiction.methods.getAttributeValue(
    attributedAddress,
    secondaryAttribute.secondaryId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, secondaryAttribute.targetValue.toString())
    console.log(
      ' ✓  - direct checks for attribute value on secondary return correctly'
    )
    passed++
  })

  //  - checks for the attribute once it is set return true
  await Jurisdiction.methods.hasAttribute(
    attributedAddress,
    secondaryAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.ok(attributeExists)
    console.log(
      ' ✓  - checks for the attribute once it is set return true'
    )
    passed++
  }).catch(error => {
    // TODO: failing on coverage for some reason (probably the inline assembly!)
    //console.error(error)
    if (testingContext !== 'coverage') {
      console.log(
        ' ✘  - checks for the attribute once it is set return true'
      )
      failed++
    } else {
      console.warn(
        'warning - hasAttribute on secondary source not working with coverage!'
      )
    }
  })

  //  - checks for the attribute value once it is set return correct value
  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    secondaryAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, secondaryAttribute.targetValue.toString())
    console.log(
      ' ✓  - checks for the attribute value once it is set return correct value'
    )
    passed++
  })


  // - add an attribute locally to an attribute type with a secondary source
  await Jurisdiction.methods.issueAttribute(
    attributedAddress,
    secondaryAttribute.attributeId,
    secondaryAttribute.newTargetValue
  ).send({
    from: secondaryAttribute.targetValidator,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, secondaryAttribute.targetValidator)
    assert.strictEqual(logs.attributee, attributedAddress)
    assert.strictEqual(logs.attributeTypeID, secondaryAttribute.attributeId.toString())
    console.log(
      ' ✓  - attributes can be added locally on types with secondary sources'
    )
    passed++
  })

  //  - local attribute values supercede remote attribute values
  await Jurisdiction.methods.getAttributeValue(
    attributedAddress,
    secondaryAttribute.attributeId
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, secondaryAttribute.newTargetValue.toString())
    console.log(
      ' ✓  - local attribute values take priority over remote attribute values'
    )
    passed++
  })

  await Jurisdiction.methods.setAttributeTypeSecondarySource(
    badSecondaryAttribute.attributeId,
    badSecondaryAttribute.secondarySource,
    badSecondaryAttribute.secondaryId,
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - secondary sources cannot be set on non-existant attribute types'
    )
    passed++
  })

  //  - attribute types can be set to secondary addresses without registries
  // NOTE: this should potentially be disallowed!!
  await Jurisdiction.methods.addAttributeType(
    badSecondaryAttribute.attributeId,
    badSecondaryAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeSecondarySource(
    badSecondaryAttribute.attributeId,
    badSecondaryAttribute.secondarySource,
    badSecondaryAttribute.secondaryId,
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  //  - checks for unset attribute on bad secondary source return false
  await Jurisdiction.methods.hasAttribute(
    inattributedAddress,
    badSecondaryAttribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for unset attribute on bad secondary source return false'
    )
    passed++
  })

  //  - checks for unset attribute value on bad secondary source return 0
  await Jurisdiction.methods.getAttributeValue(
    inattributedAddress,
    badSecondaryAttribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - checks for unset attribute value on bad secondary source revert'
    )
    passed++
  })

  //  - set the secondary source to the address of a naughty registry (throws)
  await Jurisdiction.methods.addAttributeType(
    naughtySecondaryAttribute.attributeId,
    naughtySecondaryAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  await Jurisdiction.methods.setAttributeTypeSecondarySource(
    naughtySecondaryAttribute.attributeId,
    naughtySecondaryAttribute.secondarySource,
    naughtySecondaryAttribute.secondaryId,
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  })

  // calls directly into hasAttribute on the naughty registry should throw
  await NaughtyRegistry.methods.hasAttribute(
    inattributedAddress,
    naughtySecondaryAttribute.secondaryId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.ok(false)
  }).catch(error => {
    assert.ok(true)
  })

  // calls directly into getAttribute on the naughty registry should throw
  await NaughtyRegistry.methods.getAttribute(
    inattributedAddress,
    naughtySecondaryAttribute.secondaryId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.ok(false)
  }).catch(error => {
    assert.ok(true)
  })

  //  - checks for attributes on a naughty secondary source return false
  await Jurisdiction.methods.hasAttribute(
    inattributedAddress,
    naughtySecondaryAttribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for attributes on a naughty secondary source return false'
    )
    passed++
  })

  //  - checks for attributes on a naughty secondary source return false
  await Jurisdiction.methods.getAttributeValue(
    inattributedAddress,
    naughtySecondaryAttribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - checks for attribute values on a naughty secondary source revert'
    )
    passed++
  })

  let cannotAdd = false
  await Jurisdiction.methods.addAttributeFor(
    unownedAddress,
    attribute.attributeId,
    attribute.targetValueThree,
    attribute.validatorFee,
    attribute.targetThreeSignature
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    cannotAdd = true
  })

  await Jurisdiction.methods.addAttributeFor(
    unownedAddress,
    attribute.attributeId,
    attribute.targetValueThree,
    attribute.validatorFee,
    attribute.targetThreeSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ' ✓ operators can add an attribute via signed validator approval'
    )
    passed++

    const logs = receipt.events.AttributeAdded.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, unownedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeAdded event is logged correctly')
    passed++
  }).catch(error => {
        console.error(error)
    console.log(
      ' ✘ users can add an attribute via signed message from approved validator'
    )
    failed++

    console.log(' ✘  - AttributeAdded event is logged correctly')
    failed++
  })

  if (cannotAdd) {
    console.log(
      ' ✓  - operators cannot submit attribute approvals not intended for them'
    )
    passed++
  }

  await Jurisdiction.methods.hasAttribute(
    unownedAddress,
    attribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, true)
    console.log(
      ' ✓  - checks for attributes added by an operator return true'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    unownedAddress,
    attribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeValue => {
    assert.strictEqual(attributeValue, attribute.targetValueThree.toString())
    console.log(
      ' ✓  - checks for attributes added by an operator return correct value'
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeFor(
    unownedAddress,
    restrictedAttribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot remove restricted attributes'
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeFor(
    unownedAddress,
    attribute.attributeId,
  ).send({
    from: attributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot remove attributes they didnt assign'
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeFor(
    unownedAddress,
    attribute.attributeId,
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot remove attribute approvals not intended for them'
    )
    passed++
  })

  await Jurisdiction.methods.removeAttributeFor(
    unownedAddress,
    attribute.attributeId,
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(' ✓  - operators can remove attributes they have assigned')
    passed++

    const logs = receipt.events.AttributeRemoved.returnValues
    assert.strictEqual(logs.validator, validatorAddress)
    assert.strictEqual(logs.attributee, unownedAddress)
    assert.strictEqual(logs.attributeTypeID, attribute.attributeId.toString())
    console.log(' ✓  - AttributeRemoved event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.removeAttributeFor(
    unownedAddress,
    attribute.attributeId,
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot remove attribute approvals that do not exist'
    )
    passed++
  })

  await Jurisdiction.methods.hasAttribute(
    unownedAddress,
    attribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(attributeExists => {
    assert.strictEqual(attributeExists, false)
    console.log(
      ' ✓  - checks for attributes removed by an operator return false'
    )
    passed++
  })

  await Jurisdiction.methods.getAttributeValue(
    unownedAddress,
    attribute.attributeId,
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - checks for attributes removed by an operator revert'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeFor(
    unownedAddress,
    attribute.attributeId,
    attribute.targetValueThree,
    attribute.validatorFee,
    attribute.targetThreeSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot reuse attribute approvals'
    )
    passed++
  })

  await Jurisdiction.methods.setAttributeTypeOnlyPersonal(
    onlyPersonalAttribute.attributeId,
    onlyPersonalAttribute.onlyPersonal
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.log(
      ' ✓  - personal-only cannot be set on non-existant attribute types'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeType(
    onlyPersonalAttribute.attributeId,
    onlyPersonalAttribute.description
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
  }) 

  await Jurisdiction.methods.setAttributeTypeOnlyPersonal(
    onlyPersonalAttribute.attributeId,
    onlyPersonalAttribute.onlyPersonal
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(
      ' ✓  - attribute types can be specified as only for personal assignment'
    )
    passed++
  })

  //  - approve the validator to add the attribute on the secondary jurisdiction
  await Jurisdiction.methods.addValidatorApproval(
    attribute.targetValidator,
    onlyPersonalAttribute.attributeId
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => {
    assert.ok(receipt.status)
    const logs = receipt.events.ValidatorApprovalAdded.returnValues
    assert.strictEqual(logs.validator, attribute.targetValidator)
    assert.strictEqual(
      logs.attributeTypeID,
      onlyPersonalAttribute.attributeId.toString()
    )
    console.log(
      ' ✓  - validators can be approved to issue onlyPersonal attributes'
    )
    passed++
  })

  await Jurisdiction.methods.addAttributeFor(
    attributedAddress,
    onlyPersonalAttribute.attributeId,
    onlyPersonalAttribute.targetValue,
    onlyPersonalAttribute.validatorFee,
    onlyPersonalAttribute.badSignature
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: 10 ** 1,
    value: 0
  }).catch(error => {
    console.log(
      ' ✓  - operators cannot add attribute types specified as only personal'
    )
    passed++
  })

  //// TODO: additional tests around invalidating attribute approvals
  //  - sign a third attribue approval and confirm that it is valid
  //  - invalidating it as non-owner / non-issuer fails
  //  - the approval that was unsuccessfully invalidated can be added
  // TODO: jurisdiction's submitter gets back back the total stake if s<=t
  // TODO: validator gets back remaining staked amount if paid when user calls
  // TODO: validator's submitter gets back transaction cost from stake if s>t
  // TODO: validator's submitter gets back the total stake if s<=t
  // TODO: users can renew staked attributes by using a new signature
  //  - this will require modifying the required staked amount slightly
  // TODO: users can remove invalidated attributes and reclaim the stake
  //  - this requires testing removed attribute types, validators, and approvals
  // TODO: handle all failed test cases - a bunch will halt testing if they fail
  // TODO: still needs additional tests written to cover fees and related events
  // TODO: test that secondary source calls only forward a limited amount of gas
  // TODO: operator cannot remove attributes they didn't set
  // TODO: tests around stake and fees for addAttributeFor & removeAttributeFor

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )

  if (failed > 0) {
    process.exit(1)
  }

  process.exit(0)

}}
