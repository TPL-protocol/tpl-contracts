# Transaction Permission Layer PoC


### ***** *TPL-1.0 & ZEP Validator - Release Candidate 1* *****
Proof of concept for contracts implementing a TPL jurisdiction, a ZEP validator contract, and an mock ZEP ERC20 with enforced TPL.


**[PROJECT PAGE](https://tplprotocol.org/)**


**[WHITEPAPER (working draft)](https://tplprotocol.org/pdf/TPL%20-%20Transaction%20Permission%20Layer.pdf)**


**[CURRENT TPL RELEASE CANDIDATE](https://github.com/TPL-protocol/tpl-contracts/tree/1.0-rc2)**


### Usage
First, ensure that [truffle](https://truffleframework.com/docs/truffle/getting-started/installation) and [ganache-cli](https://github.com/trufflesuite/ganache-cli#installation) are installed.


Next, install dependencies and compile contracts:

```sh
$ git clone -b ZEP-validator-rc1 https://github.com/TPL-protocol/tpl-contracts
$ cd tpl-contracts
$ yarn install
$ truffle compile
```


Once contracts are compiled, run tests (there is an additional test suite specific to the ZEP validator):

```sh
$ ganache-cli
$ node scripts/test.js
$ node scripts/testZEPValidator.js
```


Contracts may then be deployed to local testRPC and set up for the ZEP validator to issue attributes using `$ node scripts/deploy.js`.