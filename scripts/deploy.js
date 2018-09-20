var fs = require('fs');

const JurisdictionContractData = require('../build/contracts/StandardJurisdiction.json')
const TPLTokenContractData = require('../build/contracts/TPLToken.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
const TPLToken = new web3.eth.Contract(TPLTokenContractData.abi)

const TPLTokenAttributeID = applicationConfig.TPLTokenAttributeID
const TPLTokenTotalSupply = applicationConfig.TPLTokenTotalSupply
const TPLTokenAttributeRestricted = applicationConfig[
  'TPLTokenAttributeRestricted'
]
const TPLTokenAttributeMinimumRequiredStake = applicationConfig[
  'TPLTokenAttributeMinimumRequiredStake'
]
const TPLTokenAttributeJurisdictionFee = applicationConfig[
  'TPLTokenAttributeJurisdictionFee'
]
const TPLTokenAttributeDescription = applicationConfig[
  'TPLTokenAttributeDescription'
]

async function main() {
	console.log('deploying jurisdiction & mock TPLToken...')
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
    gas: 5000000,
    gasPrice: '1000000000'
	})

	const jurisdictionAddress = JurisdictionContractInstance.options.address
	deployAddresses.jurisdiction = jurisdictionAddress
  console.log(`  jurisdiction: ${jurisdictionAddress}`)

  const TPLTokenContractInstance = await TPLToken.deploy({
	  data: TPLTokenContractData.bytecode,
	  arguments: [
      JurisdictionContractInstance.options.address,
      TPLTokenAttributeID,
      TPLTokenTotalSupply
    ]
	}).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
	})

	const tokenAddress = TPLTokenContractInstance.options.address
	deployAddresses.token = tokenAddress
  console.log(`mock TPL token: ${tokenAddress}`)

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