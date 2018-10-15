var assert = require('assert')

const JurisdictionContractData = require('../build/contracts/BasicJurisdiction.json')
const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const MockZEPTokenContractData = require('../build/contracts/TPLTokenInstance.json')
const applicationConfig = require('../config.js')

const mockZEPTokenAttributeID = applicationConfig.ZEPValidatorAttributeID
const ZEPValidatorDescription = applicationConfig.ZEPValidatorDescription

const mockZEPTokenTotalSupply = applicationConfig.mockZEPTokenTotalSupply
const mockZEPTokenAttributeRestricted = applicationConfig[
  'mockZEPTokenAttributeRestricted'
]
const mockZEPTokenAttributeMinimumRequiredStake = applicationConfig[
  'mockZEPTokenAttributeMinimumRequiredStake'
]
const mockZEPTokenAttributeJurisdictionFee = applicationConfig[
  'mockZEPTokenAttributeJurisdictionFee'
]
const mockZEPTokenAttributeDescription = applicationConfig[
  'mockZEPTokenAttributeDescription'
]

const ZEPOrganizationName = 'Mock ZEP Organization'

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
  const organizationAddress = addresses[1]
  const attributedAddress = addresses[2]
  const inattributedAddress = addresses[3]
  const nullAddress = '0x0000000000000000000000000000000000000000'

  const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
  const ZEPValidator = new web3.eth.Contract(ZEPValidatorContractData.abi)
  const MockZEPToken = new web3.eth.Contract(MockZEPTokenContractData.abi)

  const NiceJurisdictionBytecode = '0x608060405234801561001057600080fd5b50610' +
    '144806100206000396000f3006080604052600436106100565763ffffffff7c010000000' +
    '00000000000000000000000000000000000000000000000006000350416634b5f297a811' +
    '461005b57806350135c3a146100a0578063f9292ffb146100d6575b600080fd5b3480156' +
    '1006757600080fd5b5061008c73ffffffffffffffffffffffffffffffffffffffff60043' +
    '516602435610107565b604080519115158252519081900360200190f35b3480156100ac5' +
    '7600080fd5b506100d473ffffffffffffffffffffffffffffffffffffffff60043516602' +
    '43560443561010f565b005b3480156100e257600080fd5b506100d473fffffffffffffff' +
    'fffffffffffffffffffffffff60043516602435610114565b600192915050565b5050505' +
    '65b50505600a165627a7a723058205c8e3ea0efcf4a33839628ab99c4130bcb14c4c9bcf' +
    '7ffe6598e9e83ccb65eac0029'

  const NaughtyJurisdictionBytecode = '0x608060405234801561001057600080fd5b50' +
    '60fb8061001f6000396000f30060806040526004361060485763ffffffff7c0100000000' +
    '0000000000000000000000000000000000000000000000006000350416634b5f297a8114' +
    '604d57806350135c3a14608f575b600080fd5b348015605857600080fd5b50607b73ffff' +
    'ffffffffffffffffffffffffffffffffffff6004351660243560c2565b60408051911515' +
    '8252519081900360200190f35b348015609a57600080fd5b5060c073ffffffffffffffff' +
    'ffffffffffffffffffffffff6004351660243560443560ca565b005b600092915050565b' +
    '5050505600a165627a7a723058208d9ec5e4fb7457dd8e002af2e6990bc6bebd16775a2f' +
    'e18d55edef7ace7bfbae0029'



// *************************** deploy contracts *************************** //
  let deployGas;

  const latestBlock = await web3.eth.getBlock('latest')
  const gasLimit = latestBlock.gasLimit

  const JurisdictionContractInstance = await Jurisdiction.deploy(
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

  const jurisdictionAddress = JurisdictionContractInstance.options.address 

  const ZEPValidatorContractInstance = await ZEPValidator.deploy({
    data: ZEPValidatorContractData.bytecode
  }).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  })

  const ZEPValidatorAddress = ZEPValidatorContractInstance.options.address

  const MockZEPTokenContractInstance = await MockZEPToken.deploy({
    data: MockZEPTokenContractData.bytecode
  }).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  })

  const tokenAddress = MockZEPTokenContractInstance.options.address

  const NiceJurisdictionContractInstance = await Jurisdiction.deploy(
    {
      data: NiceJurisdictionBytecode
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })

  const NiceZEPValidatorContractInstance = await ZEPValidator.deploy({
    data: ZEPValidatorContractData.bytecode
  }).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  })

  const NaughtyJurisdictionContractInstance = await Jurisdiction.deploy(
    {
      data: NaughtyJurisdictionBytecode
    }
  ).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  }).catch(error => {
    console.error(error)
    process.exit(1)
  })

  const NaughtyZEPValidatorContractInstance = await ZEPValidator.deploy({
    data: ZEPValidatorContractData.bytecode
  }).send({
    from: address,
    gas: gasLimit - 1,
    gasPrice: 10 ** 1
  })

  console.log(' ✓ contracts deploy successfully')
  passed++

  await JurisdictionContractInstance.methods.initialize().send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ jurisdiction contract can be initialized"
    )
    passed++
  })

  await JurisdictionContractInstance.methods.pause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ Jurisdiction contract can be paused`)
  passed++

  await JurisdictionContractInstance.methods.unpause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ Jurisdiction contract can be unpaused`)
  passed++

  await ZEPValidatorContractInstance.methods.initialize(
    JurisdictionContractInstance.options.address,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ ZEP Validator contract can be initialized"
    )
    passed++
  })

  await NiceZEPValidatorContractInstance.methods.initialize(
    NiceJurisdictionContractInstance.options.address,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ Nice ZEP Validator contract can be initialized"
    )
    passed++
  })

  await NaughtyZEPValidatorContractInstance.methods.initialize(
    NaughtyJurisdictionContractInstance.options.address,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ Naughty ZEP Validator contract can be initialized"
    )
    passed++
  })

  await MockZEPTokenContractInstance.methods.initialize(
    mockZEPTokenTotalSupply,
    JurisdictionContractInstance.options.address,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ token contract can be initialized"
    )
    passed++
  })

  await JurisdictionContractInstance.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓ jurisdiction owner is set to the correct address')
    passed++
  })

  await ZEPValidatorContractInstance.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓ ZEP validator owner is set to the correct address')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getValidAttributeTypeID().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ID => {
    assert.strictEqual(ID, mockZEPTokenAttributeID.toString())
    console.log(' ✓ ZEP validator has the correct attribute ID')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations.length, 0)
    console.log(' ✓ ZEP validator organizations are initially empty')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizationInformation(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, false)
    assert.strictEqual(organization.maximumAccounts, '0')
    assert.strictEqual(organization.name, '')
    assert.strictEqual(organization.issuedAccounts.length, 0)
    console.log(' ✓ ZEP validator gives empty data for organization query')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getJurisdiction().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(foundJurisdictionAddress => {
    assert.strictEqual(foundJurisdictionAddress, jurisdictionAddress)
    console.log(
      ' ✓ ZEP validator points to the correct jurisdiction address'
    )
    passed++
  })

  await MockZEPTokenContractInstance.methods.getRegistry().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, jurisdictionAddress)
    console.log(
      ' ✓ registry utilized by mock token is set to the jurisdiction address'
    )
    passed++
  })
  
  await MockZEPTokenContractInstance.methods.balanceOf(address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(balance => {
    assert.strictEqual(balance, mockZEPTokenTotalSupply.toString())
    console.log(' ✓ mock token has the correct balance')
    passed++
  })

  await MockZEPTokenContractInstance.methods.transfer(inattributedAddress, 1).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓ tokens can't be transferred before valid attributes are assigned"
    )
    passed++
  })

  console.log(' ✓ ZEP validator can be properly set up by the jurisdiction')

  await JurisdictionContractInstance.methods.addAttributeType(
    mockZEPTokenAttributeID,
    mockZEPTokenAttributeDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓ ZEP attribute type can be added to jurisdiction`)
  passed++

  await JurisdictionContractInstance.methods.addValidator(
    ZEPValidatorAddress,
    ZEPValidatorDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓ ZEP validator can be added to jurisdiction`)
  passed++

  await JurisdictionContractInstance.methods.addValidatorApproval(
    ZEPValidatorAddress,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓ ZEP validator can be approved to issue target attribute`)
  passed++

  await ZEPValidatorContractInstance.methods.addOrganization(
    organizationAddress,
    20, // maximumAccounts
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(` ✓ ZEP validator can add an organization`)
    passed++

    const logs = receipt.events.OrganizationAdded.returnValues
    assert.strictEqual(logs.organization, organizationAddress)
    assert.strictEqual(logs.name, ZEPOrganizationName)
    console.log(' ✓ OrganizationAdded event is logged correctly')
    passed++
  })

  await ZEPValidatorContractInstance.methods.countOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations, '1')
    console.log(' ✓ the organizations can be counted')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(0).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization, organizationAddress)
    console.log(' ✓ the organization address can be found via index')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations.length, 1)
    assert.strictEqual(organizations[0], organizationAddress)
    console.log(' ✓ the organization address can be found via dynamic array')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizationInformation(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAccounts, '20')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAccounts.length, 0)
    console.log(
      ' ✓ ZEP validator gives correct data for organization query'
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.addOrganization(
    nullAddress,
    100,
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ ZEP validator cannot add an organization with an empty address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.addOrganization(
    organizationAddress,
    100,
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(` ✓ ZEP validator cannot add a duplicate organization`)
    passed++
  })

  await ZEPValidatorContractInstance.methods.addOrganization(
    address,
    100,
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(` ✓ ZEP validator can add multiple organizations`)
    passed++
  })

  await ZEPValidatorContractInstance.methods.addOrganization(
    inattributedAddress,
    100,
    ZEPOrganizationName
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(` ✓ non-owner cannot add an organization`)
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumIssuableAttributes(
    organizationAddress,
    2
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(
      ` ✓ ZEP validator can change maximum address an organization can issue`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations.length, 2)
    assert.strictEqual(organizations[0], organizationAddress)
    assert.strictEqual(organizations[1], address)
    console.log(' ✓ the organization addresses can still be found')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizationInformation(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAccounts, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAccounts.length, 0)
    console.log(
      ' ✓ ZEP validator gives updated data for organization query'
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumIssuableAttributes(
    inattributedAddress,
    2
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ ZEP validator cannot change maximum address for unknown organization`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumIssuableAttributes(
    organizationAddress,
    100
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ non-owner cannot change maximum address an organization can issue`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.pauseIssuance(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ ZEP validator attribute issuance can be paused`)
  passed++

  await ZEPValidatorContractInstance.methods.issuanceIsPaused(
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(isPaused => {
    assert.ok(isPaused)
    console.log(` ✓ checks for paused issuance return true when paused`)
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot issue attributes when issuance is paused`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.unpauseIssuance(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ ZEP validator attribute issuance can be unpaused`)
  passed++

  await ZEPValidatorContractInstance.methods.unpauseIssuance(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      ` ✓ attribute issuance cannot be unpaused when already unpaused`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.pause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ ZEP validator contract can be paused`)
  passed++

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot issue attributes when contract is paused`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.unpause(
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })
  console.log(` ✓ ZEP validator contract can be unpaused`)
  passed++

  await JurisdictionContractInstance.methods.removeValidator(
    ZEPValidatorAddress
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓ ZEP validator can be removed from jurisdiction`)
  passed++

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ jurisdiction will reject issued attributes when validator is removed`
    )
    passed++
  })

  await JurisdictionContractInstance.methods.addValidator(
    ZEPValidatorAddress,
    ZEPValidatorDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓ ZEP validator can be added back to jurisdiction`)
  passed++

  await JurisdictionContractInstance.methods.addValidatorApproval(
    ZEPValidatorAddress,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(
    ` ✓ ZEP validator must be reapproved to issue target attribute`
  )
  passed++

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ` ✓ organization can issue attributes to an address`
    )
    passed++

    const logs = receipt.events.AttributeIssued.returnValues
    assert.strictEqual(logs.organization, organizationAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    console.log(' ✓ AttributeIssued event is logged correctly')
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ duplicate attribute issuances on the same address are rejected`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumIssuableAttributes(
    organizationAddress,
    0
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ ZEP validator cannot change max addresses to amount below current`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizationInformation(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAccounts, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAccounts.length, 1)
    assert.strictEqual(organization.issuedAccounts[0], attributedAddress)
    console.log(
      ' ✓ ZEP validator gives updated data for organization query'
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    inattributedAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ non-organization cannot issue attributes to an address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    nullAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot issue attributes to an empty address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot issue attributes to duplicate addresses`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    address
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(
      ` ✓ organization can issue attributes to multiple address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizationInformation(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAccounts, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAccounts.length, 2)
    assert.strictEqual(organization.issuedAccounts[0], attributedAddress)
    assert.strictEqual(organization.issuedAccounts[1], address)
    console.log(
      ' ✓ ZEP validator gives updated data for organization query'
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    inattributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot issue attributes beyond the allowed maximum`
    )
    passed++
  })  

  await ZEPValidatorContractInstance.methods.revokeAttribute(
    attributedAddress
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ non-organization cannot revoke attributes from an address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.revokeAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ` ✓ organization can revoke attributes from an address`
    )
    passed++

    const logs = receipt.events.AttributeRevoked.returnValues
    assert.strictEqual(logs.organization, organizationAddress)
    assert.strictEqual(logs.attributee, attributedAddress)
    console.log(' ✓ AttributeRevoked event is logged correctly')
    passed++
  })

  await ZEPValidatorContractInstance.methods.revokeAttribute(
    nullAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot revoke attributes from zero address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.revokeAttribute(
    inattributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot revoke unissued attributes from an address`
    )
    passed++
  })

  // the "naughty" jurisdiction always returns false: attributes cannot be added
  await NaughtyZEPValidatorContractInstance.methods.addOrganization(
    organizationAddress,
    20, // maximumAccounts
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(` ✓ ZEP validator attached to naughty jurisdiction can add org`)
    passed++
  })

  await NaughtyZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization can't 'issue' attributes to naughty jurisdiction`
    )
    passed++
  })

  // the "nice" jurisdiction always returns true: attributes cannot be revoked
  await NiceZEPValidatorContractInstance.methods.addOrganization(
    organizationAddress,
    20, // maximumAccounts
    ZEPOrganizationName
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(` ✓ ZEP validator attached to nice jurisdiction can add org`)
    passed++
  })

  await NiceZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    assert.ok(receipt.status)
    console.log(
      ` ✓ organization can 'issue' attributes to nice jurisdiction`
    )
    passed++
  })

  await NiceZEPValidatorContractInstance.methods.revokeAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓ organization cannot revoke attributes when jurisdiction doesn't also`
    )
    passed++
  })

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )
  if (failed > 0) {
    process.exit(1)
  }

  process.exit(0)

}}
