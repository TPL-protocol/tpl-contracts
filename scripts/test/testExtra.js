var assert = require('assert');
const JurisdictionContractData = require('../../build/contracts/ExtendedJurisdiction.json')
const TPLERC20ContractData = require('../../build/contracts/TPLERC20PermissionedInstance.json')
const TPLERC721ContractData = require('../../build/contracts/TPLERC721PermissionedInstance.json')
const TPLValidatorContractData = require('../../build/contracts/TPLBasicValidatorInstance.json')

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
      name: "Mock ERC20 Permissioned Token",
      ownerTypeId: '11111',
      ownerDescription: 'Valid token owner',
      operatorTypeId: '33333',
      operatorDescription: 'Valid token operator',
      maximumOwnersTypeId: '44444',
      maximumOwnersDescription: 'Maximum number of allowed token holders',
      ownershipLimitTypeId: '55555',
      ownershipLimitDescription: 'Maximum allowed balance per token holder',
      transfersPausedTypeId: '66666',
      transfersPausedTypeDescription: 'Designates that all transfers are paused'
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
          Jurisdiction.options.address,
          attributeDetails.ERC20.ownerTypeId,
          attributeDetails.ERC20.operatorTypeId,
          attributeDetails.ERC20.maximumOwnersTypeId,
          attributeDetails.ERC20.ownershipLimitTypeId,
          attributeDetails.ERC20.transfersPausedTypeId
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
        attributeDetails.ERC20.ownerTypeId,
        attributeDetails.ERC20.operatorTypeId,
        attributeDetails.ERC20.maximumOwnersTypeId,
        attributeDetails.ERC20.ownershipLimitTypeId,
        attributeDetails.ERC20.transfersPausedTypeId
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
    'owner attribute ID required by ERC20 is set to the correct value',
    TPLERC20,
    'getValidOwnerAttributeTypeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.ownerTypeId.toString())
    }
  )

  await runTest(
    'operator attribute ID required by ERC20 is set to the correct value',
    TPLERC20,
    'getValidOperatorAttributeTypeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.operatorTypeId.toString())
    }
  )

  await runTest(
    'maximum owners attribute ID required by ERC20 is set to the correct value',
    TPLERC20,
    'getMaximumOwnersAttributeTypeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.maximumOwnersTypeId.toString())
    }
  )

  await runTest(
    'attribute ID required by ERC20 is set to the correct value',
    TPLERC20,
    'getOwnershipLimitAttributeTypeID',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, attributeDetails.ERC20.ownershipLimitTypeId.toString())
    }
  )

  await runTest(
    'total owners on ERC20 are initially set to zero',
    TPLERC20,
    'getTotalOwners',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, '0')
    }
  )

  await runTest(
    'transfers paused is initially false',
    TPLERC20,
    'transfersPaused',
    'call',
    [],
    true,
    value => {
      assert.strictEqual(value, false)
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
    'ERC20 owner attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.ownerTypeId,
      attributeDetails.ERC20.ownerDescription
    ],
    true
  )

  await runTest(
    'ERC20 operator attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.operatorTypeId,
      attributeDetails.ERC20.operatorDescription
    ],
    true
  )

  await runTest(
    'ERC20 maximum owners attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.maximumOwnersTypeId,
      attributeDetails.ERC20.maximumOwnersDescription
    ],
    true
  )

  await runTest(
    'ERC20 ownership limit attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.ownershipLimitTypeId,
      attributeDetails.ERC20.ownershipLimitDescription
    ],
    true
  )

  await runTest(
    'ERC20 transfers paused attribute type may be assigned to the jurisdiction',
    Jurisdiction,
    'addAttributeType',
    'send',
    [
      attributeDetails.ERC20.transfersPausedTypeId,
      attributeDetails.ERC20.transfersPausedTypeDescription
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
      attributeDetails.ERC20.ownerTypeId
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
    'regular validator may be approved to issue attributes on jurisdiction (1)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.ownerTypeId
    ],
    true
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction (2)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.operatorTypeId
    ],
    true
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction (3)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.maximumOwnersTypeId
    ],
    true
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction (4)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.ownershipLimitTypeId
    ],
    true
  )

  await runTest(
    'regular validator may be approved to issue attributes on jurisdiction (5)',
    Jurisdiction,
    'addValidatorApproval',
    'send',
    [
      address,
      attributeDetails.ERC20.transfersPausedTypeId
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
      attributeDetails.ERC20.ownerTypeId
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
    'regular validator may issue attributes to jurisdiction (1)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      address,
      attributeDetails.ERC20.ownerTypeId,
      0 // Value is not needed
    ]
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (1 +)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      attributedAddress,
      attributeDetails.ERC20.ownerTypeId,
      0 // Value is not needed
    ]
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (1 ++)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      extraAttributedAddress,
      attributeDetails.ERC20.ownerTypeId,
      0 // Value is not needed
    ]
  )

  await runTest(
    'ERC20 tokens may be minted with 0 value',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      0
    ]
  )

  await runTest(
    'ERC20 tokens may be burned with 0 value',
    TPLERC20,
    'burn',
    'send',
    [
      address,
      0
    ]
  )

  await runTest(
    'ERC20 tokens may be burnFrom-ed with 0 value',
    TPLERC20,
    'burnFrom',
    'send',
    [
      address,
      0
    ]
  )

  await runTest(
    'ERC20 token minting will fail w/ positive value before max holders is set',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      1
    ],
    false
  )

  await runTest(
    'ERC20 canTransfer will fail when trying to send to the null address',
    TPLERC20,
    'canTransfer',
    'call',
    [
      nullAddress,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x57')
    }
  )

  await runTest(
    'ERC20 canTransfer will fail when trying to send from unapproved address',
    TPLERC20,
    'canTransfer',
    'call',
    [
      address,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x56')
    },
    inattributedAddress
  )

  await runTest(
    'ERC20 transfer will fail when trying to send from an unapproved address',
    TPLERC20,
    'transfer',
    'send',
    [
      address,
      0
    ],
    false,
    {},
    inattributedAddress
  )

  await runTest(
    'ERC20 canTransfer will fail when trying to send to an unapproved address',
    TPLERC20,
    'canTransfer',
    'call',
    [
      inattributedAddress,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x57')
    }
  )

  await runTest(
    'ERC20 transfer will fail when trying to send to an unapproved address',
    TPLERC20,
    'transfer',
    'send',
    [
      inattributedAddress,
      0
    ],
    false
  )

  await runTest(
    'ERC20 canTransfer succeeds when checking 0 value between approved address',
    TPLERC20,
    'canTransfer',
    'call',
    [
      address,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x51')
    }
  )

  await runTest(
    'ERC20 transfer will succeed when sending 0 value between approved address',
    TPLERC20,
    'transfer',
    'send',
    [
      address,
      0
    ],
    true
  )

  await runTest(
    'ERC20 canTransferFrom fails when trying to send from unapproved operator',
    TPLERC20,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x58')
    }
  )

  await runTest(
    'ERC20 transferFrom fails when trying to send from an unapproved operator',
    TPLERC20,
    'transferFrom',
    'send',
    [
      address,
      address,
      0
    ],
    false
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (2)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      address,
      attributeDetails.ERC20.operatorTypeId,
      0 // Value is not needed
    ]
  )

  await runTest(
    'ERC20 canTransferFrom succeeds when sending from approved operator',
    TPLERC20,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      0
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x51')
    }
  )

  await runTest(
    'ERC20 transferFrom succeeds when sending from approved operator',
    TPLERC20,
    'transferFrom',
    'send',
    [
      address,
      address,
      0
    ]
  )

  await runTest(
    'ERC20 canTransferFrom fails when sending with insufficient allowance',
    TPLERC20,
    'canTransferFrom',
    'call',
    [
      address,
      address,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x53')
    }
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (3)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      TPLERC20.options.address,
      attributeDetails.ERC20.maximumOwnersTypeId,
      2
    ]
  )

  await runTest(
    'ERC20 tokens may not be minted if ownership limit is exceeded',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      10
    ],
    false
  )

  await runTest(
    'ERC20 tokens may not be minted if recipient is not approved',
    TPLERC20,
    'mint',
    'send',
    [
      inattributedAddress,
      10
    ],
    false
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (4)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      TPLERC20.options.address,
      attributeDetails.ERC20.ownershipLimitTypeId,
      10
    ]
  )

  await runTest(
    'ERC20 tokens may be minted if all requirements are met',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      10
    ]
  )

  await runTest(
    'ERC20 tokens may be burned if all requirements are met',
    TPLERC20,
    'burn',
    'send',
    [
      address,
      10
    ]
  )

  await runTest(
    'balance is set back to zero after burning',
    TPLERC20,
    'balanceOf',
    'call',
    [address],
    true,
    value => {
      assert.strictEqual(value, '0')
    }
  )  

  await runTest(
    'ERC20 tokens may be reminted if all requirements are met',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      10
    ]
  )

  await runTest(
    'ERC20 canTransfer succeeds when checking value between approved address',
    TPLERC20,
    'canTransfer',
    'call',
    [
      address,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], true)
      assert.strictEqual(value[1], '0x51')
    }
  )

  await runTest(
    'ERC20 transfer will succeed when sending value between approved addresses',
    TPLERC20,
    'transfer',
    'send',
    [
      address,
      1
    ]
  )

  await runTest(
    'ERC20 canTransfer will fail if total balance is insufficient',
    TPLERC20,
    'canTransfer',
    'call',
    [
      attributedAddress,
      11
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x52')
    }
  )

  await runTest(
    'ERC20 addresses can be approved to make transfers via an operator',
    TPLERC20,
    'approve',
    'send',
    [
      address,
      10
    ]
  )

  await runTest(
    'ERC20 transferFrom succeeds when sending value between approved address',
    TPLERC20,
    'transferFrom',
    'send',
    [
      address,
      attributedAddress,
      10
    ]
  )

  await runTest(
    'ERC20 tokens may be reminted if all requirements are met (2)',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      5
    ]
  )

  await runTest(
    'ERC20 tokens may be reminted if all requirements are met (3)',
    TPLERC20,
    'mint',
    'send',
    [
      address,
      5
    ]
  )

  await runTest(
    'ERC20 canTransfer will fail if recipient would exceed the ownership limit',
    TPLERC20,
    'canTransfer',
    'call',
    [
      attributedAddress,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x59')
    }
  )

  await runTest(
    'ERC20 transfer will fail if recipient would exceed the ownership limit',
    TPLERC20,
    'transfer',
    'send',
    [
      attributedAddress,
      1
    ],
    false
  )

  await runTest(
    'ERC20 canTransfer will fail if maximum owners would be exceeded',
    TPLERC20,
    'canTransfer',
    'call',
    [
      extraAttributedAddress,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x5a')
    }
  )

  await runTest(
    'ERC20 transfer will fail if maximum owners would be exceeded',
    TPLERC20,
    'transfer',
    'send',
    [
      extraAttributedAddress,
      1
    ],
    false
  )

  await runTest(
    'regular validator may issue attributes to jurisdiction (5)',
    Jurisdiction,
    'issueAttribute',
    'send',
    [
      TPLERC20.options.address,
      attributeDetails.ERC20.transfersPausedTypeId,
      10
    ]
  )

  await runTest(
    'ERC20 canTransfer will fail if transfers are paused',
    TPLERC20,
    'canTransfer',
    'call',
    [
      address,
      1
    ],
    true,
    value => {
      assert.strictEqual(value[0], false)
      assert.strictEqual(value[1], '0x54')
    }
  )

  await runTest(
    'ERC20 transfer will fail if transfers are paused',
    TPLERC20,
    'transfer',
    'send',
    [
      address,
      1
    ],
    false
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
