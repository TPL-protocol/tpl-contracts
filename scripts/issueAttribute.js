var Web3 = require('web3')

var web3 = new Web3('ws://localhost:8545')

var ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
var JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
var deploymentAddresses = require('../build/contractDeploymentAddresses.json')

const mockZEPTokenAttributeID = 1 // NOTE: retrieve from a configuration file?

const ZEPValidator = new web3.eth.Contract(
	ZEPValidatorContractData.abi,
  deploymentAddresses.ZEPValidator
)

const Jurisdiction = new web3.eth.Contract(
  JurisdictionContractData.abi,
  deploymentAddresses.jurisdiction
)

if (process.argv.length !== 3) {
  console.error(
	  'Error: bad number of arguments. Expected format:\n $ ' +
	  'node scripts/issueAttribute.js 0x1234567890123456789012345678901234567890'
  )
  process.exit()
}

const issuedAddress = process.argv[2]

if(!web3.utils.isAddress(issuedAddress)) {
  console.error('Error: provided address is not a valid Ethereum address.')
  process.exit() 
}

if (!web3.utils.checkAddressChecksum(issuedAddress)) {
  console.error('Error: checksum of provided address is invalid.')
  console.error(
    `Did you mean "${web3.utils.toChecksumAddress(issuedAddress)}"?`
  )
  process.exit()
}

async function issueAttribute(issuedAddress) {
  console.log('looking for an organization address...')
  const addresses = await Promise.resolve(web3.eth.getAccounts())
  if (addresses.length === 0) {
    console.error('Error: cannot find any addresses.')
    process.exit()
  }
  const address = addresses[0]
  
  let organizationAddress = null
  for (i = 0; i < addresses.length; i++) {
    const organization = await ZEPValidator.methods.getOrganization(
      addresses[i]
    ).call({
      from: address,
      gas: 5000000,
      gasPrice: 10 ** 9
    })

    if (organization.exists) {
      organizationAddress = addresses[i]
      break
    }
  }

  if (organizationAddress === null) {
    console.error('Error: cannot find an organization in provided addresses.')
    process.exit()
  }

  await ZEPValidator.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    if (organization.issuedAddresses.length >= organization.maximumAddresses) {
      console.error(
        'Error: the organization is not approved to issue additional addresses.'
      )
      process.exit()
    }
  })

  await Jurisdiction.methods.hasAttribute(
    issuedAddress,
    mockZEPTokenAttributeID
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(attributeExists => { 
    if (attributeExists) {
      console.error(
        'Error: the provided address has already been assigned an attribute.'
      )
      process.exit()
    }
  })

	console.log(
    `caling issueAttribute(${issuedAddress}) from ${organizationAddress}...`
  )

  await ZEPValidator.methods.issueAttribute(
    issuedAddress
  ).send({
    from: organizationAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    const logs = receipt.events.AttributeIssued.returnValues
    if (
      receipt.status &&
      logs.organization === organizationAddress &&
      logs.attributedAddress === issuedAddress
    ) {
      console.log('attribute successfully issued.')
    } else {
      console.error('Error: could not issue attribute.')
      process.exit()
    }
  }).catch(error => {
    console.error('Error: could not issue attribute.')
    console.error(error)
    process.exit()
  })

  await ZEPValidator.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    const issuedAddresses = organization.issuedAddresses.length
    const lastAddress = organization.issuedAddresses.pop()
    if (!(
      organization.exists &&
      lastAddress === issuedAddress
    )) {
      console.error(
        'DANGER: attribute has been issued with inaccurate address!'
      )
    }
    if (issuedAddresses >= organization.maximumAddresses) {
      console.log(
        'all available addresses for this organization have now been used.'
      )
    } else {
      console.log(
        `${issuedAddresses} out of ${organization.maximumAddresses} ` +
        'available addresses for this organization have been used.'
      )
    }
  })

  process.exit()
}

issueAttribute(issuedAddress)
