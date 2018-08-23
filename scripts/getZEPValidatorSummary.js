var Web3 = require('web3')

var web3 = new Web3('ws://localhost:8545')

var ZEPValidatorContractData = require('../build/contracts/ZEPValidator.json')
var deploymentAddresses = require('../build/contractDeploymentAddresses.json')

const ZEPValidator = new web3.eth.Contract(
	ZEPValidatorContractData.abi,
  deploymentAddresses.ZEPValidator
)

async function getZEPValidatorSummary() {
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

  const registry = await ZEPValidator.methods.getJurisdictionAddress().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })

  const organizations = await ZEPValidator.methods.getOrganizations().call({
    from: address,
    gas: 5000000,
    gasPrice: 10 ** 9
  })

  const organizationDetails = await Promise.all(
    organizations.map(async organizationAddress => {
      const organizationData = await ZEPValidator.methods.getOrganization(
        organizationAddress
      ).call({
        from: address,
        gas: 5000000,
        gasPrice: 10 ** 9
      })

      return {
        name: organizationData.name,
        address: organizationAddress,
        assigned: organizationData.issuedAddresses.length,
        max: parseInt(organizationData.maximumAddresses, 10),
        addresses: organizationData.issuedAddresses
      }
    })
  )

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
