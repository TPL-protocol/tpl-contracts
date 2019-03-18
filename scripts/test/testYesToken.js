var assert = require('assert');
const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const YesTokenContractData = require('../../build/contracts/YesComplianceTokenV1Impl.json')
const UpgradeableContractData = require('../../build/contracts/Dispatcher.json')

module.exports = {test: async function (provider, testingContext) {
  var web3 = provider
  let passed = 0
  let failed = 0
  console.log('running YesToken tests...')
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
      gasPrice:gasPrice
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

  const address = addresses[0]
  const validatorAddress = addresses[1]
  const attributedAddress = addresses[2]
  const inattributedAddress = addresses[3]
  const extraAttributedAddress = addresses[4]
  const nullAddress = '0x0000000000000000000000000000000000000000'
  const badAddress = '0xbAd00BAD00BAD00bAD00bAD00bAd00BaD00bAD00'
  const unownedAddress = '0x1010101010101010101010101010101010101010'

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const YesTokenImplementationDeployer = new web3.eth.Contract(
    YesTokenContractData.abi
  )

  const YesTokenDeployer = new web3.eth.Contract(
    UpgradeableContractData.abi
  )

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

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: YesTokenImplementationDeployer.deploy({
        data: YesTokenContractData.bytecode
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const YesTokenImplementation = await YesTokenImplementationDeployer.deploy(
    {
      data: YesTokenContractData.bytecode
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
    ' ✓ YesToken implementation contract deploys successfully'
  )
  passed++

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: YesTokenDeployer.deploy({
        data: UpgradeableContractData.bytecode,
        arguments: [YesTokenImplementation.options.address]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const UpgradeableYesToken = await YesTokenDeployer.deploy(
    {
      data: UpgradeableContractData.bytecode,
      arguments: [YesTokenImplementation.options.address]
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
    ' ✓ YesToken upgradeable contract deploys successfully'
  )
  passed++

  const YesToken = new web3.eth.Contract(
    YesTokenContractData.abi,
    UpgradeableYesToken.options.address
  )

  // **************************** begin testing ***************************** //
  await runTest(
    'YesToken can be initialized (partial)',
    YesToken,
    'initialize'
  )

  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

  await runTest(
    'YesToken has a balance for owner',
    YesToken,
    'balanceOf',
    'call',
    [address],
    true,
    result => {
      assert.strictEqual(result, '1')
    }
  )

  await runTest(
    'YesToken has no balance for unowned address',
    YesToken,
    'balanceOf',
    'call',
    [unownedAddress],
    true,
    result => {
      assert.strictEqual(result, '0')
    }
  )

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

  await Jurisdiction.methods.addAttributeType(
    1,
    'yes-token'
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(' ✓ jurisdiction owner is able to add new attribute types')
    passed++

    const logs = receipt.events.AttributeTypeAdded.returnValues
    assert.strictEqual(logs.attributeTypeID, '1')
    assert.strictEqual(logs.description, 'yes-token')
    console.log(' ✓ AttributeTypeAdded event is logged correctly')
    passed++
  })

  await Jurisdiction.methods.setAttributeTypeSecondarySource(
    1,
    YesToken.options.address,
    '2423228754106148037712574142965102' // 'wyre-yes-token'
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 1
  }).then(receipt => { 
    assert.ok(receipt.status)
    console.log(
      " ✓ attribute types can designate yes token as a secondary source"
    )
    passed++
  })

  await runTest(
    'jurisdiction can proxy valid attribute checks to yes-token',
    Jurisdiction,
    'hasAttribute',
    'call',
    [address, 1],
    true,
    value => {
      assert.ok(value)
    }
  )

  await runTest(
    'jurisdiction can proxy missing attribute checks to yes-token',
    Jurisdiction,
    'hasAttribute',
    'call',
    [unownedAddress, 1],
    true,
    value => {
      assert.strictEqual(value, false)
    }
  )  

  await runTest(
    'jurisdiction can proxy valid attribute value checks to yes-token',
    Jurisdiction,
    'getAttributeValue',
    'call',
    [address, 1],
    true,
    value => {
      assert.strictEqual(value, '1')
    }
  )

  await runTest(
    'jurisdiction cannot proxy missing attribute value checks to yes-token',
    Jurisdiction,
    'getAttributeValue',
    'call',
    [unownedAddress, 1],
    false
  )

  console.log(
    `completed ${passed + failed} test${passed + failed === 1 ? '' : 's'} ` +
    `with ${failed} failure${failed === 1 ? '' : 's'}.`
  )

  if (failed > 0) {
    process.exit(1)
  }

  process.exit(0)

}}
