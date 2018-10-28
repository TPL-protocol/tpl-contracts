var assert = require('assert');
const JurisdictionContractData = require('../build/contracts/ExtendedJurisdiction.json')
const TPLERC20ContractData = require('../build/contracts/DrinkToken.json')
const TPLERC721ContractData = require('../build/contracts/CryptoCopycats.json')
const TPLValidatorContractData = require('../build/contracts/CryptoCopycatsCooperative.json')

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
      gasPrice:gasPrice
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
  const nullAddress = '0x0000000000000000000000000000000000000000'
  const badAddress = '0xbAd00BAD00BAD00bAD00bAD00bAd00BaD00bAD00'
  const unownedAddress = '0x1010101010101010101010101010101010101010'

  // create contract objects that will deploy the contracts for testing
  const JurisdictionDeployer = new web3.eth.Contract(
    JurisdictionContractData.abi
  )

  const TPLERC20Deployer = new web3.eth.Contract(
    TPLERC20ContractData.abi
  )

  const TPLERC721Deployer = new web3.eth.Contract(
    TPLERC721ContractData.abi
  )

  const TPLValidatorDeployer = new web3.eth.Contract(
    TPLValidatorContractData.abi
  )

  const attributeDetails = {
    ERC20: {
      name: "Drink Token",
      typeId: '11111',
      description: 'Valid token recipient'
    },
    ERC721: {
      name: "Crypto Copycats",
      typeId: '22222',
      description: 'Valid token holder' 
    },
    validator: {
      name: "Crypto Copycats Cooperative",
      typeId: '22222',
      description: 'Designated validator'
    }
  }

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
      data: TPLERC20Deployer.deploy({
        data: TPLERC20ContractData.bytecode,
        arguments: [
          Jurisdiction.options.address,
          attributeDetails.ERC20.typeId
        ]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const TPLERC20 = await TPLERC20Deployer.deploy(
    {
      data: TPLERC20ContractData.bytecode,
      arguments: [
        Jurisdiction.options.address,
        attributeDetails.ERC20.typeId
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
    ' ✓ TPLERC20 contract deploys successfully'
  )
  passed++

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: TPLERC721Deployer.deploy({
        data: TPLERC721ContractData.bytecode,
        arguments: [
          Jurisdiction.options.address,
          attributeDetails.ERC721.typeId
        ]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const TPLERC721 = await TPLERC721Deployer.deploy(
    {
      data: TPLERC721ContractData.bytecode,
      arguments: [
        Jurisdiction.options.address,
        attributeDetails.ERC721.typeId
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
    ' ✓ TPLERC721 contract deploys successfully'
  )
  passed++

  deployGas = await web3.eth.estimateGas({
      from: address,
      data: TPLValidatorDeployer.deploy({
        data: TPLValidatorContractData.bytecode,
        arguments: [
          Jurisdiction.options.address,
          attributeDetails.validator.typeId
        ]
      }).encodeABI()
  })

  if (deployGas > gasLimit) {
    console.error('deployment costs exceed block gas limit')
    process.exit(1)
  }

  const TPLValidator = await TPLValidatorDeployer.deploy(
    {
      data: TPLValidatorContractData.bytecode,
      arguments: [
        Jurisdiction.options.address,
        attributeDetails.validator.typeId
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
    ' ✓ TPLBasicValidator contract deploys successfully'
  )
  passed++

  // **************************** begin testing ***************************** //
  console.log(' ✓ jurisdiction contract deploys successfully')
  passed++

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
    'registry utilized by ERC20 is set to the jurisdiction address',
    TPLERC20,
    'getRegistry',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, Jurisdiction.options.address)
    }
  )

  await runTest(
    'registry utilized by ERC721 is set to the jurisdiction address',
    TPLERC721,
    'getRegistry',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, Jurisdiction.options.address)
    }
  )

  await runTest(
    'jurisdiction utilized by validator is set to the jurisdiction address',
    TPLValidator,
    'getJurisdiction',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, Jurisdiction.options.address)
    }
  )

  await runTest(
    'ERC20 description is set correctly',
    TPLERC20,
    'name',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.name)
    }
  )

  await runTest(
    'ERC721 description is set correctly',
    TPLERC721,
    'name',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC721.name)
    }
  )

  await runTest(
    'validator description is set correctly',
    TPLValidator,
    'name',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.validator.name)
    }
  )

  await runTest(
    'attribute ID required by ERC20 is set to the correct value',
    TPLERC20,
    'getValidAttributeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.typeId.toString())
    }
  )

  await runTest(
    'attribute ID required by ERC721 is set to the correct value',
    TPLERC721,
    'getValidAttributeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC721.typeId.toString())
    }
  )

  await runTest(
    'attribute ID required by validator is set to the correct value',
    TPLValidator,
    'getValidAttributeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.validator.typeId.toString())
    }
  )

  await runTest(
    'deploying address has the correct balance',
    TPLERC721,
    'balanceOf',
    'call',
    [address],
    true,
    value => {
      assert.strictEqual(value, '1')
    }
  )

  let tokenId
  await runTest(
    'ERC721 tokens can be retrieved by owner index',
    TPLERC721,
    'tokenOfOwnerByIndex',
    'call',
    [address, 0],
    true,
    value => {
      tokenId = value
    }
  )

  await runTest(
    'ERC721 cannot be transferred before the recipient has attribute assigned',
    TPLERC721,
    'transferFrom',
    'send',
    [address, address, tokenId],
    false
  )

  await runTest(
    'ERC20 attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.typeId,
      attributeDetails.ERC20.description
    ],
    true
  )

  await runTest(
    'ERC721 attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC721.typeId,
      attributeDetails.ERC721.description
    ],
    true
  )

  await runTest(
    'regular validators may be assigned to the jurisdiction',
    Jurisdiction,
    'addValidator',
    'send',
    [
      address,
      attributeDetails.ERC20.typeId
    ],
    true
  )

  await runTest(
    'validator contract may be assigned to the jurisdiction',
    Jurisdiction,
    'addValidator',
    'send',
    [
      TPLValidator.options.address,
      attributeDetails.validator.description
    ],
    true
  )

  await runTest(
    'regualr validator may be approved to issue attributes on jurisdiction',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.typeId
    ],
    true
  )

  await runTest(
    'validator contract may be approved to issue attributes on jurisdiction',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      TPLValidator.options.address,
      attributeDetails.validator.typeId
    ],
    true
  )

  await runTest(
    'regular validator may check that it can add attributes to jurisdiction',
    Jurisdiction,
    'canIssueAttributeType',
    'call',
    [
      address,
      attributeDetails.ERC20.typeId
    ],
    true,
    value => {
      assert.ok(value)
    }
  )

  await runTest(
    'validator contract may check that it can add attributes to jurisdiction',
    TPLValidator,
    'canIssueAttributeType',
    'call',
    [
      attributeDetails.validator.typeId
    ],
    true,
    value => {
      assert.ok(value)
    }
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      address,
      attributeDetails.ERC20.typeId,
      0 // Value is not needed
    ],
    true
  )

  await runTest(
    'attribute holder can mint ERC20 tokens',
    TPLERC20,
    'fermint',
    'send',
    [],
    true
  )

  await runTest(
    'ERC20 token balance is updated',
    TPLERC20,
    'balanceOf',
    'call',
    [address],
    true,
    value => {
      assert.strictEqual(value, '1')
    }
  )

  await runTest(
    'attribute holder can burn ERC20 tokens',
    TPLERC20,
    'liquidate',
    'send',
    [],
    true,
    value => {
      assert.strictEqual(value.events.PourDrink.returnValues.drinker, address)
    }    
  )

  await runTest(
    'validator contract may issue attributes to jurisdiction',
    TPLValidator,
    'issueAttribute',
    'send',
    [
      true,
      true,
      false
    ],
    true
  )

  await runTest(
    'attributes are succesfully added to jurisdiction',
    Jurisdiction,
    'hasAttribute',
    'call',
    [
      address,
      attributeDetails.ERC721.typeId
    ],
    true,
    value => {
      assert.ok(value)
    }
  )

  await runTest(
    'ERC721 can be transferred once the recipient has attribute assigned',
    TPLERC721,
    'transferFrom',
    'send',
    [address, address, tokenId],
    true
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
