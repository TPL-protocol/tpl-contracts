// get web3 provider from configuration files
const applicationConfig = require('../../config.js')
const connectionConfig = require('../../truffle.js')
const connection = connectionConfig.networks[applicationConfig.network]
let web3Provider = connection.provider

// import tests
var testExtended = require('./testExtended.js')

// run coverage tests
testExtended.test(web3Provider, 'direct')