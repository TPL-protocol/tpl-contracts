const ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
const deploymentAddresses = require('../src/build/contractDeploymentMetadata.json')
const applicationConfig = require('../config.js')
const connectionConfig = require('../truffle.js')

const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

async function getZEPValidatorSummary() {
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

  const registry = await ZEPValidator.methods.getJurisdictionAddress().call()

  const organizations = await ZEPValidator.methods.getOrganizations().call()

  const organizationDetails = await Promise.all(
    organizations.map(async organizationAddress => {
      const organizationData = await ZEPValidator.methods.getOrganization(
        organizationAddress
      ).call()

      return {
        name: organizationData.name,
        address: organizationAddress,
        assigned: organizationData.issuedAddresses.length,
        max: parseInt(organizationData.maximumAddresses, 10),
        addresses: organizationData.issuedAddresses
      }
    })
  )

  // dump retrieved summary information to the console
  console.log(`ZEP Validator address:   ${deploymentAddresses.ZEPValidator}`)
  console.log(`Validator owner address: ${ownerAddress}`)
  console.log(`Jurisdiction address:    ${registry}`)
  console.log(`Organizations (total of ${organizations.length}):`)
  organizationDetails.forEach((o, i) => {
    console.log(`${i+1}) ${o.name}`)
    console.log(`   ${o.address}`)
    console.log(
      `   ${o.assigned} out of ${o.max} addresses assigned an attribute`
    )
    o.addresses.forEach((a, j) => {
      console.log(`     * ${j+1}: ${a}`)
    })
    console.log('')
  })

  process.exit()
}

getZEPValidatorSummary()
