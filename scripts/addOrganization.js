var Web3 = require('web3')

var web3 = new Web3('ws://localhost:8545')

var ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
var deploymentAddresses = require('../build/contractDeploymentAddresses.json')

const ZEPValidator = new web3.eth.Contract(
	ZEPValidatorContractData.abi,
  deploymentAddresses.ZEPValidator
)

if (process.argv.length !== 5) {
  console.error(
	  'Error: bad number of arguments. Expected format:\n ' +
	  '$ node scripts/addOrganization.js ' + 
	  "0x1234567890123456789012345678901234567890 20 'an organization name'"
  )
  process.exit()
}

const organizationAddress = process.argv[2]
const maximumAddresses = process.argv[3]
const organizationName = process.argv[4]

if(!web3.utils.isAddress(organizationAddress)) {
  console.error('Error: provided address is not a valid Ethereum address.')
  process.exit() 
}

if (!web3.utils.checkAddressChecksum(organizationAddress)) {
  console.error('Error: checksum of provided address is invalid.')
  console.error(
    `Did you mean "${web3.utils.toChecksumAddress(organizationAddress)}"?`
  )
  process.exit()
}

async function addOrganization(
  organizationAddress,
  maximumAddresses,
  organizationName
) {
  console.log('looking for the validator owner address...')
  const addresses = await Promise.resolve(web3.eth.getAccounts())
  if (addresses.length === 0) {
    console.error('Error: cannot find any addresses.')
    process.exit()
  }
  const address = addresses[0]

  const ownerAddress = await ZEPValidator.methods.owner().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })

  let foundOwner = false
  for(i = 0; i < addresses.length; i++) {
    if (addresses[i] === ownerAddress) {
      foundOwner = true
      break
    }
  }

  if (!foundOwner) {
    console.error('Error: cannot find the owner address in provided addresses.')
    process.exit()
  }

  await ZEPValidator.methods.getOrganization(
    organizationAddress
  ).call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(organization => {
    if (organization.exists) {
      console.error(
        'Error: an organization already exists at the provided address.'
      )
      process.exit()
    }
  })

	console.log(
    `caling addOrganization(${organizationAddress}, ${maximumAddresses}, ` +
    `${organizationName}) from ${ownerAddress}...`
  )

  await ZEPValidator.methods.addOrganization(
    organizationAddress,
    maximumAddresses,
    organizationName
  ).send({
    from: ownerAddress,
    gas: 5000000,
    gasPrice: '1000000000'
  }).then(receipt => {
    const logs = receipt.events.OrganizationAdded.returnValues
    if (
      receipt.status &&
      logs.organization === organizationAddress &&
      logs.name, organizationName
    ) {
      console.log('organization successfully added.')
    } else {
      console.error('Error: could not add organization.')
      process.exit()
    }
  }).catch(error => {
    console.error('Error: could not add organization.')
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
    if (!(
      organization.exists &&
      organization.maximumAddresses === maximumAddresses.toString() &&
      organization.name === organizationName &&
      organization.issuedAddresses.length === 0
    )) {
    console.error('DANGER: organization has been created with inaccurate data!')
    }
  })

  process.exit()
}

addOrganization(organizationAddress, maximumAddresses, organizationName)
