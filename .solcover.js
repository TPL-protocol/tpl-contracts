module.exports = {
  testCommand: 'node --max-old-space-size=4096 ./scripts/testBasicCoverage.js && node --max-old-space-size=4096 ./scripts/testExtendedCoverage.js && node --max-old-space-size=4096 ./scripts/testBasicOnExtendedCoverage.js',
  compileCommand: '../node_modules/.bin/truffle compile',
  copyPackages: ['web3']
}