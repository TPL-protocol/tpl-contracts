// insert default coverage provider
var Web3 = require('web3')
web3Provider = new Web3('ws://localhost:8555')

var testExtra = require('./testExtra.js')

testExtra.test(web3Provider, 'coverage')
