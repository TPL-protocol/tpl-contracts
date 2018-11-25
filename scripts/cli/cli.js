var fs = require('fs');
const applicationConfig = require('../../config.js')
const connectionConfig = require('../../truffle.js')
const connection = connectionConfig.networks[applicationConfig.network]

let web3 = connection.provider

async function main() {
  async function send(
    title,
    instance,
    method,
    args,
    from,
    value,
    gas,
    gasPrice
  ) {
    let succeeded = true
    let errorMessage
    receipt = await instance.methods[method](...args).send({
      from: from,
      value: value,
      gas: gas,
      gasPrice: gasPrice
    }).catch(error => {
      succeeded = false
      errorMessage = error.message
    })

    if (succeeded) {
      if (receipt.events) {
        return [true, Object.values(receipt.events).map(event => {
          return `${event.event} => ${JSON.stringify(
            event.returnValues, null, 2
          )}`
        }).join(', ')]
      } else {
        return [true, 'success']
      }
    } else {
      return [false, errorMessage]
    }
  }

  async function call(
    title,
    instance,
    method,
    args,
    from,
    value,
    gas,
    gasPrice
  ) {
    let succeeded = true
    let errorMessage
    returnValues = await instance.methods[method](...args).call({
      from: from,
      value: value,
      gas: gas,
      gasPrice:gasPrice
    }).catch(error => {
      succeeded = false
      errorMessage = error.message
    })

    if (succeeded) {
      return [true, returnValues]
    } else {
      return [false, errorMessage]
    }
  }

  const latestBlock = await web3.eth.getBlock('latest')
  const gasLimit = latestBlock.gasLimit

  const deployMetadataFilename = 'build/contractDeploymentAddresses.json'

  let deployAddresses
  try {
    deployAddresses = require(`../../${deployMetadataFilename}`)
  } catch(error) {
    deployAddresses = {}
  }

  jurisdictionCommandsList = [
    'addAttributeType', 'addValidator', 'addValidatorApproval', 'issueAttribute',
     'revokeAttribute', 'hasAttribute', 'getAttributeValue', 'getAttributeTypeID',
     'countAttributeTypes', 'getValidators'
  ]

  details = {
    addattributetype: {
      function: 'addAttributeType',
      txType: 'send',
      argsType: ['number', 'string']
    },
    addvalidator: {
      function: 'addValidator',
      txType: 'send',
      argsType: ['address', 'string']
    },
    addvalidatorapproval: {
      function: 'addValidatorApproval',
      txType: 'send',
      argsType: ['address', 'number']
    },
    issueattribute: {
      function: 'issueAttribute',
      txType: 'send',
      argsType: ['address', 'number', 'number']
    },
    revokeattribute: {
      function: 'revokeAttribute',
      txType: 'send',
      argsType: ['number', 'string']
    },
    hasattribute: {
      function: 'hasAttribute',
      txType: 'call',
      argsType: ['address', 'number']
    },
    getattributevalue: {
      function: 'getAttributeValue',
      txType: 'call',
      argsType: ['address', 'number']
    },
    getattributetypeid: {
      function: 'getAttributeTypeID',
      txType: 'call',
      argsType: ['number']
    },
    countattributetypes: {
      function: 'countAttributeTypes',
      txType: 'call',
      argsType: []
    },
    getvalidators: {
      function: 'getValidators',
      txType: 'call',
      argsType: []
    }
  }

  function showArgs(cmdList) {
    const group = cmdList.map(cmd => {
      if (typeof(details[cmd.toLowerCase()]) === 'undefined') {
        console.log(`fix ${cmd} in details!`)
        process.exit(1)
      } 
      const argsString = details[cmd.toLowerCase()].argsType.join(', ')
      return `  ${cmd}${argsString.length > 0 ? ' => ' : ''}${argsString}`
    })

    return group.join('\n')
  }

  if (process.argv[2] === 'help' || process.argv[2] === '--help' || process.argv[2] === '-h') {
    console.log(`choose a command from the following (account index can be used for address arguments and ending in -[accountIndex] will send from that account):\n\nJurisdiction Commands\n${showArgs(jurisdictionCommandsList)}\n`)
    process.exit(0)
  }

  if (process.argv[2] === 'showAccounts' || process.argv[2] === 'showAddresses') {
    console.log(JSON.stringify(deployAddresses, null, 2))
    process.exit(0)
  }

  if (!('jurisdiction' in deployAddresses)) {
    console.log(`deploy a jurisdiction first: yarn deploy`)
    process.exit(1)
  }

  commandsList = jurisdictionCommandsList.concat()

  commands = new Set(commandsList.map(v => v.toLowerCase()))
  jurisdictionCommands = new Set(jurisdictionCommandsList.map(v => v.toLowerCase()))

  let commandType = process.argv[2]
  if (typeof(commandType) === 'undefined' || commandType === 'help') {
    console.log(`choose a command from the following (account index can be used for address arguments and ending in -[accountIndex] will send from that account):\n\nJurisdiction Commands\n${showArgs(jurisdictionCommandsList)}\n`)
    process.exit(0)
  } else {
    commandType = commandType.toLowerCase()
  }

  const accounts = await Promise.resolve(web3.eth.getAccounts())
  if (accounts.length === 0) {
    console.error('cannot find any accounts...')
    process.exit(1)
  }
  const account = accounts[0]

  if (commandType === 'getaccounts' || commandType === 'getaddresses') {
    console.log(`Accounts (found ${accounts.length}):`)
    accounts.forEach((account, index) => {
      console.log(` ${index}: ${account}`)
    })
    process.exit(0)
  }

  if (!commands.has(commandType)) {
    console.log(`must supply a command from the following: ${commandsList.join(', ')}`)
    process.exit(1)
  }

  let contractImportLocation
  let contractDeploymentAddress
  if (jurisdictionCommands.has(commandType)) {
    contractImportLocation = '../../build/contracts/BasicJurisdiction.json'
    //contractImportLocation = '../../build/contracts/ExtendedJurisdiction.json'
    contractDeploymentAddress = deployAddresses['jurisdiction']
  } else {
    console.log('cannot find contract.')
    process.exit(1)
  }

  const ContractData = require(contractImportLocation)

  const Contract = new web3.eth.Contract(
    ContractData.abi,
    contractDeploymentAddress
  )

  const rawArgs = process.argv.slice(3)
  let args
  let fromAccount
  if (
    rawArgs.length > 0 &&
    rawArgs[rawArgs.length - 1].length > 1 &&
    rawArgs[rawArgs.length - 1][0] === '-' &&
    parseInt(rawArgs[rawArgs.length - 1].slice(1), 10) < accounts.length
  ) {
    fromAccount = accounts[parseInt(rawArgs[rawArgs.length - 1].slice(1), 10)]
    args = rawArgs.slice(0, rawArgs.length - 1)
  } else {
    fromAccount = accounts[0]
    args = rawArgs 
  }

  if (details[commandType].argsType.length > args.length) {
    console.log(`not enough arguments to call ${commandType} (expected ${details[commandType].argsType.length}, got ${args.length})`)
    process.exit(1)
  }
  details[commandType].argsType.forEach((item, index) => {
    if (
      item === 'address' &&
      parseInt(args[index], 10) < accounts.length
    ) {
      args[index] = accounts[args[index]]
    }
  })

  args = args.map(arg => {
    if (arg === 'true') {
      return true
    } else if (arg === 'false') {
      return false
    }
    return arg
  })

  async function run(
    title,
    instance,
    method,
    callOrSend,
    args,
    from,
    value
  ) {
    if (typeof(callOrSend) === 'undefined') {
      callOrSend = 'send'
    }
    if (typeof(args) === 'undefined') {
      args = []
    }
    if (typeof(from) === 'undefined') {
      from = address
    }
    if (typeof(value) === 'undefined') {
      value = 0
    }
    let ok = false
    let message
    if (callOrSend === 'send') {
      ret = await send(
        title,
        instance,
        method,
        args,
        from,
        value,
        gasLimit - 1,
        10 ** 1
      )
      ok = ret[0]
      message = ret[1]
    } else if (callOrSend === 'call') {
      ret = await call(
        title,
        instance,
        method,
        args,
        from,
        value,
        gasLimit - 1,
        10 ** 1
      ) 
      ok = ret[0]
      message = ret[1]     
    } else {
      console.error('must use call or send!')
      process.exit(1)
    }

    if (ok) {
      console.log(` ✓ ${title}`)
      console.log(message)
    } else {
      console.log(` ✘ ${title}`)
      console.log(message)
    }
  }

  await run(
    process.argv.slice(2).join(' '),
    Contract,
    details[commandType].function,
    details[commandType].txType,
    args,
    fromAccount
  )

  process.exit(0)
}

main()
