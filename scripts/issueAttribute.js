const JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const deploymentAddresses = require('../build/contractDeploymentAddresses.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

const mockZEPTokenAttributeID = applicationConfig.ZEPValidatorAttributeID

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
  
  const ZEPValidator = new web3.eth.Contract(
    ZEPValidatorContractData.abi,
    deploymentAddresses.ZEPValidator,
    {
      from: address,
      gasPrice: connection.gasPrice,
      gas: connection.gas,
      data: ZEPValidatorContractData.bytecode
    }
  )

  const Jurisdiction = new web3.eth.Contract(
    JurisdictionContractData.abi,
    deploymentAddresses.jurisdiction,
    {
      from: address,
      gasPrice: connection.gasPrice,
      gas: connection.gas,
      data: JurisdictionContractData.bytecode
    }
  )

  let organizationAddress = null
  for (i = 0; i < addresses.length; i++) {
    const organization = await ZEPValidator.methods.getOrganization(
      addresses[i]
    ).call()

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
  ).call().then(organization => {
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
  ).call().then(attributeExists => { 
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
    from: organizationAddress
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
  ).call().then(organization => {
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
