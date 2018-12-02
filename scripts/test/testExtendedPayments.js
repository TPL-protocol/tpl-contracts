var assert = require('assert');

const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const PaymentRejectorContractData = require('../../build/contracts/PaymentRejector.json')

module.exports = {test: async function (provider, testingContext) {
  var web3 = provider

  let passed = 0
  let failed = 0
  console.log('running extra tests...')
  // get available addresses and assign them to various roles
  const addresses = await Promise.resolve(web3.eth.getAccounts())
  if (addresses.length < 5) {
    console.log('cannot find enough addresses to run tests...')
    return false
  }

  async function send(
    title,
    instance,
    method,
    args,
    from,
    value,
    gas,
    gasPrice,
    shouldSucceed,
    assertionCallback
  ) {
    let succeeded = true
    receipt = await instance.methods[method](...args).send({
      from: from,
      value: value,
      gas: gas,
      gasPrice: gasPrice
    }).catch(error => {
      succeeded = false
    })

    if (succeeded !== shouldSucceed) {
      return false
    } else if (!shouldSucceed) {
      return true
    }

    assert.ok(receipt.status)

    let assertionsPassed
    try {
      assertionCallback(receipt)
      assertionsPassed = true
    } catch(error) {
      assertionsPassed = false
    }

    return assertionsPassed
  }

  async function call(
    title,
    instance,
    method,
    args,
    from,
    value,
    gas,
    gasPrice,
    shouldSucceed,
    assertionCallback
  ) {
    let succeeded = true
    returnValues = await instance.methods[method](...args).call({
      from: from,
      value: value,
      gas: gas,
      gasPrice: gasPrice
    }).catch(error => {
      succeeded = false
    })

    if (succeeded !== shouldSucceed) {
      return false
    } else if (!shouldSucceed) {
      return true
    }

    let assertionsPassed
    try {
      assertionCallback(returnValues)
      assertionsPassed = true
    } catch(error) {
      assertionsPassed = false
    }

    return assertionsPassed
  }

  async function runTest(
    title,
    instance,
    method,
    callOrSend,
    args,
    shouldSucceed,
    assertionCallback,
    from,
    value
  ) {
    if (typeof(callOrSend) === 'undefined') {
      callOrSend = 'send'
    }
    if (typeof(args) === 'undefined') {
      args = []
    }
    if (typeof(shouldSucceed) === 'undefined') {
      shouldSucceed = true
    }
    if (typeof(assertionCallback) === 'undefined') {
      assertionCallback = (value) => {}
    }
    if (typeof(from) === 'undefined') {
      from = address
    }
    if (typeof(value) === 'undefined') {
      value = 0
    }
    let ok = false
    if (callOrSend === 'send') {
      ok = await send(
        title,
        instance,
        method,
        args,
        from,
        value,
        gasLimit - 1,
        10 ** 1,
        shouldSucceed,
        assertionCallback
      )
    } else if (callOrSend === 'call') {
      ok = await call(
        title,
        instance,
        method,
        args,
        from,
        value,
        gasLimit - 1,
        10 ** 1,
        shouldSucceed,
        assertionCallback
      )
    } else {
      console.error('must use call or send!')
      process.exit(1)
    }

    if (ok) {
      console.log(` ✓ ${title}`)
      passed++
    } else {
      console.log(` ✘ ${title}`)
      failed++
    }
  }

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

  const address = addresses[0]
  const validatorAddress = addresses[1]
  const attributedAddress = addresses[2]
  const inattributedAddress = addresses[3]
  const extraAttributedAddress = addresses[4]
  const nullAddress = '0x0000000000000000000000000000000000000000'
  const badAddress = '0xbAd00BAD00BAD00bAD00bAD00bAd00BaD00bAD00'
  const unownedAddress = '0x1010101010101010101010101010101010101010'

  const attributeId = 0
  const attributeValue = 0
  const jurisdictionFee = 1
  const validatorFee = 1
  const minimumRequiredStake = 1

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const PaymentRejectorDeployer = new web3.eth.Contract(
    PaymentRejectorContractData.abi
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

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: JurisdictionDeployer.deploy({
        data: JurisdictionContractData.bytecode,
        arguments: []
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

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

  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: PaymentRejectorDeployer.deploy({
        data: PaymentRejectorContractData.bytecode,
        arguments: [Jurisdiction.options.address]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const PaymentRejector = await PaymentRejectorDeployer.deploy(
    {
      data: PaymentRejectorContractData.bytecode,
      arguments: [Jurisdiction.options.address]
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit()
  })

  console.log(' ✓ payment rejector contract deploys successfully')
  passed++

  // **************************** begin testing ***************************** //

  await runTest(
    'jurisdiction owner is set to the correct address',
    Jurisdiction,
    'owner',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, address)
    }
  )

  await runTest(
    'jurisdiction can add a validator (1)',
    Jurisdiction,
    'addValidator',
    'send',
    [validatorAddress, ""]
  )

  await runTest(
    'jurisdiction can add a validator (2)',
    Jurisdiction,
    'addValidator',
    'send',
    [PaymentRejector.options.address, ""]
  )

  await runTest(
    'jurisdiction can add an attribute type',
    Jurisdiction,
    'addAttributeType',
    'send',
    [attributeId, ""]
  )

  await runTest(
    'jurisdiction can approve a validator to issue attributes of that type (1)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [validatorAddress, attributeId]
  )

  await runTest(
    'jurisdiction can approve a validator to issue attributes of that type (2)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [PaymentRejector.options.address, attributeId]
  )

  await runTest(
    'jurisdiction can set a jurisdiction fee for attributes of that type',
    Jurisdiction,
    'setAttributeTypeJurisdictionFee',
    'send',
    [attributeId, jurisdictionFee]
  )

  await runTest(
    'jurisdiction can transfer ownership to the payment rejector',
    Jurisdiction,
    'transferOwnership',
    'send',
    [PaymentRejector.options.address]
  )

  balance = await web3.eth.getBalance(Jurisdiction.options.address)

  await runTest(
    'validator can issue attributes but will not be able to pay the rejector',
    Jurisdiction,
    'issueAttribute',
    'send',
    [attributedAddress, attributeId, attributeValue],
    true,
    value => {
      assert.strictEqual(typeof value.events.FeePaid, 'undefined')
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        validatorAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    validatorAddress,
    jurisdictionFee
  )

  balanceTwo = await web3.eth.getBalance(Jurisdiction.options.address)
  assert.strictEqual(
    parseInt(balance, 10) + jurisdictionFee,
    parseInt(balanceTwo, 10)
  )
  console.log(' ✓ jurisdiction now has funds locked in the contract')
  passed++

  await runTest(
    'jurisdiction returns recoverable funds amount matching expected balance',
    Jurisdiction,
    'recoverableFunds',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, jurisdictionFee.toString())
    }
  )

  await runTest(
    'Payment rejector can relinquish ownership back to the original owner (1)',
    PaymentRejector,
    'relinquishOwnership',
    'send',
    [address]
  )

  await runTest(
    'attribute holder can revoke the attribute (1)',
    Jurisdiction,
    'removeAttribute',
    'send',
    [attributeId],
    true,
    value => {
      assert.strictEqual(
        value.events.AttributeRemoved.returnValues.attributeTypeID,
        attributeId.toString()
      )
    },
    attributedAddress
  )

  await runTest(
    'funds can be recovered',
    Jurisdiction,
    'recoverFunds',
    'send',
    [address, jurisdictionFee]
  )

  await runTest(
    'jurisdiction can transfer ownership back to the payment rejector (1)',
    Jurisdiction,
    'transferOwnership',
    'send',
    [PaymentRejector.options.address]
  )

  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    nullAddress, // operator
    jurisdictionFee, // stake + jurisdiction fee + validator fee
    0,  // validator fee
    attributeId,
    attributeValue
  )
  await runTest(
    'participant can issue signed attribute when unable to pay the owner',
    Jurisdiction,
    'addAttribute',
    'send',
    [
      attributeId,
      attributeValue,
      0, // validatorFee
      signature
    ],
    true,
    value => {
      assert.strictEqual(typeof value.events.FeePaid, 'undefined')
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        validatorAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    attributedAddress,
    jurisdictionFee
  )

  await runTest(
    'Payment rejector can relinquish ownership back to the original owner (2)',
    PaymentRejector,
    'relinquishOwnership',
    'send',
    [address]
  )

  await runTest(
    'jurisdiction owner can then revoke the attribute (1)',
    Jurisdiction,
    'revokeAttribute',
    'send',
    [attributedAddress, attributeId]
  )

  await runTest(
    'Payment rejector can set a signing key for when it is a validator',
    PaymentRejector,
    'setValidatorSigningKey',
    'send',
    [inattributedAddress]
  )  

  signature = await signValidation(
    inattributedAddress,
    Jurisdiction.options.address,
    attributedAddress,
    nullAddress, // operator
    jurisdictionFee + validatorFee, // stake + jurisdiction fee + validator fee
    validatorFee,
    attributeId,
    attributeValue
  )
  await runTest(
    'participant can issue signed attribute when unable to pay the validator',
    Jurisdiction,
    'addAttribute',
    'send',
    [
      attributeId,
      attributeValue,
      validatorFee,
      signature
    ],
    true,
    value => {
      assert.strictEqual(
        value.events.FeePaid.returnValues.recipient,
        address
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        PaymentRejector.options.address
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    attributedAddress,
    jurisdictionFee + validatorFee
  )

  await runTest(
    'attribute holder can revoke the attribute (2)',
    Jurisdiction,
    'removeAttribute',
    'send',
    [attributeId],
    true,
    value => {
      assert.strictEqual(
        value.events.AttributeRemoved.returnValues.attributeTypeID,
        attributeId.toString()
      )
    },
    attributedAddress
  )

  await runTest(
    'jurisdiction can transfer ownership to the payment rejector (3)',
    Jurisdiction,
    'transferOwnership',
    'send',
    [PaymentRejector.options.address]
  )

  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    address, // operator
    jurisdictionFee + validatorFee, // stake + jurisdiction fee + validator fee
    validatorFee,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute when unable to pay the jurisdiction',
    Jurisdiction,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      validatorFee,
      signature
    ],
    true,
    value => {
      assert.strictEqual(
        value.events.FeePaid.returnValues.recipient,
        validatorAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        validatorAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    address,
    jurisdictionFee + validatorFee
  )

  await runTest(
    'Payment rejector can relinquish ownership back to the original owner (2)',
    PaymentRejector,
    'relinquishOwnership',
    'send',
    [address]
  )

  await runTest(
    'attribute holder can revoke the attribute (3)',
    Jurisdiction,
    'removeAttribute',
    'send',
    [attributeId],
    true,
    value => {
      assert.strictEqual(
        value.events.AttributeRemoved.returnValues.attributeTypeID,
        attributeId.toString()
      )
    },
    attributedAddress
  )

  signature = await signValidation(
    inattributedAddress,
    Jurisdiction.options.address,
    attributedAddress,
    attributedAddress, // operator
    jurisdictionFee + validatorFee, // stake + jurisdiction fee + validator fee
    validatorFee,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute when unable to pay the validator',
    Jurisdiction,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      validatorFee,
      signature
    ],
    true,
    value => {
      assert.strictEqual(
        value.events.FeePaid.returnValues.recipient,
        address
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        PaymentRejector.options.address
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    attributedAddress,
    jurisdictionFee + validatorFee
  )

  await runTest(
    'attribute holder can revoke the attribute (4)',
    Jurisdiction,
    'removeAttribute',
    'send',
    [attributeId],
    true,
    value => {
      assert.strictEqual(
        value.events.AttributeRemoved.returnValues.attributeTypeID,
        attributeId.toString()
      )
    },
    attributedAddress
  )  

  await runTest(
    'jurisdiction can remove the jurisdiction fee for the attribute type',
    Jurisdiction,
    'setAttributeTypeJurisdictionFee',
    'send',
    [attributeId, 0]
  )

  await runTest(
    'jurisdiction can add a minimum required stake for the attribute type',
    Jurisdiction,
    'setAttributeTypeMinimumRequiredStake',
    'send',
    [attributeId, minimumRequiredStake]
  )

  signature = await signValidation(
    inattributedAddress,
    Jurisdiction.options.address,
    attributedAddress,
    attributedAddress, // operator
    0, // stake + jurisdiction fee + validator fee
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators cannot issue signed attribute when minimum stake is not met',
    Jurisdiction,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    false,
    null,
    attributedAddress,
    0
  )

  signature = await signValidation(
    inattributedAddress,
    Jurisdiction.options.address,
    attributedAddress,
    attributedAddress, // operator
    minimumRequiredStake, // stake + jurisdiction fee + validator fee
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute that requires a stake (1)',
    Jurisdiction,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    true,
    value => {
      assert.strictEqual(
        value.events.StakeAllocated.returnValues.staker,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        PaymentRejector.options.address
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    attributedAddress,
    minimumRequiredStake
  )

  await runTest(
    'jurisdiction owner can then revoke the attribute (2)',
    Jurisdiction,
    'revokeAttribute',
    'send',
    [attributedAddress, attributeId]
  )

  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    attributedAddress, // operator
    minimumRequiredStake + 1, // stake + jurisdiction fee + validator fee
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute that requires a stake (2)',
    Jurisdiction,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    true,
    value => {
      assert.strictEqual(
        value.events.StakeAllocated.returnValues.staker,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.validator,
        validatorAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributee,
        attributedAddress
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeTypeID,
        attributeId.toString()
      )
      assert.strictEqual(
        value.events.AttributeAdded.returnValues.attributeValue,
        attributeValue.toString()
      )
    },
    attributedAddress,
    minimumRequiredStake + 1
  )

  await runTest(
    'attribute operator can revoke the attribute (1)',
    Jurisdiction,
    'removeAttributeFor',
    'send',
    [attributedAddress, attributeId],
    true,
    value => {
      assert.strictEqual(
        value.events.AttributeRemoved.returnValues.attributeTypeID,
        attributeId.toString()
      )
    },
    attributedAddress
  )

  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    PaymentRejector.options.address, // operator
    minimumRequiredStake, // stake + jurisdiction fee + validator fee
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute that requires a stake (3)',
    PaymentRejector,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    true,
    value => {},
    attributedAddress,
    minimumRequiredStake
  )

  await runTest(
    'attribute operator can revoke the attribute (2)',
    PaymentRejector,
    'removeAttributeFor',
    'send',
    [attributedAddress, attributeId],
    true,
    value => {},
    attributedAddress
  )  

  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    PaymentRejector.options.address, // operator
    minimumRequiredStake + 1, // stake + jurisdiction fee + validator fee
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute that requires a stake (4)',
    PaymentRejector,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    true,
    value => {},
    attributedAddress,
    minimumRequiredStake + 1
  )

  await runTest(
    'attribute holder can revoke the attribute (5)',
    Jurisdiction,
    'removeAttribute',
    'send',
    [attributeId],
    true,
    value => {},
    attributedAddress
  )

  // stake > tx rebate
  signature = await signValidation(
    validatorAddress,
    Jurisdiction.options.address,
    attributedAddress,
    PaymentRejector.options.address, // operator
    377001,
    0,
    attributeId,
    attributeValue
  )
  await runTest(
    'operators can issue signed attribute that requires a stake (5)',
    PaymentRejector,
    'addAttributeFor',
    'send',
    [
      attributedAddress,
      attributeId,
      attributeValue,
      0,
      signature
    ],
    true,
    value => {},
    attributedAddress,
    377001
  )

  await runTest(
    'jurisdiction owner can then revoke the attribute (3)',
    Jurisdiction,
    'revokeAttribute',
    'send',
    [attributedAddress, attributeId]
  )

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )

  if (failed > 0) {
    process.exit(1)
  }

  process.exit(0)

}}
