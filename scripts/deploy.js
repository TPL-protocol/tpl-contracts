var Web3 = require('web3')

var fs = require('fs');

var JurisdictionContractData = require('../build/contracts/Jurisdiction.json')
var TPLTokenContractData = require('../build/contracts/TPLToken.json')

var web3 = new Web3('ws://localhost:8545')

const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
const TPLToken = new web3.eth.Contract(TPLTokenContractData.abi)

async function main() {
	console.log('deploying jurisdiction & an example token that references it...')
	let deployAddresses = {}
	const addresses = await Promise.resolve(web3.eth.getAccounts())
	if (addresses.length === 0) {
		console.log('cannot find any addresses...')
		return false
	}
	const address = addresses[0]
	deployAddresses.owner = address
	console.log(`       owner: ${address}`)

	Jurisdiction.deploy({
	  data: JurisdictionContractData.bytecode
	})
	.send({
    from: address,
    gas: 6000000,
    gasPrice: '1000000000'
	})
	.on('error', error => { console.error(error) })
  .then(JurisdictionContractInstance => {
  	const jurisdictionAddress = JurisdictionContractInstance.options.address
  	deployAddresses.jurisdiction = jurisdictionAddress
	  console.log(`jurisdiction: ${jurisdictionAddress}`)
		TPLToken.deploy({
		  data: TPLTokenContractData.bytecode,
		  arguments: [JurisdictionContractInstance.options.address, 100]
		})
		.send({
	    from: address,
	    gas: 5000000,
	    gasPrice: '1000000000'
		})
		.on('error', error => { console.error(error) })
	  .then(TPLTokenContractInstance => {
	  	const tokenAddress = TPLTokenContractInstance.options.address
	  	const deployMetadataFilename = 'build/contractDeploymentAddresses.json'
	  	deployAddresses.token = tokenAddress
		  console.log(`       token: ${tokenAddress}`)
		  fs.writeFile(
		  	deployMetadataFilename,
		  	JSON.stringify(deployAddresses),
		  	{flag: 'w'},
		  	err => {
		      if (err) {
		        return console.error(err)
		      }
		      console.log(`metadata written to ${deployMetadataFilename}`)
		      process.exit()
			  }
			) 
		})
	})
}

main()