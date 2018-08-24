const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const deploymentAddresses = require('../build/contractDeploymentAddresses.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

if (process.argv.length !== 4) {
  console.error(
	  'Error: bad number of arguments. Expected format:\n ' +
	  '$ node scripts/setMaximumAddresses.js ' + 
	  '0x1234567890123456789012345678901234567890 100'
  )
  process.exit()
}

const organizationAddress = process.argv[2]
const maximumAddresses = process.argv[3]

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

async function setMaximumAddresses(
  organizationAddress,
  maximumAddresses
) {
  console.log('looking for the validator owner address...')
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

  const ownerAddress = await ZEPValidator.methods.owner().call()

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
  ).call().then(organization => {
    if (!organization.exists) {
      console.error(
        'Error: an organization does not exist at the provided address.'
      )
      process.exit()
    }
  })

	console.log(
    `caling setMaximumAddresses(${organizationAddress}, ${maximumAddresses}) ` +
    `from ${ownerAddress}...`
  )

  await ZEPValidator.methods.setMaximumAddresses(
    organizationAddress,
    maximumAddresses
  ).send({
    from: ownerAddress
  }).then(receipt => {
    if (receipt.status) {
      console.log('maximum addresses successfully set for the organization.')
    } else {
      console.error(
        'Error: could not set maximum addresses for the organization.'
      )
      process.exit()
    }
  }).catch(error => {
    console.error(
      'Error: could not set maximum addresses for the organization.'
    )
    console.error(error)
    process.exit()
  })

  await ZEPValidator.methods.getOrganization(
    organizationAddress
  ).call().then(organization => {
    if (!(
      organization.exists &&
      organization.maximumAddresses === maximumAddresses.toString()
    )) {
    console.error('DANGER: organization now has inaccurate data!')
    }
  })

  process.exit()
}

setMaximumAddresses(organizationAddress, maximumAddresses)
