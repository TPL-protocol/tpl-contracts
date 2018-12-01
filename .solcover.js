module.exports = {
  testCommand: 'node --max-old-space-size=4096 ./scripts/test/testBasicCoverage.js && node --max-old-space-size=4096 ./scripts/test/testExtendedCoverage.js && node --max-old-space-size=4096 ./scripts/test/testExtendedPaymentsCoverage.js && node --max-old-space-size=4096 ./scripts/test/testBasicOnExtendedCoverage.js && node --max-old-space-size=4096 ./scripts/test/testExtraCoverage.js',
  compileCommand: '../node_modules/.bin/truffle compile',
  copyPackages: ['web3']
}