# Transaction Permission Layer v1.0 (tpl-contracts)

![banner](images/TPL_01@3x.png)

![GitHub](https://img.shields.io/github/license/tpl-protocol/tpl-contracts.svg)
[![Build Status](https://travis-ci.com/TPL-protocol/tpl-contracts.svg?branch=master)](https://travis-ci.com/TPL-protocol/tpl-contracts)
[![Coverage Status](https://coveralls.io/repos/github/TPL-protocol/tpl-contracts/badge.svg?branch=master)](https://coveralls.io/github/TPL-protocol/tpl-contracts?branch=master)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Contracts implementing a TPL jurisdiction and an ERC20-enforced TPL.

TPL is a method for assigning metadata (or **“attributes”**) to Ethereum addresses. These attributes then form the basis for designing systems that enforce permissions when performing certain transactions. For instance, using TPL, securities tokens can require that attributes be present and have an appropriate value every time a token is sent or received. This allows projects to remain compliant with regulations by **validating every single exchange between participants**, beyond just the initial offering.

At the core of TPL is the [jurisdiction](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/Jurisdiction.sol) — a single smart contract that links attributes to addresses. It implements an [Attribute Registry interface](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/AttributeRegistryInterface.sol), where attributes are registered to addresses as a key-value pair with a single canonical value. [Implementing tokens](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/examples/ERC20Permissioned.sol) then use this interface to request attributes that will inform whether to permit or reject the token transfer. Furthermore, implementers do not need to know any additional information on who set the attribute or how, and can check for the attribute value in a straightforward and efficient manner.

This jurisdiction does not set attributes itself, but rather defines a valid set of attribute types and designates [validators](https://github.com/TPL-protocol/tpl-contracts/blob/audit-fix-2/contracts/ZEPValidator.sol) that are approved to issue specific attribute types. The validators then either add attributes directly, or sign off-chain attribute approvals that can be relayed to the jurisdiction by the attribute holder or a designated third party. Considerable focus is also paid to ensuring that the jurisdiction and validators can revoke attributes, or entire categories of attributes, when necessary.

TPL is designed to be flexible enough for a wide variety of use-cases beyond just securities tokens, and promotes a distributed architecture where information is shared between multiple jurisdictions with their own specialties. It does so by allowing jurisdictions to specify secondary sources for any type of attribute, delegating the query to another jurisdiction or other attribute registry. A [basic jurisdiction](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/BasicJurisdiction.sol) is also available that implements a smaller subset of these features.

**[PROJECT PAGE](https://tplprotocol.org/)**

**[INTRODUCTION (medium post)](https://blog.zeppelin.solutions/tpl-architecture-private-draft-1-a64f168a2f88)**

**[WHITEPAPER (working draft)](https://tplprotocol.org/pdf/TPL%20-%20Transaction%20Permission%20Layer.pdf)**

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Additional Information](#additional-information)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)


## Install
First, ensure that [Node.js](https://nodejs.org/en/download/current/), [Yarn](https://yarnpkg.com/en/docs/install), and [ganache-cli](https://github.com/trufflesuite/ganache-cli#installation) are installed. Next, clone the repository and install dependencies:

```sh
$ git clone https://github.com/TPL-protocol/tpl-contracts
$ cd tpl-contracts
$ yarn install
```

## Usage
To interact with these contracts, start up a testRPC node in a seperate terminal window:
```sh
$ ganache-cli --gasLimit 8000000
```

Then, to run tests:
```sh
$ yarn run coverage
$ yarn test
$ node scripts/gasAnalysis.js
$ ./node_modules/.bin/solhint "contracts/**/*.sol"
```

Contracts may also be deployed locally using `$ node scripts/deploy.js`.

## Additional Information

*NOTE: This section is out-of-date and is included for now for the sake of completeness.*

* An **attribute registry** is any smart contract that implements an [interface](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/AttributeRegistryInterface.sol) containing a small set of external methods related to determining the existence of attributes. It enables implementing tokens and other contracts to avoid much of the complexity inherent in attribute validation and assignment by instead retrieving information from a trusted source. Attributes can be considered a lightweight alternative to claims as laid out in [EIP-735](https://github.com/ethereum/EIPs/issues/735).


* The standard **jurisdiction** is [implemented](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/Jurisdiction.sol) as a single contract that stores validated attributes for each participant, where each attribute is a `uint256 => uint256` key-value pair. It implements an `AttributeRegistry` interface along with associated [EIP-165](https://eips.ethereum.org/EIPS/eip-165) support, allowing other contracts to identify and confirm attributes recognized by the jurisdiction. It also implements additional [basic](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/BasicJurisdictionInterface.sol) and [extended](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/ExtendedJurisdictionInterface.sol) interfaces with methods and events that provide further context regarding actions within the jurisdiction.


* A jurisdiction defines **attribute types**, or permitted attribute groups, with the following fields *(with optional fields set to* `0 | false | 0x | ""`  *depending on the field's type)*:
    * an arbitrary `uint256 attributeID` field, unique to each attribute type within the jurisdiction, for accessing the attribute,
    * an optional `bool isRestricted` field which prevents attributes of the given type from being removed by the participant directly when set,
    * an optional `bool onlyPersonal` field which prevents attributes of the given type from being added by third-party operator,
    * an optional `address secondarySource` field which designates an external attribute registry that will be checked if an attribute has not been assigned locally,
    * an optional `uint256 secondaryId` field which designates the attribute ID to check when calling into the external attribute registry in question,
    * an optional `uint256 minimumRequiredStake` field, which requires that attributes of the given type must lock a minimum amount of ether in the jurisdiction in order to be added,
    * an optional `uint256 jursdictionFee` field to be paid upon assignment of any attribute of the given type, and
    * an optional `string description` field for including additional context on the given attribute type.
    * *__NOTE:__ one additional field not currently included in TPL attribute types but under active consideration is an optional* `bytes extraData` *field to support forward-compatibility.* 


* The jurisdiction also designates **validators** (analogous to Certificate Authorities), which are addresses that can:
    * add or remove attributes of participants in the jurisdiction directly, assuming they have been approved to issue them by the validator,
    * sign off-chain approvals for adding attributes that can then be relayed by prospective attribute holders, and
    * modify their `signingKey`, an address corresponding to a private key used to sign approvals.


* Validators then issue **attributes** to participants, which have the following properties:
    * a `uint256 value` field for attributes that require an associated quantity,
    * a `uint256 stake` amount greater than or equal to the minimum required by the attribute's type that, together with any `jurisdictionFee` (specified by the attribute type) and/or `validatorFee` (specified in the validator's approval signature), must be provided in `msg.value` when submitting a transaction to add the attribute, and
    * a valid or invalid state, contingent on the state of the issuing validator, the attribute type, or the validator's approval to issue attributes of that type.


* The **jurisdiction owner** is an address (such as an a DAO, a [multisig contract](https://github.com/gnosis/MultiSigWallet), or simply a standard externally-owned account) that can:
    * add or remove attribute types to the jurisdiction,
    * add or remove validators to the jurisdiction,
    * add or remove approvals for validators to assign attribute types, and
    * remove attributes from participants as required.


* An example **TPL-enabled ERC20** that uses a standard [OpenZeppelin ERC20 token](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/StandardToken.sol) to enforce attribute checks during every token transfer is also included. For this [implementation](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/token/TPLRestrictedReceiverToken.sol), the token checks the jurisdiction's registry for an attribute used to whitelist valid token recipients. The additional overhead for each transaction in the minimum-case is **4156 gas**, with 1512 used to execute jurisdiction contract logic and 2644 for general "plumbing" (the overhead of checking against an external call to the registry that simply returns `true`). *(NOTE: the attributes defined in the jurisdiction and required by TPLToken have been arbitrarily defined for this PoC, and are not intended to serve as a proposal for the attributes that will be used for validating transactions.)*


#### Attribute scope
Issued attributes exist in the scope of the issuing validator - if a validator is removed, all attributes issued by that validator become invalid and must be renewed. Furthermore, an attribute exists in the scope of it's attribute type, and if the attribute type is removed from the jurisdiction the associated attributes will become invalid. Finally, each attribute type that a validator is approved to add has a scope, and if a validator has its approval for issuing attributes of a particular type, all attributes it has issued with the given type will become invalid.


The validator that issued an attribute to a given address can be found by calling `getAttributeValidator`, but most contracts that implement a jurisdiction as the primary registry for performing transaction permission logic should not have to concern themselves with the validators at all - indeed, much of the point of the jurisdiction is to allow for tokens and other interfacing contracts to delegate managing validators and attributes to the jurisdiction altogether.


#### Off-chain attribute approvals
Validators may issue and revoke attributes themselves on-chain (and, indeed, this may be the preferred method for validators who are in turn smart contracts and wish to implement their own on-chain attribute approval / revokation logic or fee structure), but they have another option at their disposal - they may sign an approval off-chain and let the participant, or an approved operator designated by the approval, submit the transaction. This has a number of beneficial properties:
* Validators do not have to pay transaction fees in order to assign attributes,
* Participants or operators may decide when they want to add the attribute, enhancing privacy and saving on fees when attributes are not ultimately required, and
* Participants or operators can optionally be required to stake some ether when assigning the attribute, which will go toward paying the transaction fee should the validator or jurisdiction owner need to revoke the attribute in the future.
* Furthermore, participants and operators can optionally be required to include additional fees to the jurisdiction owner and/or to the validator, as required in the attribute type or signed attribute approval, respectively.


To sign an attribute approval, a validator may use the following (with appropriate arguments):

```js
var Web3 = require('web3')
var web3 = new Web3('ws://localhost:8545')  // replace with desired web3 provider

function getAttributeApprovalHash(
  jurisdictionAddress,
  assigneeAddress,
  operatorAddress, // set to 0 when assigned personally
  fundsRequired, // stake + jurisdiction fee + validator fee
  validatorFee,
  attributeID,
  attributeValue
) {
  if (operatorAddress === 0) {
    operatorAddress = '0x0000000000000000000000000000000000000000'
  }
  return web3.utils.soliditySha3(
    {t: 'address', v: jurisdictionAddress},
    {t: 'address', v: assigneeAddress},
    {t: 'address', v: operatorAddress},
    {t: 'uint256', v: fundsRequired},
    {t: 'uint256', v: validatorFee},
    {t: 'uint256', v: attributeID},
    {t: 'uint256', v: attributeValue}
  )
}

async function signValidation(
  validatorSigningKey,
  jurisdictionAddress,
  assigneeAddress,
  operatorAddress,
  fundsRequired, // stake + jurisdiction fee + validator fee
  validatorFee,
  attributeID,
  attributeValue
) {
  return web3.eth.sign(
    getAttributeApprovalHash(
      jurisdictionAddress,
      assigneeAddress,
      operatorAddress,
      fundsRequired,
      validatorFee,
      attributeID,
      attributeValue
    ),
    validatorSigningKey
  )
}
```

Under this scheme, handling the management of signing keys in an effective manner takes on critical importance. Validators can specify an address associated with a signing key, which the jurisdiction will enforce via `ecrecover` using OpenZeppelin's [ECRecovery library]() (with direct [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) support also under consideration). Management of keys and revokations can then be handled seperately (potentially via a validator contract, which would not be able to sign approvals due to the lack of an associated private key on contracts) from the actual signing of attribute approvals. If a signing key is then lost or compromised, the validator can modify the key, which will invalidate any unsubmitted attribtue approvals signed using the old key, but any existing attributes issued using the old key will remain valid. Attribute approvals may also be invalidated by the issuing validator or by the jurisdiction owner by passing the result of `getAttributeApprovalHash` and the signature above (in the case of validators - the owner can disregard the signature field) into `invalidateAttributeApproval`.


*__NOTE:__ a requirement not currently included in TPL but under active consideration is the submission of a* `bytes proof` *field when modifying a key - there is a requirement for signing keys to be unique so that they point back to a specific validator, which creates an opportunity for existing validators to set their "signing key" as the address of a contract under consideration for addition as a new validator, blocking the addition of said validator, as the signing key is initially set to the validator's address. Requiring a signature proving that the validator controls the associated private key would prevent this admittedly obscure attack.*


#### Staked attributes & Revocations
When approving attributes for participants to relay off-chain, validators may specify a required stake to be included in `msg.value` of the transaction relaying the signed attribute approval. This required stake must be greater or equal to the `minimunRequiredStake` specified by the jurisdiction in the attribute type, and may easily be set to 0 as long as `minimumRequiredStake` is also set to 0. In that event, participants do not need to include any stake - they won't even need to provide an extra argument with a value of 0, as `msg.value` is included by default in every transaction. 


Should a validator elect to require a staked amount, they or the jurisdiction will receive a transaction rebate, up to the staked value, for removing the attribute in question. This value is calculated by multiplying an estimate of the transaction's gas usage (currently set to `37700`) with `tx.gasPrice`. Any additional stake will be returned to whatever address locked the funds originally - this enables the jurisdiction to receive transaction rebates for removing attributes set by the validator if required. Should the jurisdiction assign multiple validators to an attribute, market forces should cause the staked requirement to move towards equilibrium with expected gas requirements for removing the attribute in question. Validators may also perform risk analysis on participants as part of their attribute approval process and offer signed attribute approvals with a variable required stake that is catered to the reliability of the participant in question.


Care should be taken when determining the estimated gas usage of the attribute revocation, as setting the value too high will incentivize spurious revokations. Additionally, if there is a profit to be made by the revoker, they may elect to set as high a `tx.gasPrice` as possible to improve their profit margin at the expense of wasting any additional staked ether that would otherwise be returned to the staker. The actual gas usage will also depend on the attribute in question, as attributes with more data in contract storage will provide a larger gas rebate at the end of the transaction, and using `gasLeft()` to calculate gas usage will fail to account for this rebate. It is recommended to set this estimate to a conservative value, so as to provide the maximum possible transaction rebate without creating any cases where the rebate will exceed the realized transaction cost.


#### Feature proposals
Some features of this implementation, and others that are not included as part of this implementation, are still under consideration for inclusion in TPL. Some of the most pressing open questions include:
* the degree of support for various Ethereum Improvement Proposals (with a tradeoff cross-compatibility vs over-generalization & complexity),
* enabling batched attribute assignment and removal to facilitate both cost savings by validators and simultaneous assignment of multiple related attributes by participants, and
* the possibility of integrating a native token for consistent internal accounting irregardless of external inputs (though this option is likely unneccessary and needlessly complex).


## Maintainers

[@0age](https://github.com/0age)


## Contribute

PRs accepted.


## License

MIT © 2018 Transaction Permission Layer
