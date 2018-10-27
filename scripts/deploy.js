var fs = require('fs');
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')
const connection = connectionConfig.networks[applicationConfig.network]

const deployMetadataFilename = 'build/contractDeploymentAddresses.json'

let deployAddresses
try {
  deployAddresses = require(`../${deployMetadataFilename}`)
} catch(error) {
  deployAddresses = {}
}

let deployType = process.argv[2] // Provide Basic or Extended jurisdiction type
if (typeof(deployType) === 'undefined') {
  deployType = 'extended'
} else {
  deployType = deployType.toLowerCase()
}

let showAccounts = process.argv[3] // Provide if you'd like to dump accounts

const deployTypeOptions = new Set(['basic', 'extended', 'token'])
if (!deployTypeOptions.has(deployType)) {
  console.error('must supply "basic", "extended", or "token" as the target!')
  process.exit(1)
}

let args
if (deployType === 'token') {
  const jurisdiction = deployAddresses.jurisdiction
  
  if (typeof(jurisdiction) === 'undefined') {
    console.error('must first deploy a jurisdiction before attaching a token!')
    process.exit(1)
  }

  args = [
    applicationConfig.TPLTokenTotalSupply,
    jurisdiction,
    applicationConfig.TPLTokenAttributeID
  ]
} else {
  args = []
}

let contractImportLocation
if (deployType === 'basic') {
  contractImportLocation = '../build/contracts/BasicJurisdiction.json'
} else if (deployType === 'extended') {
  contractImportLocation = '../build/contracts/ExtendedJurisdiction.json'
} else if (deployType === 'token') {
  contractImportLocation = '../build/contracts/TPLERC20RestrictedReceiverInstance.json'
}

const ContractData = require(contractImportLocation)

let web3 = connection.provider

const Contract = new web3.eth.Contract(ContractData.abi)

async function main() {
  console.log(
    `deploying ${
      deployType
    }${
      deployType !== 'token' ? ' jurisdiction' : ''
    } to ${
      applicationConfig.network
    } network...`
  )
  
  const accounts = await Promise.resolve(web3.eth.getAccounts())
  if (accounts.length === 0) {
    console.error('cannot find any accounts...')
    process.exit(1)
  }
  
  const account = accounts[0]
  if (deployType !== 'token') {
    deployAddresses.jurisdictionOwner = account
  } else {
    deployAddresses.tokenOwner = account
  }
  
  console.log(`   deployed by: ${account}`)

  const ContractInstance = await Contract.deploy({
    data: ContractData.bytecode,
    arguments: args
  }).send({
    from: account,
    gas: 7000000,
    gasPrice: '10000000000'
  })

  const deployedAddress = ContractInstance.options.address
  if (deployType !== 'token') {
    deployAddresses.jurisdiction = deployedAddress
    console.log(`  jurisdiction: ${deployedAddress}`)
  } else {
    deployAddresses.token = deployedAddress
    console.log(`    mock token: ${deployedAddress}`)
  }

  fs.writeFile(
    deployMetadataFilename,
    JSON.stringify(deployAddresses),
    {flag: 'w'},
    err => {
      if (err) {
        console.error(err)
        process.exit(1)
      }
      console.log(`metadata written to ${deployMetadataFilename}`)
      if (showAccounts === 'verbose') {
        console.log()
        console.log(JSON.stringify(deployAddresses, null, 2))
      }
      process.exit(0)
    }
  )
}

main()
