var assert = require('assert');
const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const TPLERC20ContractData = require('../../build/contracts/TPLERC20RestrictedReceiverInstance.json')
const TPLERC721ContractData = require('../../build/contracts/TPLERC721PermissionedInstance.json')
const TPLValidatorContractData = require('../../build/contracts/TPLBasicValidatorInstance.json')

module.exports = {test: async function (provider, testingContext) {
  var web3 = provider
  let passed = 0
  let failed = 0
  console.log('running extra tests...')
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
      name: "Mock ERC20 Restricted Receiver Token",
      typeId: '11111',
      description: 'Valid token recipient',
      initialBalance: 100
    },
    ERC721: {
      name: "Mock ERC721 Permissioned Token",
      typeId: '22222',
      description: 'Valid token holder'
    },
    validator: {
      name: "Mock Validator Contract",
      typeId: '22222',
      description: 'Designated validator'
    }
  }

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
      data: TPLERC20Deployer.deploy({
        data: TPLERC20ContractData.bytecode,
        arguments: [
          attributeDetails.ERC20.initialBalance,
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
        attributeDetails.ERC20.initialBalance,
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
    'checking for validator assignment returns false when unassigned',
    TPLValidator,
    'isValidator',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, false)
    }
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
    'checking for validator assignment returns true when assigned',
    TPLValidator,
    'isValidator',
    'call',
    [],
    true,
    value => {
      assert.ok(value)
    }
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction',
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
    'validator checks for issuing attributes return false when type is wrong',
    TPLValidator,
    'canIssueAttribute',
    'call',
    [
      address,
      99999
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'validator checks for revoking attributes return false when type is wrong',
    TPLValidator,
    'canRevokeAttribute',
    'call',
    [
      address,
      99999
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'validator checks for issuing attributes return true when it can be issued',
    TPLValidator,
    'canIssueAttribute',
    'call',
    [
      address,
      attributeDetails.validator.typeId
    ],
    true,
    value => {
      assert.ok(value[0])
      assert.strictEqual(value[1], '0x01')
    }
  )

  await runTest(
    'validator checks for revoking attributes return false before issued',
    TPLValidator,
    'canRevokeAttribute',
    'call',
    [
      address,
      attributeDetails.validator.typeId 
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xb0')
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
    'validator contract may issue attributes to jurisdiction',
    TPLValidator,
    'issueAttribute'
  )

  await runTest(
    'validator checks for issuing attributes return false when already issued',
    TPLValidator,
    'canIssueAttribute',
    'call',
    [
      address,
      attributeDetails.validator.typeId 
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xb0')
    }
  )

  await runTest(
    'validator checks for revoking attributes return true when already issued',
    TPLValidator,
    'canRevokeAttribute',
    'call',
    [
      address,
      attributeDetails.validator.typeId 
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x01')
    }
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

  await runTest(
    'validator contract may issue attributes to jurisdiction',
    TPLValidator,
    'issueAttribute',
    'send',
    [],
    true,
    undefined,
    attributedAddress
  )

  await runTest(
    'validator contract cannot issue existing attributes to jurisdiction',
    TPLValidator,
    'issueAttribute',
    'send',
    [],
    false
  )

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
    'validator contract may remove an attribute',
    TPLValidator,
    'revokeAttribute'
  )

  await runTest(
    'validator contract cannot remove a non-existent attribute',
    TPLValidator,
    'revokeAttribute',
    'send',
    [],
    false
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC721.typeId
    ],
    true
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      address,
      attributeDetails.ERC721.typeId,
      0 // Value is not needed
    ],
    true
  )

  await runTest(
    'validator checks for revoking attributes return false when not from issuer',
    TPLValidator,
    'canRevokeAttribute',
    'call',
    [
      address,
      attributeDetails.validator.typeId 
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xc0')
    }
  )

  await runTest(
    'ERC721 token can be checked for transfers',
    TPLERC721,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x01')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer has a value attached',
    TPLERC721,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer is from unowned account',
    TPLERC721,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    },
    inattributedAddress
  )

  await runTest(
    'ERC721 token checks return false when transfer is to null address',
    TPLERC721,
    'canTransferFrom',
    'call',
    [
      address,
      nullAddress,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer is to unapproved account',
    TPLERC721,
    'canTransferFrom',
    'call',
    [
      address,
      inattributedAddress,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x10')
    }
  )

  await runTest(
    'ERC721 token can be transferred',
    TPLERC721,
    'transferFrom',
    'send',
    [
      address,
      address,
      tokenId 
    ],
    true
  )

  await runTest(
    'ERC721 token can be checked for safe transfers',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x01')
    }
  )

  await runTest(
    'ERC721 safe token checks return false when transfer has a value attached',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 safe token checks return false when transfer from unowned account',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    },
    inattributedAddress
  )

  await runTest(
    'ERC721 safe token checks return false when transfer is to null address',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      nullAddress,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 safe token checks return false when transfer to unapproved account',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      inattributedAddress,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x10')
    }
  )

  await runTest(
    'ERC721 token can be transferred safely',
    TPLERC721,
    'safeTransferFrom',
    'send',
    [
      address,
      address,
      tokenId 
    ],
    true
  )

  await runTest(
    'ERC721 token can be checked for safe transfers with data',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x01')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer w/ data has value attached',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      1,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer w/ data from unowned acct',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      address,
      tokenId,
      0,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    },
    inattributedAddress
  )

  await runTest(
    'ERC721 token checks return false when transfer with data to null address',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      nullAddress,
      tokenId,
      0,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token checks return false when transfer w/ data to unapproved acct',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      inattributedAddress,
      tokenId,
      0,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x10')
    }
  )

  await runTest(
    'ERC721 token can be transferred safely with data',
    TPLERC721,
    'safeTransferFrom',
    'send',
    [
      address,
      address,
      tokenId,
      '0x01' 
    ],
    true
  )

  await runTest(
    'regular validator may issue attributes to itself',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      TPLValidator.options.address,
      attributeDetails.ERC721.typeId,
      0 // Value is not needed
    ],
    true
  )

  // TODO: should also check that checks for transfers to good contracts pass
  await runTest(
    'ERC721 token checks for transfers to bad contracts returns false',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      TPLValidator.options.address,
      tokenId,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token checks for transfers to bad contracts returns false',
    TPLERC721,
    'canSafeTransferFrom',
    'call',
    [
      address,
      TPLValidator.options.address,
      tokenId,
      0,
      '0x01'
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0xa0')
    }
  )

  await runTest(
    'ERC721 token cannot be transferred to contracts without onERC721Received',
    TPLERC721,
    'safeTransferFrom',
    'send',
    [
      address,
      TPLValidator.options.address,
      tokenId,
      '0x01'
    ],
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
