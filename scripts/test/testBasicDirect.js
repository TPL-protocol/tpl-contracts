// get web3 provider from configuration files
const applicationConfig = require('../../config.js')
const connectionConfig = require('../../truffle.js')
const connection = connectionConfig.networks[applicationConfig.network]
let web3Provider = connection.provider

// import tests
var testBasic = require('./testBasic.js')

// run coverage tests
testBasic.test(web3Provider, 'direct')
