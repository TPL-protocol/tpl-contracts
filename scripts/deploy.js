var Web3 = require('web3')

var fs = require('fs');

var web3 = new Web3('ws://localhost:8545')

var JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
var ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
var MockZEPTokenContractData = require('../build/contracts/MockZEPToken.json')

const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
const ZEPValidator = new web3.eth.Contract(ZEPValidatorContractData.abi)
const MockZEPToken = new web3.eth.Contract(MockZEPTokenContractData.abi)

const mockZEPTokenAttributeID = 1
const mockZEPTokenTotalSupply = 100

const mockZEPTokenAttributeRestricted = false
const mockZEPTokenAttributeMinimumRequiredStake = 0
const mockZEPTokenAttributeJurisdictionFee = 0
const mockZEPTokenAttributeDescription = 'Valid ZEP token holder'

const mockZEPTokenValidatorDescription = 'ZEP validator contract'

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
    tokenAddress,
    mockZEPTokenValidatorDescription
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })
  console.log(` - added ZEP validator to jurisdiction`)

  await JurisdictionContractInstance.methods.addValidatorApproval(
    tokenAddress,
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