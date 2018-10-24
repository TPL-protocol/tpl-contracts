/*
  WARNING - This is currently failing with out-of-gas errors, even when the gas
  limit is set arbitrarily high!
*/

var fs = require('fs')
const { execSync } = require('child_process')

var deleteFolderRecursive = path => {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach((file,index) => {
      var curPath = path + "/" + file
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath)
      } else { // delete file
        fs.unlinkSync(curPath)
      }
    })
    fs.rmdirSync(path)
  }
}

function runCommand(cmd) {
  try {
    const out = execSync(cmd).toString()
    return [0, out]
  } 
  catch (error) {
    return [error.status, error.message]
  }
}

console.log('running test suite with compiler optimization disabled...')

// stage
let existingBuild = true
fs.rename('./truffle.js', './truffle-optimization-enabled.js', err => {
    if ( err ) console.error(`ERROR: ${err}`)
})

fs.rename('./truffle-optimization-disabled.js', './truffle.js', err => {
    if ( err ) console.error(`ERROR: ${err}`)
})

if (!fs.existsSync('./build/contracts')){
	existingBuild = false
} else {
	fs.rename('./build/contracts', './build/contracts-existing', err => {
	    if ( err ) console.error(`ERROR: ${err}`)
	})
}

// compile and run tests
let command = runCommand('./node_modules/.bin/truffle compile')
let status = command[0]
let message = command[1]

if (status === 0) {
	command = runCommand('node scripts/testBasicDirect.js')
	status = command[0]
	message = command[1]
}

if (status === 0) {
  command = runCommand('node scripts/testExtendedDirect.js')
  status = command[0]
  message = command[1]
}

if (status === 0) {
  command = runCommand('node scripts/testBasicOnExtendedDirect.js')
  status = command[0]
  message = command[1]
}

// clean up and unstage
deleteFolderRecursive('./build/contracts')

if (existingBuild) {
	fs.rename('./build/contracts-existing', './build/contracts', err => {
	    if ( err ) console.error(`ERROR: ${err}`)
	})
}

fs.rename('./truffle.js', './truffle-optimization-disabled.js', err => {
    if ( err ) console.error(`ERROR: ${err}`)
})

fs.rename('./truffle-optimization-enabled.js', './truffle.js', err => {
    if ( err ) console.error(`ERROR: ${err}`)
})

if (status !== 0) {
	console.log('test suite with compiler optimization disabled failed.')
	console.error(message)
	process.exit(status)
}

console.log('test suite with compiler optimization disabled passed.')
process.exit(0)
