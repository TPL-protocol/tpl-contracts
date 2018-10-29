var fs = require('fs');
const applicationConfig = require('../../config.js')
const connectionConfig = require('../../truffle.js')
const connection = connectionConfig.networks[applicationConfig.network]

const deployMetadataFilename = 'build/contractDeploymentAddresses.json'

let deployAddresses
try {
  deployAddresses = require(`../../${deployMetadataFilename}`)
} catch(error) {
  deployAddresses = {}
}

let deployType = process.argv[2] // Provide Basic or Extended jurisdiction type
if (typeof(deployType) === 'undefined') {
  deployType = 'extended'
} else {
  deployType = deployType.toLowerCase()
}

if (deployType === 'erc20') {
  deployType = 'drinktoken'
}

if (deployType === 'erc721') {
  deployType = 'cryptocopycats'
}

if (deployType === 'validator' || deployType === 'ccc') {
  deployType = 'cryptocopycatscooperative'
}

  const attributeDetails = {
    drinktoken: {
      name: "Drink Token",
      typeId: '11111',
      description: 'Valid token recipient'
    },
    cryptocopycats: {
      name: "Crypto Copycats",
      typeId: '22222',
      description: 'Valid token holder' 
    },
    cryptocopycatscooperative: {
      name: "Crypto Copycats Cooperative",
      typeId: '22222',
      description: 'Designated validator'
    }
  }

let showAccounts = process.argv[3] // Provide if you'd like to dump accounts

const deployTypeOptions = new Set(['basic', 'extended', 'drinktoken', 'cryptocopycats', 'cryptocopycatscooperative'])
if (!deployTypeOptions.has(deployType)) {
  console.error('must supply "Basic", "Extended", "DrinkToken", "CryptoCopycats", or "CryptoCopycatsCooperative" as the target!')
  process.exit(1)
}

let args
if (deployType === 'drinktoken') {
  const jurisdiction = deployAddresses.jurisdiction
  
  if (typeof(jurisdiction) === 'undefined') {
    console.error('must first deploy a jurisdiction before attaching other contracts!')
    process.exit(1)
  }

  args = [
    jurisdiction,
    attributeDetails[deployType].typeId
  ]


} else if (deployType === 'cryptocopycats') {
  const jurisdiction = deployAddresses.jurisdiction
  
  if (typeof(jurisdiction) === 'undefined') {
    console.error('must first deploy a jurisdiction before attaching a token!')
    process.exit(1)
  }

  args = [
    jurisdiction,
    attributeDetails[deployType].typeId
  ]

} else if (deployType === 'cryptocopycatscooperative') {
  const jurisdiction = deployAddresses.jurisdiction
  
  if (typeof(jurisdiction) === 'undefined') {
    console.error('must first deploy a jurisdiction before attaching a token!')
    process.exit(1)
  }

  args = [
    jurisdiction,
    attributeDetails[deployType].typeId
  ]

} else {
  args = []
}

let contractImportLocation
if (deployType === 'basic') {
  contractImportLocation = '../../build/contracts/BasicJurisdiction.json'
} else if (deployType === 'extended') {
  contractImportLocation = '../../build/contracts/ExtendedJurisdiction.json'
} else if (deployType === 'drinktoken') {
  contractImportLocation = '../../build/contracts/DrinkToken.json'
} else if (deployType === 'cryptocopycats') {
  contractImportLocation = '../../build/contracts/CryptoCopycats.json'
} else if (deployType === 'cryptocopycatscooperative') {
  contractImportLocation = '../../build/contracts/CryptoCopycatsCooperative.json'
}

const ContractData = require(contractImportLocation)

let web3 = connection.provider

const Contract = new web3.eth.Contract(ContractData.abi)

async function main() {
  console.log(
    `deploying ${
      deployType
    }${
      (
        deployType !== 'drinktoken' &&
        deployType !== 'cryptocopycats' &&
        deployType !== 'cryptocopycatscooperative'
      ) ? ' jurisdiction' : ''
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
  if (
        deployType !== 'drinktoken' &&
        deployType !== 'cryptocopycats' &&
        deployType !== 'cryptocopycatscooperative'
      ) {
    deployAddresses.jurisdictionOwner = account
  } else if (deployType === 'drinktoken') {
    deployAddresses.ERC20Owner = account
  } else if (deployType === 'cryptocopycats') {
    deployAddresses.ERC721Owner = account
  } else if (deployType === 'cryptocopycatscooperative') {
    deployAddresses.validatorOwner = account
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
  if (
    deployType !== 'drinktoken' &&
    deployType !== 'cryptocopycats' &&
    deployType !== 'cryptocopycatscooperative'
  ) {
    deployAddresses.jurisdiction = deployedAddress
    console.log(`  jurisdiction: ${deployedAddress}`)
  } else if (deployType === 'drinktoken') {
    deployAddresses.ERC20 = deployedAddress
    console.log(`   drink token: ${deployedAddress}`)
  } else if (deployType === 'cryptocopycats') {
    deployAddresses.ERC721 = deployedAddress
    console.log(` copycat token: ${deployedAddress}`)    
  } else if (deployType === 'cryptocopycatscooperative') {
    deployAddresses.validator = deployedAddress
    console.log(` ccc validator: ${deployedAddress}`)    
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
