module.exports = {
  testCommand: 'node --max-old-space-size=4096 ./scripts/testBasicCoverage.js && node --max-old-space-size=4096 ./scripts/testZEPValidatorCoverage.js;',
  copyPackages: ['web3']
}
