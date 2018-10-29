import React, { Component } from 'react';
import './App.css';
import Web3 from 'web3';

class App extends Component {

  constuctor(props) {

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

    let web3 = new Web3('http://localhost:8545')

    const ABI = [
      {
        "constant": true,
        "inputs": [
          {
            "name": "interfaceId",
            "type": "bytes4"
          }
        ],
        "name": "supportsInterface",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "getApproved",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "transferFrom",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "owner",
            "type": "address"
          },
          {
            "name": "index",
            "type": "uint256"
          }
        ],
        "name": "tokenOfOwnerByIndex",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "name": "value",
            "type": "uint256"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "canSafeTransferFrom",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          },
          {
            "name": "",
            "type": "bytes1"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "index",
            "type": "uint256"
          }
        ],
        "name": "tokenByIndex",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "canTransferFrom",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          },
          {
            "name": "",
            "type": "bytes1"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getRegistry",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "ownerOf",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "canSafeTransferFrom",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          },
          {
            "name": "",
            "type": "bytes1"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "approved",
            "type": "bool"
          }
        ],
        "name": "setApprovalForAll",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "from",
            "type": "address"
          },
          {
            "name": "to",
            "type": "address"
          },
          {
            "name": "tokenId",
            "type": "uint256"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ],
        "name": "safeTransferFrom",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "owner",
            "type": "address"
          },
          {
            "name": "operator",
            "type": "address"
          }
        ],
        "name": "isApprovedForAll",
        "outputs": [
          {
            "name": "",
            "type": "bool"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "getValidAttributeID",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "registry",
            "type": "address"
          },
          {
            "name": "validAttributeTypeID",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "from",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "to",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "approved",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "Approval",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "name": "owner",
            "type": "address"
          },
          {
            "indexed": true,
            "name": "operator",
            "type": "address"
          },
          {
            "indexed": false,
            "name": "approved",
            "type": "bool"
          }
        ],
        "name": "ApprovalForAll",
        "type": "event"
      },
      {
        "constant": false,
        "inputs": [],
        "name": "adopt",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "rescue",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]

    // set up the contract object using the ABI and the address.
    const Contract = new this.web3.eth.Contract(
      ABI,
      '0xe2226284f8f537f579f654F5a5cb0b6fb4f46eBD',
      {
        gas: 5000000
      }
    )

    // bind functions and initialize state
    this.updateToLatestBlock = this.updateToLatestBlock.bind(this)
    this.setBlockDetails = this.setBlockDetails.bind(this)
    this.setAccounts = this.setAccounts.bind(this)
    this.setBalanceState = this.setBalanceState.bind(this)

    this.state = {
      Contract: Contract,
      web3: web3
    }
  }

  async componentDidMount() {
    // check if the blockchain is syncing & ensure that web3 is working
    this.web3 && this.web3.eth.isSyncing()
      .then(syncObject => {
        // get latest block / wallet information & set up polling for updates
        this.updateToLatestBlock()
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

  updateToLatestBlock() {
    return this.web3.eth.getBlockNumber()
      .then(blockNumber => {
        if (blockNumber && (blockNumber > this.state.block.number)) {
          if (!this.state.block.hash) {
            this.setState({
              block: {number: blockNumber}
            })
          }
          return Promise.all([
            this.setAccounts(),
          ]).then(() => {
            this.setState({
              loading: false
            })
          })
        }
      }).catch(error => {
        console.error(error)
      })
  }

  setAccounts() {
    return Promise.resolve(this.web3.eth.getAccounts()
      .then(addresses => {
        return Promise.resolve(this.getToken(addresses))
      }).catch(error => {
        const message = 'Could not get accounts, ensure that wallet is not inaccessible or locked.'
        console.error(message, error)
      }))
  }

  getToken(addresses) {
    this.state.Contract.methods.tokenOfOwnerByIndex(
      addresses[0], 0
    ).call({
      from: addresses[0]
    }).then(result => {
        this.setState({
          token: result
        })
      return result
    }).catch(error => {
      console.error(error)
    })
  }

  createCat = (dna) => {
    let column = []

    for (let i = 0; i < 8; i++) {
      let row = []
      for (let j = 0; j < 8; j++) {
        const color = dna[i+j*8]
        const choice = j + i*8 < 10 ? `0${j + i*8}` : `${j + i*8}`
        const imgUrl = `images/copycat-${color}/${choice}.png`
        row.push(
          <td>
            <div style={{height: "50px"}}>
              <img src={imgUrl} alt="img"/>
            </div>
          </td>
        )
      }
      column.push(<tr>{row}</tr>)
    }
    return column
  }

  render() {
    const exampleDna = this.state && this.state.token ? this.state.token : '0000000000000000000000000000000000000000000000000000000000000000'
    console.log(exampleDna)

    return (
      <div className="App">
        <header className="App-header">
          <table cellspacing={"0"} cellpadding={"0"}>
            {this.createCat(exampleDna)}
          </table>
        </header>
      </div>
    );
  }
}

export default App;
