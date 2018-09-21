var assert = require('assert');

const JurisdictionContractData = require('../build/contracts/BasicJurisdiction.json')
const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const MockZEPTokenContractData = require('../build/contracts/TPLToken.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
const ZEPValidator = new web3.eth.Contract(ZEPValidatorContractData.abi)
const MockZEPToken = new web3.eth.Contract(MockZEPTokenContractData.abi)

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

async function test() {
  console.log('running tests...')
  let passed = 0
  let failed = 0
  
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

  const JurisdictionContractInstance = await Jurisdiction.deploy({
    data: JurisdictionContractData.bytecode
  }).send({
    from: address,
    gas: 6000000,
    gasPrice: '1000000000'
  })

  const jurisdictionAddress = JurisdictionContractInstance.options.address

  const ZEPValidatorContractInstance = await ZEPValidator.deploy({
    data: ZEPValidatorContractData.bytecode,
    arguments: [
      JurisdictionContractInstance.options.address,
      mockZEPTokenAttributeID
    ]
  }).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })

  const ZEPValidatorAddress = ZEPValidatorContractInstance.options.address

  const MockZEPTokenContractInstance = await MockZEPToken.deploy({
    data: MockZEPTokenContractData.bytecode,
    arguments: [
      JurisdictionContractInstance.options.address,
      mockZEPTokenAttributeID,
      mockZEPTokenTotalSupply
    ]
  }).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })

  const tokenAddress = MockZEPTokenContractInstance.options.address

  console.log(' ✓ contracts deploy successfully')
  passed++

  await JurisdictionContractInstance.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓  - jurisdiction owner is set to the correct address')
    passed++
  })

  await ZEPValidatorContractInstance.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(ownerAddress => {
    assert.strictEqual(ownerAddress, address)
    console.log(' ✓  - ZEP validator owner is set to the correct address')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations.length, 0)
    console.log(' ✓  - ZEP validator organizations are initially empty')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, false)
    assert.strictEqual(organization.maximumAddresses, '0')
    assert.strictEqual(organization.name, '')
    assert.strictEqual(organization.issuedAddresses.length, 0)
    console.log(' ✓  - ZEP validator gives empty data for organization query')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getJurisdictionAddress().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(foundJurisdictionAddress => {
    assert.strictEqual(foundJurisdictionAddress, jurisdictionAddress)
    console.log(
      ' ✓  - ZEP validator points to the correct jurisdiction address'
    )
    passed++
  })

  await MockZEPTokenContractInstance.methods.getRegistryAddress().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(registryAddress => {
    assert.strictEqual(registryAddress, jurisdictionAddress)
    console.log(
      ' ✓  - registry utilized by mock token is set to the jurisdiction address'
    )
    passed++
  })
  
  await MockZEPTokenContractInstance.methods.balanceOf(address).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(balance => {
    assert.strictEqual(balance, mockZEPTokenTotalSupply.toString())
    console.log(' ✓  - mock token has the correct balance')
    passed++
  })

  await MockZEPTokenContractInstance.methods.transfer(inattributedAddress, 1).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).catch(error => {
    console.log(
      " ✓  - tokens can't be transferred before valid attributes are assigned"
    )
    passed++
  })

  console.log(' ✓ ZEP validator can be properly set up by the jurisdiction')

  await JurisdictionContractInstance.methods.addAttributeType(
    mockZEPTokenAttributeID,
    false,
    false,
    nullAddress,
    0,
    0,
    0,
    mockZEPTokenAttributeDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓  - ZEP attribute type can be added to jurisdiction`)
  passed++

  await JurisdictionContractInstance.methods.addValidator(
    ZEPValidatorAddress,
    ZEPValidatorDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓  - ZEP validator can be added to jurisdiction`)
  passed++

  await JurisdictionContractInstance.methods.addValidatorApproval(
    ZEPValidatorAddress,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` ✓  - ZEP validator can be approved to issue target attribute`)
  passed++

  await ZEPValidatorContractInstance.methods.addOrganization(
    organizationAddress,
    20, // maximumAddresses
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
    console.log(' ✓  - OrganizationAdded event is logged correctly')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organizations => {
    assert.strictEqual(organizations.length, 1)
    assert.strictEqual(organizations[0], organizationAddress)
    console.log(' ✓  - the organization address can be found')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAddresses, '20')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAddresses.length, 0)
    console.log(
      ' ✓  - ZEP validator gives correct data for organization query'
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
      ` ✓  - ZEP validator cannot add an organization with an empty address`
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
    console.log(` ✓  - ZEP validator cannot add a duplicate organization`)
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
    console.log(` ✓  - ZEP validator can add multiple organizations`)
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
    console.log(` ✓  - non-owner cannot add an organization`)
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumAddresses(
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
    console.log(' ✓  - the organization addresses can still be found')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAddresses, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAddresses.length, 0)
    console.log(
      ' ✓  - ZEP validator gives updated data for organization query'
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.setMaximumAddresses(
    organizationAddress,
    100
  ).send({
    from: inattributedAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).catch(error => {
    console.log(
      ` ✓  - non-owner cannot change maximum address an organization can issue`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.issueAttribute(
    attributedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    console.log(
      ` ✓ organization can issue attributes to an address`
    )
    passed++

    const logs = receipt.events.AttributeIssued.returnValues
    assert.strictEqual(logs.organization, organizationAddress)
    assert.strictEqual(logs.attributedAddress, attributedAddress)
    console.log(' ✓  - AttributeIssued event is logged correctly')
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAddresses, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAddresses.length, 1)
    assert.strictEqual(organization.issuedAddresses[0], attributedAddress)
    console.log(
      ' ✓  - ZEP validator gives updated data for organization query'
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
      ` ✓  - non-organization cannot issue attributes to an address`
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
      ` ✓  - organization cannot issue attributes to an empty address`
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
      ` ✓  - organization cannot issue attributes to duplicate addresses`
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
      ` ✓  - organization can issue attributes to multiple address`
    )
    passed++
  })

  await ZEPValidatorContractInstance.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    assert.strictEqual(organization.exists, true)
    assert.strictEqual(organization.maximumAddresses, '2')
    assert.strictEqual(organization.name, ZEPOrganizationName)
    assert.strictEqual(organization.issuedAddresses.length, 2)
    assert.strictEqual(organization.issuedAddresses[0], attributedAddress)
    assert.strictEqual(organization.issuedAddresses[1], address)
    console.log(
      ' ✓  - ZEP validator gives updated data for organization query'
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
      ` ✓  - organization cannot issue attributes beyond the allowed maximum`
    )
    passed++
  })  

  console.log(
    `completed ${passed + failed} tests with ${failed} ` +
    `failure${failed === 1 ? '' : 's'}.`
  )
  process.exit()
}

test()
