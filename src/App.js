import React, { Component } from 'react'
import Web3 from 'web3'
import ProviderEngine from 'web3-provider-engine'
import WebsocketSubprovider from 'web3-provider-engine/subproviders/websocket'
import TransportU2F from '@ledgerhq/hw-transport-u2f'
import createLedgerSubprovider from '@ledgerhq/web3-subprovider'
import * as moment from 'moment'
import { Row, Col } from 'react-simple-flex-grid'
import 'react-simple-flex-grid/lib/main.css'
import './App.css'
import config from './config.json'
import deploymentMetadata from './build/contractDeploymentMetadata.json'

const ZEPValidatorAddress = deploymentMetadata.ZEPValidator
const JurisdictionAddress = deploymentMetadata.jurisdiction
const TokenAddress = deploymentMetadata.token
const ZEPValidatorABI = deploymentMetadata.ZEPValidatorABI

const Header = ({ networkId, style }) => {
  let networkInterfaceName = 'testRPC'
  if (networkId === 1) {
    networkInterfaceName = 'mainnet'
  } else if (networkId === 3) {
    networkInterfaceName = 'ropsten'
  }
  return (
    <div style={{...style, width: '100%', overflow: 'hidden'}}>
      <div style={{...style, color: 'black', 'backgroundColor': 'white'}}>
        {`TPL ZEP Validator (${networkInterfaceName})`}
      </div>
    </div>
  )
}

const BlockSummary = (({ block, style, isSyncing }) => {
  return (
    <div style={{...style, float: 'left', paddingLeft: '20px', textAlign: 'left'}}>
      <span className={'blockDetails'}>{`Block #${block.number} | ${
        !isSyncing ? (`${
          block.timestamp ?
            moment.unix(block.timestamp).format('MM/DD/YY h:mm:ss a') :
            '...'
        } | ${
          block.transactions ?
            block.transactions.length :
            0
        } transaction${
          block.transactions && block.transactions.length === 1 ?
            '' :
            's'
        }\n`) : 'syncing chain...'
      }`}</span>
    </div>
  )
})

const AddressSummary = (({ accounts, networkId, organizationAddress, style }) => {
  return (
    <div>
      <ul>
        {Object.entries(accounts).map((account) => {
          return (
            <li key={account[0]}>
              <div style={{...style, float: 'left'}}>
                {`${account[0]}:\u00a0`}
              </div>
              <div style={{...style, float: 'left'}}>
                <a
                  href={`https://${
                    networkId === 3 ?
                      'ropsten.' :
                      ''
                  }etherscan.io/address/${account[1].address}`}
                  target='_blank'
                >
                  {`${account[1].address.substring(0, 6)}...${
                    account[1].address.substring(account[1].address.length - 4)
                  }`}
                </a>
              </div>
              <div style={{...style, float: 'left'}}>
                {account[1].balance ?
                  `\u00a0=> ${Math.round(Number((account[1].balance / (10 ** 18)).toFixed(10)) * 10000) / 10000} ether` :
                  ''}
              </div>
              {organizationAddress === account[1].address ?
                <div style={{...style, float: 'left', color: 'red'}}>
                  {'\u00a0(selected)'}
                </div> :
                <div />
              }
              <div style={{...style, clear: 'both'}}/>
            </li>
          )
        })}
      </ul>
    </div>
  )
})

const OrganizationsList = ({ organizations, networkId, style }) => {
  return (
    <div>
      <ul>
        {
          organizations.map((org, index) => {
            return (<div key={index}>
              <li>
                {((typeof org !== 'undefined' && org.address) ?
                  <div>
                    <div style={{...style, float: 'left'}}>
                      <a
                        href={`https://${
                          networkId === 3 ?
                            'ropsten.' :
                            ''
                        }etherscan.io/address/${org.address}`}
                        target="_blank"
                      >
                        {`${org.address.substring(0, 6)}...${
                          org.address.substring(org.address.length - 4)}`}
                      </a>
                    </div>
                    <div style={{...style, float: 'left'}}>
                      {`\u00a0${org.name} (${org.assigned} / ${org.max})`}
                    </div>
                    <div style={{...style, clear: 'both', padding: '0x'}} />
                    <div style={{...style, float: 'left'}}>
                      {org.addresses.map((address, j) => {
                        return (
                          <div key={`${index}-${j}`}>
                            <div>
                              {`\u00a0- ${j < 10 ? '0' : ''}${j}: ${address}`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{...style, clear: 'both', padding: '8x'}} />
                  </div> :
                  <div>
                    {`${index}: no organization`}
                  </div>
                )}
              </li>
            <br />
            </div>
            )
          })
        }
      </ul>
    </div>
  )
}

const EventsList = (({ events }) => {
  const sortedEventsArray = Object.values(
    Object.keys(events).sort().reduce((r, k) => {
      r[k] = events[k]
      return r
    }, {})
  )

  return (
    <div>
      {sortedEventsArray.length > 0 ?
        <ul>
          {
            sortedEventsArray.reverse().map((event, index) => {
              return (
                <li key={index}>
                  {((typeof event !== 'undefined') ?
                    <div>
                      <div style={{whiteSpace: 'pre-line', paddingBottom: '8px'}}>
                        {`#${event.block} | ${event.timestamp} | ${event.type}\n  ${event.message}`}
                      </div>
                    </div> :
                    'no event')
                  }
                </li>
              )
            })
          }
        </ul> :
        <div style={{paddingLeft: '30px', paddingTop: '8px'}}>
          {'Waiting for events...'}
        </div>
      }
    </div>
  )
})

const TransactionPoolList = (({ transactionPool, networkId }) => {
  let transactions = []
  Object.keys(transactionPool).forEach(txHash => {
    let transaction = transactionPool[txHash]
    transaction.transactionHash = txHash
    transactions.push(transaction)
  })

  transactions.sort((a, b) => {
    return a.submitted - b.submitted
  })

  return (
    <div>
      {transactions.length > 0 ?
        <ul>
          {
            transactions.reverse().map((transaction, index) => {
              let transactionStatus = {
                color: 'dodgerBlue',
                message: 'pending'
              }
              if (transaction.failed) {
                transactionStatus = {
                  color: 'red',
                  message: 'failed'
                }
              } else if (transaction.confirmed) {
                transactionStatus = {
                  color: '#0f0',
                  message: 'success'
                }
              }
              return (
                <li key={index}>
                  {((typeof transaction !== 'undefined') ?
                    <div>
                      <div style={{whiteSpace: 'pre-line', paddingBottom: '8px'}}>
                        <span>
                          <a
                            href={`https://${
                              networkId === 3 ?
                                'ropsten.' :
                                ''
                            }etherscan.io/tx/${transaction.transactionHash}`}
                            target='_blank'
                          >
                            {`${transaction.transactionHash.substring(0, 6)}...${
                              transaction.transactionHash.substring(
                                transaction.transactionHash.length - 4
                              )}`}
                          </a>
                        </span>
                        <span>
                          {`: ${transaction.eventType} => `}
                        </span>
                        <span style={{
                          color: transactionStatus.color
                        }}>
                          {transactionStatus.message}
                        </span>
                      </div>
                    </div> :
                    'no transaction'
                  )}
                </li>
              )
            })
          }
        </ul> :
        <div style={{float: 'left', paddingLeft: '20px', paddingTop: '8px'}}>
          {'\u00a0Transaction pool is empty.'}
        </div>
      }
    </div>
  )
})

const ConnectionOptions = (({
  currentChoice, choiceOne, choiceTwo, choiceThree, choiceFour, rpcUrl,
  onChoiceOne, onChoiceTwo, onChoiceThree, onChoiceFour, onChangeRpcUrl, onSelect
}) => {
  return (
    <div>
      <header className='App-header'>
        <h1 className='App-title'>
          <div style={{textAlign: 'center', fontSize: '85%', color: 'black', 'backgroundColor': 'white'}}>

            <span>
              TPL ZEP Validator
            </span>
            <span style={{color: 'black'}}>
              {' - choose your connection method.'}
            </span>
          </div>
        </h1>
      </header>
      <div className={'choices'}>
        <button
          className={'choice-1'}
          style={{color: choiceOne.textColor, background: choiceOne.color}}
          onClick={() => onChoiceOne()}
        >
          {'view only (infura)'}
        </button>
        <button
          className={'choice-2'}
          style={{color: choiceTwo.textColor, background: choiceTwo.color}}
          onClick={() => onChoiceTwo()}
        >
          {'injected (e.g. metamask)'}
        </button>
        <button
          className={'choice-3'}
          style={{color: choiceThree.textColor, background: choiceThree.color}}
          onClick={() => onChoiceThree()}
        >
          {'custom (e.g. geth node)'}
        </button>
        <button
          className={'choice-4'}
          style={{color: choiceFour.textColor, background: choiceFour.color}}
          onClick={() => onChoiceFour()}
        >
          {'ledger & infura node'}
        </button>
      </div>
      <div style={{clear: 'both', padding: '8px'}} />
      {currentChoice === 'custom' ?
        <div style={{margin: '0 auto', width: '333px'}}>
          <input
            placeholder={'rpc url (ideally a websocket)'}
            style={{width: '333px', color: 'white', background: 'black'}}
            value={rpcUrl}
            onChange={onChangeRpcUrl}
          />
          <div style={{clear: 'both', padding: '8px'}} />
        </div> : <div />
      }
      <div style={{margin: '0 auto', width: '33.016px'}}>
        <button
          onClick={() => onSelect()}
        >
          {'enter'}
        </button>
      </div>
    </div>
  )
})


class Main extends Component {
  constructor(props) {
    super(props)
    console.log(`web3 connection type chosen: ${props.connectionType}`)
    if (props.connectionType === 'custom') {
      console.log(`rpc endpoint provided: ${props.rpcUrl}`)
    }

    // set up basic information for interacting with mainnet contracts.
    const networkId = config.networkId

    // use infura as a fallback provider (or additional websocket provider).
    const infura = config.infuraWebsocket // NOTE: this isn't production-ready
    const infuraHttp = config.infuraHttp

    // set up dummy web3 objects that will throw unless they are replaced.
    this.web3 = {
      version: null,
      eth: {
        isSyncing: (() => {
          return Promise.reject('Error: no Web3 provider found.')
        }),
        Contract: ((..._) => {
          return false && _
        })
      }
    }
    this.wsWeb3 = this.web3

    // set up web3 (including a websocket) based on the connection type chosen.
    if (props.connectionType === 'custom') {
      // connect via the provided rpc url, add infura for ws if the url is http
      const provider = props.rpcUrl
      if (provider.startsWith('ws')) {
        console.log(`attempting to connect to websocket provider at ${provider}...`)
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(provider))
        this.wsWeb3 = this.web3
      } else if (provider.startsWith('http')) {
        console.log(`attempting to connect to http provider at ${provider}...`)
        this.web3 = new Web3(new Web3.providers.HttpProvider(provider))
        console.log(`attempting to connect event listener to websocket provider at ${infura}...`)
        this.wsWeb3 = new Web3(new Web3.providers.WebsocketProvider(infura))
      }
    } else if (props.connectionType === 'inject') {
      // set up the injected web3 object in the event that it indeed exists
      if (typeof window.web3 !== 'undefined' &&
          typeof window.web3.currentProvider !== 'undefined') {
        // TODO: how can we support a ledger AND the current provider?
        console.log('found existing web3 provider, initializing...')
        this.web3 = new Web3(window.web3.currentProvider)

        // TODO: can we detect if the current provider is websocket-enabled?
        console.log(`attempting to connect event listener to websocket provider at ${infura}...`)
        this.wsWeb3 = new Web3(new Web3.providers.WebsocketProvider(infura))
      }
    } else if (props.connectionType === 'ledger') {
      // connect to the ledger via u2f, then add infura subprovider & websocket
      console.log('attempting to connect to ledger...')
      const engine = new ProviderEngine()
      const getTransport = () => TransportU2F.create(1000, 2000)
      const ledger = createLedgerSubprovider(getTransport, {
        networkId,
        accountsLength: config.ledgerAccountsLength,
        accountsOffset: config.ledgerAccountsOffset
      })
      engine.addProvider(ledger)

      console.log(`attempting to connect to provider at ${infura}...`)
      let infuraWsProvider = new WebsocketSubprovider({ rpcUrl: infura })
      /* these commands don't work, need to monitor websocket connection health

      infuraWsProvider.on('start', e => console.error('WS start:', e))
      infuraWsProvider.on('error', e => console.error('WS error:', e))
      infuraWsProvider.on('end', e => console.error('WS end:', e))

      */
      engine.addProvider(infuraWsProvider)
      engine.start()
      this.web3 = new Web3(engine)
      this.wsWeb3 = new Web3(new Web3.providers.WebsocketProvider(infura))
    } else {
      // connect to infura, which will not have any attached wallet information
      console.log(`attempting to connect to http provider at ${infuraHttp}...`)
      this.web3 = new Web3(new Web3.providers.HttpProvider(infuraHttp))

      console.log(`attempting to connect event listener to websocket provider at ${infura}...`)
      this.wsWeb3 = new Web3(new Web3.providers.WebsocketProvider(infura))
    }

    // set up contract object using the ABI and the address.
    const ZEPValidatorContract = new this.web3.eth.Contract(
      ZEPValidatorABI,
      ZEPValidatorAddress,
      {
        gas: 150000
      }
    )

    // set up a duplicate contract object via websocket-enabled web3.
    const ZEPValidatorWsContract = new this.wsWeb3.eth.Contract(
      ZEPValidatorABI,
      ZEPValidatorAddress,
      {
        gas: 150000
      }
    )

    // bind functions and initialize state
    this.updateToLatestBlock = this.updateToLatestBlock.bind(this)
    this.setBlockDetails = this.setBlockDetails.bind(this)
    this.getAddresses = this.getAddresses.bind(this)
    this.getBalances = this.getBalances.bind(this)
    this.getAccounts = this.getAccounts.bind(this)
    this.setEvents = this.setEvents.bind(this)
    this.clearTransactionPool = this.clearTransactionPool.bind(this)
    this.getZEPValidatorSummary = this.getZEPValidatorSummary.bind(this)
    this.handleAddressFormChange = this.handleAddressFormChange.bind(this)
    this.issueAttribute = this.issueAttribute.bind(this)

    this.state = {
      networkId: networkId,
      hasWeb3: false,
      loading: true,
      isSyncing: null,
      syncObject: false,
      block: {
        number: null
      },
      addresses: [],
      balances: [],
      accounts: {},
      txpool: {},
      issueAttributeStatus: {
        color: 'white',
        message: 'status: waiting on a valid address'
      },
      events: {},
      updateIntervalId: null,
      ZEPValidatorContract: ZEPValidatorContract,
      ZEPValidatorWsContract: ZEPValidatorWsContract,
      ZEPValidatorAddress: ZEPValidatorAddress,
      JurisdictionAddress: JurisdictionAddress,
      TokenAddress: TokenAddress,
      contractDeployedBlock: 0,
      eventsSet: false,
      foundOrganization: null,
      organizations: [],
      organizationDetails: {},
      organizationAddress: null,
      attributeeAddressForm: '',
      allIssuedAddresses: new Set(),
      organizationNameLookup: {},
      consoleInfoDumped: false
    }
  }

  async componentDidMount() {
    // check if the blockchain is syncing & ensure that web3 is working
    this.web3.eth.isSyncing()
      .then(async syncObject => {
        // get latest block / wallet information & set up polling for updates
        await this.updateToLatestBlock()
        await this.setEvents()
        const intervalId = setInterval(this.updateToLatestBlock, 500)

        this.setState({
          hasWeb3: true,
          isSyncing: (syncObject ? true : false),
          syncObject: syncObject,
          updateIntervalId: intervalId
        })

        return Promise.resolve(true)
      })
      .catch(error => {
        console.error(error)
        this.setState({
          hasWeb3: false,
          loading: false
        })

        return Promise.reject(false)
      })
  }

  async updateToLatestBlock() {
    const blockNumber = await this.web3.eth.getBlockNumber()

    if (blockNumber && (blockNumber > this.state.block.number)) {
      if (!this.state.block.hash) {
        this.setState({
          block: {number: blockNumber}
        })
        await this.getAccounts()
      }

      await this.setBlockDetails(blockNumber)

      await this.getZEPValidatorSummary()

      this.setState({
        loading: false
      })

      return Promise.resolve(true)
    }

    return Promise.resolve(false)
  }

  async setBlockDetails(blockNumber) {
    const block = await this.web3.eth.getBlock(blockNumber)

    if (block) {
      this.setState({
        block: block
      }, () => {
        let details = document.getElementsByClassName('blockDetails')[0]
        if (typeof details !== 'undefined') {
          if (this.state.flashClear && details.classList.contains('flash')) {
            clearTimeout(this.state.flashClear)
            details.classList.remove('flash')
            setTimeout(() => {
              details.classList.add('flash')
            }, 10)
          } else {
            details.classList.add('flash')
          }
          const flashClear = setTimeout(() => {
            details.classList.remove('flash')
          }, 5100)
          this.setState({
            flashClear: flashClear
          })
        }
      })
      return Promise.resolve(true)
    }

    return Promise.reject(false)
  }

  async getAddresses() {
    const addresses = await Promise.resolve(this.web3.eth.getAccounts())
    if (addresses.length === 0) {
      console.error('Error: cannot find any addresses.')
      return Promise.reject(false)
    } else {
      this.setState({
        addresses: addresses
      }, () => {
        return Promise.resolve(true)
      })
    }
  }

  async getBalances() {
    const balances = await Promise.all(this.state.addresses.map(a => {
      return this.web3.eth.getBalance(a)
    }))
    this.setState({
      balances: balances
    }, () => {
      return Promise.resolve(true)
    })
  }

  async getAccounts() {
    await this.getAddresses()
    await this.getBalances()
    let accounts = {}
    this.state.addresses.forEach((a, i) => {
      accounts[i] = {
        address: a,
        balance: this.state.balances[i]
      }
    })
    this.setState({
      accounts: accounts
    }, () => {
      return Promise.resolve(true)
    })
  }

  setEvents() {
    if (!this.state.eventsSet) {
      console.log('getting event histories...')
      this.setState({
        eventsSet: true
      })

      // NOTE: For mainnet, use websockets via infura if web3 is over http

      // NOTE: we may not be interested in collecting ALL of the event histories
      // going back to the block where the contract was deployed, especially if
      // it slows down load times significantly. Consider using something like
      // max(`contractDeployedBlock`, (`latest` - <desiredHistoryLength>)).

      // NOTE: use event indexed fields for filtering based on category?

      // add a listener for OrganizationAdded events
      this.state.ZEPValidatorWsContract.events.OrganizationAdded(
        {},
        {fromBlock: this.state.contractDeployedBlock, toBlock: 'latest'}
      ).on('data', async event => {
        const message = `${
          event.returnValues.organization} -> ${
          event.returnValues.name
        }`
        console.log(message)
        const block = await this.web3.eth.getBlock(event.blockNumber)
        const stamp = block.timestamp + (event.logIndex / 1000)
        let events = this.state.events
        events[stamp] = {
          event: event,
          type: 'OrganizationAdded',
          block: event.blockNumber,
          organization: event.returnValues.organization,
          timestamp: (
            block.timestamp ?
              moment.unix(block.timestamp).format('MM/DD/YY hh:mm:ss a') :
              '...'
          ),
          message: message
        }
        this.setState({
          events: events
        })
      }).on('error', error => {
        console.error(error)
      })

      // add a listener for AttributeIssued events
      this.state.ZEPValidatorWsContract.events.AttributeIssued(
        {},
        {fromBlock: this.state.contractDeployedBlock, toBlock: 'latest'}
      ).on('data', async event => {
        const message = `${
          this.state.organizationNameLookup[event.returnValues.organization]
        } -> ${
          event.returnValues.attributedAddress
        }`
        console.log(message)
        const block = await this.web3.eth.getBlock(event.blockNumber)
        const stamp = block.timestamp + (event.logIndex / 1000)
        let events = this.state.events
        events[stamp] = {
          event: event,
          type: 'AttributeIssued',
          block: event.blockNumber,
          organization: event.returnValues.organization,
          timestamp: (
            block.timestamp ?
              moment.unix(block.timestamp).format('MM/DD/YY hh:mm:ss a') :
              '...'
          ),
          message: message
        }
        this.setState({
          events: events
        })
      }).on('error', error => {
        console.error(error)
      })     
    }

    return Promise.resolve(true)
  }

  clearTransactionPool() {
    this.setState({
      txpool: {}
    })
  }

  async getZEPValidatorSummary() {
    const organizations = await this.state.ZEPValidatorContract.methods.getOrganizations().call()

    const organizationAddress = organizations.find(element => {
      return this.state.addresses.includes(element)
    })

    const foundOrganization = !!organizationAddress

    const organizationDetailsArray = await Promise.all(
      organizations.map(async organizationAddress => {
        const organizationData = await this.state.ZEPValidatorContract.methods.getOrganization(
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

    const organizationDetails = organizationDetailsArray.reduce(
      (map, obj) => {
        map[obj.address] = obj
        return map
      },
      {}
    )

    let allIssuedAddresses = this.state.allIssuedAddresses
    let organizationNameLookup = this.state.organizationNameLookup
    organizationDetailsArray.forEach(o => {
      organizationNameLookup[o.address] = o.name
      o.addresses.forEach(a => {
        allIssuedAddresses.add(a)
      })
    })

    // dump retrieved summary information to the console on the first call
    if (!this.state.consoleInfoDumped) {
      console.log(
        foundOrganization ?
          `organization located: ${organizationAddress}` :
          'could not locate an organization address.'
      )

      if (foundOrganization) {
        console.log(organizationDetails[organizationAddress])
      }

      console.log(
        `Summary of organizations (total of ${organizations.length}):`
      )
      organizationDetailsArray.forEach((o, i) => {
        console.log(`${i+1}) ${o.name}`)
        console.log(`   ${o.address}`)
        console.log(
          `   ${o.assigned} out of ${o.max} addresses assigned an attribute`
        )
        o.addresses.forEach((a, j) => {
          console.log(`     * ${j+1}: ${a}`)
        })
        console.log()
      })
    }

    this.setState({
      organizations: organizations,
      organizationDetails: organizationDetails,
      organizationAddress: organizationAddress,
      foundOrganization: foundOrganization,
      allIssuedAddresses: allIssuedAddresses,
      organizationNameLookup: organizationNameLookup,
      consoleInfoDumped: true
    })

    return (organizationAddress, organizationDetails)
  }

  handleAddressFormChange(event) {
    if (
      event.target.value.length < 43 &&
      event.target.value.match(String.raw`^$|^[x0-9A-Fa-f]+$`)
    ) {
      this.setState({
        attributeeAddressForm: event.target.value
      })
    }
  }

  issueAttribute(attributeeAddress) {
    const org = this.state.organizationDetails[this.state.organizationAddress]

    // don't allow until a valid, checksum-passing address is provided
    if(!this.web3.utils.isAddress(attributeeAddress)) {
      console.error('Error: provided address is not a valid Ethereum address.')
      this.setState({
        issueAttributeStatus: {
          color: 'red',
          message: 'Error: provided address is not a valid Ethereum address.'
        }
      })
    } else if (!this.web3.utils.checkAddressChecksum(attributeeAddress)) {
      console.error('Error: checksum of provided address is invalid.')
      console.error(
        `Did you mean "${this.web3.utils.toChecksumAddress(attributeeAddress)}"?`
      )
      this.setState({
        issueAttributeStatus: {
          color: 'red',
          message: ('Error: checksum of provided address is invalid - ' + 
            `expected "${this.web3.utils.toChecksumAddress(attributeeAddress)}".`)
        }
      })
    // don't allow duplicate addresses, since they already have an attribute
    } else if (this.state.allIssuedAddresses.has(attributeeAddress)) {
      console.error('Error: address already has an attribute issued.')
      this.setState({
        issueAttributeStatus: {
          color: 'red',
          message: 'Error: address already has an attribute issued.'
        }
      })
    // don't allow any addresses over the maximum allowable
    } else if (org.assigned >= org.max) {
      console.error('Error: organization has issued all available attributes.')
      this.setState({
        issueAttributeStatus: {
          color: 'red',
          message: 'Error: organization has issued all available attributes.'
        }
      })
    } else {
      this.setState({
        issueAttributeStatus: {
          color: 'sienna',
          message: 'Sign transaction to continue...'
        }
      })
      this.state.ZEPValidatorContract.methods.issueAttribute(
        attributeeAddress
      ).send({
        from: this.state.organizationAddress
      }).on('transactionHash', hash => {
        console.log('transaction sent. Hash:', hash)
        let txpool = this.state.txpool
        txpool[hash] = {
          eventType: 'AttributeIssued',
          confirmed: false,
          failed: false,
          submitted: moment().valueOf()
        }
        this.setState({
          txpool: txpool,
          issueAttributeStatus: {
            color: 'darkBlue',
            message: 'Pending...'
          }
        })
      }).on('receipt', receipt => {
        console.log('transaction included in block. Receipt:', receipt)
        let txpool = this.state.txpool
        if (receipt.status === '0x0') {
          if (Object.keys(this.state.txpool).includes(receipt.transactionHash) &&
              this.state.txpool[receipt.transactionHash].confirmed === false) {
            txpool[receipt.transactionHash].confirmed = true
            txpool[receipt.transactionHash].failed = true
          }
          this.setState({
            txpool: txpool,
            issueAttributeStatus: {
              color: 'red',
              message: 'Could not issue attribute to the provided address.'
            }
          })
        } else {
          if (Object.keys(this.state.txpool).includes(receipt.transactionHash) &&
              this.state.txpool[receipt.transactionHash].confirmed === false) {
            txpool[receipt.transactionHash].confirmed = true
          }

          this.setState({
            txpool: txpool,
            issueAttributeStatus: {
              color: '#0f0',
              message: 'attribute issued.'
            }
          })
        }
      }).on('confirmation', (confirmationNumber) => {
        console.log('transaction confirmations:', confirmationNumber)
      }).on('error', (error, receipt) => {
        console.error(error, receipt)
        let txpool = this.state.txpool
        let hash = (receipt ? receipt.transactionHash : null)
        if (
          Object.keys(this.state.txpool).includes(hash) &&
          this.state.txpool[hash].confirmed === false
        ) {
          txpool[hash].failed = true
        }
        this.setState({
          txpool: txpool,
          issueAttributeStatus: {
            color: 'red',
            message: 'Could not issue attribute to the provided address.'
          }
        })
      })
    }
  }

  render() {
    if (this.state.loading || !this.state.block) {
      return (
        <div className='App'>
          <div>
            <br />
            <div>
              {'Loading...'}
            </div>
          </div>
        </div>
      )
    }
    const org = this.state.organizationDetails[this.state.organizationAddress]
    return (
      <div className='App'>
        {
          (this.state.hasWeb3 ?
            <div>
              <header className='App-header'>
                <h1 className='App-title'>
                  <Header
                    networkId={this.state.networkId}
                    style={this.style}
                  />
                </h1>
              </header>
              <Row
                style={{
                  ...this.style,
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'grey',
                  borderBottomWidth: '2px'
                }}
              >
                <Col
                  xs={12}
                  sm={12}
                  md={6}
                  lg={6}
                  xl={6}
                  style={{
                    ...this.style,
                    borderRightStyle: 'solid',
                    borderRightColor: 'grey',
                    borderRightWidth: '2px',
                    borderTopStyle: 'solid',
                    borderTopColor: 'grey',
                    borderTopWidth: '2px'
                  }}
                >
                  <br />
                  <div>
                    <BlockSummary
                      block={this.state.block}
                      style={this.style}
                      isSyncing={this.state.isSyncing}
                    />
                    <br />

                    {this.state.foundOrganization ? 
                    <div>
                      <div style={{...this.style, paddingLeft: '20px'}}>
                        <div style={{...this.style, float: 'left'}}>
                          {'Organization address:\u00a0'}
                        </div>
                        <div style={{...this.style, float: 'left', color: 'dodgerBlue'}}>
                          {this.state.organizationAddress}
                        </div>
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />
                        <div style={{...this.style, float: 'left'}}>
                          {'\u00a0'}
                        </div>
                        <div style={{...this.style, float: 'left'}}>
                          {(org && org.name) ?
                            <span style={{color: 'dodgerBlue'}}>
                              {org.name}
                            </span> :
                            <span style={{color: 'red'}}>
                              {'<no organization found>'}
                            </span>
                          }
                        </div>
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />
                        <div style={{...this.style, float: 'left'}}>
                          {`\u00a0${org.assigned} / ${org.max} attibutes issued\u00a0`}
                        </div>
                        <div style={{...this.style, float: 'left'}}>
                          {<span style={{color: 'black'}}>{
                            
                          }</span>}
                        </div>
                        <br />
                      </div>
                      <div style={{...this.style, clear: 'both', padding: '8x'}} />
                      <br />
                      <div style={{...this.style, paddingLeft: '20px', paddingRight: '20px'}}>
                        <div style={{...this.style, float: 'left', backgroundColor: 'white', 'color': 'black'}}>
                          {'Issue an attribute:\u00a0\u00a0'}
                        </div>
                        <input
                          placeholder={'address'}
                          style={{
                            ...this.style,
                            width: '300px',
                            color: 'black'
                          }}
                          value={this.state.attributeeAddressForm}
                          onChange={this.handleAddressFormChange}
                        />
                        <button
                          onClick={() => this.issueAttribute(this.state.attributeeAddressForm)}
                        >
                          {'submit'}
                        </button>
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />                        
                        <div
                          style={{
                            ...this.style,
                            float: 'left',
                            paddingLeft: '20px',
                            paddingRight: '20px',
                            color: 'black',
                            background: this.state.issueAttributeStatus.color
                          }}
                        >
                          {this.state.issueAttributeStatus.message}
                        </div>
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />
                        <br />
                      </div>

                      <div>
                        <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                          {'Transactions:\u00a0\u00a0'}
                        </div>
                        <button
                          onClick={this.clearTransactionPool}
                        >
                          {'clear tx pool'}
                        </button>
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />
                        <TransactionPoolList
                          transactionPool={this.state.txpool}
                          networkId={this.state.networkId}
                        />
                        <div style={{...this.style, clear: 'both', padding: '8x'}} />
                      </div>
                      
                    </div> : <div>
                      <div
                        style={{
                          ...this.style,
                          paddingLeft: '20px',
                          float: 'left',
                          color: 'red',
                          textAlign: 'left'
                        }}
                      >
                        {'No organization found.'}
                      </div>
                    }
                      <div style={{...this.style, clear: 'both', padding: '8x'}} />
                    </div>
                    }
                    {
                      (Object.keys(this.state.accounts).length !== 0) ?
                        <div>
                          <div
                            style={{
                              ...this.style,
                              display: 'block',
                              textAlign: 'left',
                              paddingLeft: '20px',
                              paddingTop: '16px'
                            }}
                          >
                            <div>
                              {'Accounts detected:'}
                            </div>
                          </div>
                          <AddressSummary
                            accounts={this.state.accounts}
                            networkId={this.state.networkId}
                            organizationAddress={this.state.organizationAddress}
                            style={this.style}
                          />
                          <br />
                        </div>
                        :
                        <div />
                    }
                  </div>
                  <br />

                </Col>
                <Col
                  xs={12}
                  sm={12}
                  md={6}
                  lg={6}
                  xl={6}
                  style={{
                    ...this.style,
                    borderTopStyle: 'solid',
                    borderTopColor: 'grey',
                    borderTopWidth: '2px',
                    boxShadow: '-2px 0 0 grey'
                  }}
                >
                  <br />

                  <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                    <div style={{...this.style, float: 'left'}}>
                      {'ZEP Validator contract:\u00a0'}
                    </div>
                    <div style={{...this.style, float: 'left', color: 'darkBlue'}}>
                      {this.state.ZEPValidatorAddress}
                    </div>
                  </div>
                  <br />

                  <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                    <div style={{...this.style, float: 'left'}}>
                      {'Jurisdiction contract:\u00a0'}
                    </div>
                    <div style={{...this.style, float: 'left', color: 'darkBlue'}}>
                      {this.state.JurisdictionAddress}
                    </div>
                  </div>
                  <br />

                  <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                    <div style={{...this.style, float: 'left'}}>
                      {'Token contract:\u00a0'}
                    </div>
                    <div style={{...this.style, float: 'left', color: 'darkBlue'}}>
                      {this.state.TokenAddress}
                    </div>
                  </div>
                  <br />

                  <div style={{...this.style, clear: 'both', padding: '8px'}} />

                  <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                    {'Organizations & Issued Attributes:'}
                  </div>
                  <br />

                  <OrganizationsList
                    organizations={Object.values(this.state.organizationDetails)}
                    networkId={this.state.networkId}
                    style={this.style}
                  />

                  <div style={{...this.style, clear: 'both'}} />
                  <div style={{...this.style, float: 'left', paddingLeft: '20px'}}>
                    {'Events:\u00a0\u00a0'}
                  </div>
                  <div style={{...this.style, clear: 'both', padding: '2x'}} />
                  <div style={{...this.style, textAlign: 'left'}}>
                    <EventsList
                      events={this.state.events !== null ? this.state.events : {}}
                    />
                  </div>
                  <br />

                </Col>
              </Row>
            </div> :
            <div>
              <header className='App-header' style={{...this.style, color: 'white'}}>
                <h1 className='App-title'>
                  Cannot find a Web3 provider! (Try using&nbsp;
                  <a
                    style={{...this.style, color: 'cyan'}}
                    href='https://metamask.io'
                  >
                    MetaMask
                  </a> on desktop or&nbsp;
                  <a
                    style={{...this.style, color: 'cyan'}}
                    href='https://www.cipherbrowser.com'
                  >
                    Cipher Browser
                  </a>
                  &nbsp;on mobile.)
                </h1>
              </header>
            </div>
          )
        }
      </div>
    )
  }
}

export default class App extends Component {
  constructor(props) {
    super(props)

    // set the custom endpoint form value to match a provided flag.
    const customEndpoint = (
      process.env.REACT_APP_WEB3_PROVIDER ?
        process.env.REACT_APP_WEB3_PROVIDER :
        ''
    )

    this.hasSelected = this.hasSelected.bind(this)
    this.chooseOne = this.chooseOne.bind(this)
    this.chooseTwo = this.chooseTwo.bind(this)
    this.chooseThree = this.chooseThree.bind(this)
    this.chooseFour = this.chooseFour.bind(this)
    this.handleRpcUrlFormChange = this.handleRpcUrlFormChange.bind(this)

    this.state = {
      connectionType: customEndpoint === '' ? null : 'custom',
      currentChoice: 'view',
      rpcUrlForm: customEndpoint,
      choiceOne: {
        textColor: 'black',
        color: 'orange'
      },
      choiceTwo: {
        textColor: 'white',
        color: 'black'
      },
      choiceThree: {
        textColor: 'white',
        color: 'black'
      },
      choiceFour: {
        textColor: 'white',
        color: 'black'
      }
    }
  }

  chooseOne() {
    this.setState({
      currentChoice: 'view',
      choiceOne: {
        textColor: 'black',
        color: 'orange'
      },
      choiceTwo: {
        textColor: 'white',
        color: 'black'
      },
      choiceThree: {
        textColor: 'white',
        color: 'black'
      },
      choiceFour: {
        textColor: 'white',
        color: 'black'
      }
    })
  }

  chooseTwo() {
    this.setState({
      currentChoice: 'inject',
      choiceOne: {
        textColor: 'white',
        color: 'black'
      },
      choiceTwo: {
        textColor: 'black',
        color: 'orange'
      },
      choiceThree: {
        textColor: 'white',
        color: 'black'
      },
      choiceFour: {
        textColor: 'white',
        color: 'black'
      }
    })
  }

  chooseThree() {
    this.setState({
      currentChoice: 'custom',
      choiceOne: {
        textColor: 'white',
        color: 'black'
      },
      choiceTwo: {
        textColor: 'white',
        color: 'black'
      },
      choiceThree: {
        textColor: 'black',
        color: 'orange'
      },
      choiceFour: {
        textColor: 'white',
        color: 'black'
      }
    })
  }

  chooseFour() {
    this.setState({
      currentChoice: 'ledger',
      choiceOne: {
        textColor: 'white',
        color: 'black'
      },
      choiceTwo: {
        textColor: 'white',
        color: 'black'
      },
      choiceThree: {
        textColor: 'white',
        color: 'black'
      },
      choiceFour: {
        textColor: 'black',
        color: 'orange'
      }
    })
  }

  handleRpcUrlFormChange(event) {
    this.setState({
      rpcUrlForm: event.target.value
    })
  }

  hasSelected() {
    this.setState({
      connectionType: this.state.currentChoice
    })
  }

  render() {
    if (this.state.connectionType !== null &&
        typeof this.state.connectionType !== 'undefined') {
      return (
        <Main
          connectionType={this.state.connectionType}
          rpcUrl={this.state.rpcUrlForm}
        />
      )
    }
    return (
      <ConnectionOptions
        currentChoice={this.state.currentChoice}
        choiceOne={this.state.choiceOne}
        choiceTwo={this.state.choiceTwo}
        choiceThree={this.state.choiceThree}
        choiceFour={this.state.choiceFour}
        rpcUrl={this.state.rpcUrlForm}
        onChoiceOne={this.chooseOne}
        onChoiceTwo={this.chooseTwo}
        onChoiceThree={this.chooseThree}
        onChoiceFour={this.chooseFour}
        onChangeRpcUrl={this.handleRpcUrlFormChange}
        onSelect={this.hasSelected}
      />
    )
  }
}
