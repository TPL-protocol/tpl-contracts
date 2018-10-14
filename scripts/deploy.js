var fs = require('fs');

const JurisdictionContractData = require('../build/contracts/BasicJurisdiction.json')
const TPLTokenContractData = require('../build/contracts/TPLTokenInstance.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

const Jurisdiction = new web3.eth.Contract(JurisdictionContractData.abi)
const TPLToken = new web3.eth.Contract(TPLTokenContractData.abi)

const TPLTokenAttributeID = applicationConfig.TPLTokenAttributeID
const TPLTokenTotalSupply = applicationConfig.TPLTokenTotalSupply

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

  await JurisdictionContractInstance.methods.initialize().send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    const jurisdictionAddress = JurisdictionContractInstance.options.address
    deployAddresses.jurisdiction = jurisdictionAddress
    console.log(`  jurisdiction: ${jurisdictionAddress} (initialized)`)
  })



  const TPLTokenContractInstance = await TPLToken.deploy({
    data: TPLTokenContractData.bytecode
  }).send({
    from: address,
    gas: 5000000,
    gasPrice: '1000000000'
  })

  await TPLTokenContractInstance.methods.initialize(
    TPLTokenTotalSupply,
    JurisdictionContractInstance.options.address,
    TPLTokenAttributeID
  ).send({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  }).then(receipt => {
    const tokenAddress = TPLTokenContractInstance.options.address
    deployAddresses.token = tokenAddress
    console.log(`mock TPL token: ${tokenAddress} (initialized)`)
  })

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