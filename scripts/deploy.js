var fs = require('fs');

const JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const MockZEPTokenContractData = require('../build/contracts/MockZEPToken.json')
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

async function main() {
	console.log('deploying jurisdiction, ZEP validator, & mock ZEP token...')
	let deployAddresses = {}
  const deployMetadataFilename = 'build/contractDeploymentAddresses.json'
	const addresses = await Promise.resolve(web3.eth.getAccounts())
	if (addresses.length === 0) {
		console.log('cannot find any addresses...')
		return false
	}
	const address = addresses[0]
	deployAddresses.owner = address
	console.log(`         owner: ${address}`)

	const JurisdictionContractInstance = await Jurisdiction.deploy({
	  data: JurisdictionContractData.bytecode
	}).send({
    from: address,
    gas: 6000000,
    gasPrice: '1000000000'
	})

	const jurisdictionAddress = JurisdictionContractInstance.options.address
	deployAddresses.jurisdiction = jurisdictionAddress
  console.log(`  jurisdiction: ${jurisdictionAddress}`)

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
  deployAddresses.ZEPValidator = ZEPValidatorAddress
  console.log(` ZEP Validator: ${ZEPValidatorAddress}`)

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
	deployAddresses.token = tokenAddress
  console.log(`mock ZEP token: ${tokenAddress}`)

  console.log('setting up ZEP validator in jurisdiction...')

  await JurisdictionContractInstance.methods.addAttributeType(
    mockZEPTokenAttributeID,
    mockZEPTokenAttributeRestricted,
    mockZEPTokenAttributeMinimumRequiredStake,
    mockZEPTokenAttributeJurisdictionFee,
    mockZEPTokenAttributeDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` - added ZEP attribute type to jurisdiction`)

  await JurisdictionContractInstance.methods.addValidator(
    ZEPValidatorAddress,
    ZEPValidatorDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` - added ZEP validator to jurisdiction`)

  await JurisdictionContractInstance.methods.addValidatorApproval(
    ZEPValidatorAddress,
    mockZEPTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` - approved ZEP validator to issue attribute`)

  fs.writeFile(
  	deployMetadataFilename,
  	JSON.stringify(deployAddresses),
  	{flag: 'w'},
  	err => {
      if (err) {
        console.error(err)
        process.exit()
      }
      console.log(`metadata written to ${deployMetadataFilename}`)
      process.exit()
	  }
	)
}

main()