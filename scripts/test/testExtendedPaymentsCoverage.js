// insert default coverage provider
var Web3 = require('web3')
web3Provider = new Web3('ws://localhost:8555')

var testExtendedPayments = require('./testExtendedPayments.js')

testExtendedPayments.test(web3Provider, 'coverage')