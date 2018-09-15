# Transaction Permission Layer PoC


### ***** *TPL-1.0 Release Candidate 3* *****
Proof of concept for contracts implementing a TPL jurisdiction and an ERC20-enforced TPL.


**[PROJECT PAGE](https://tplprotocol.org/)**


**[WHITEPAPER (working draft)](https://tplprotocol.org/pdf/TPL%20-%20Transaction%20Permission%20Layer.pdf)**


### Usage
First, ensure that [truffle](https://truffleframework.com/docs/truffle/getting-started/installation) and [ganache-cli](https://github.com/trufflesuite/ganache-cli#installation) are installed.


Next, install dependencies and compile contracts:

```sh
$ git clone -b 1.0-rc3 https://github.com/TPL-protocol/tpl-contracts
$ cd tpl-contracts
$ yarn install
$ truffle compile
```


Once contracts are compiled, run tests and collect gas usage metrics:

```sh
$ ganache-cli
$ node scripts/test.js
$ node scripts/gasAnalysis.js
```


Contracts may also be deployed to local testRPC using `$ node scripts/deploy.js`.


### Summary & Key Terms
* An **attribute registry** is any smart contract that implements an [interface](https://github.com/TPL-protocol/tpl-contracts/blob/1.0-rc3/contracts/AttributeRegistry.sol) containing a small set of external methods related to determining the existence of attributes. It enables implementing tokens and other contracts to avoid much of the complexity inherent in attribute validation and assignment by instead retrieving information from a trusted source. Attributes can be considered a lightweight alternative to claims as laid out in [EIP-735](https://github.com/ethereum/EIPs/issues/735).


* The **jurisdiction** is [implemented](https://github.com/TPL-protocol/tpl-contracts/blob/1.0-rc3/contracts/Jurisdiction.sol) as a single contract that stores validated attributes for each participant, where each attribute is a `uint256 => uint256` key-value pair. It implements an `AttributeRegistry` interface along with associated [EIP-165](https://eips.ethereum.org/EIPS/eip-165) support, allowing other contracts to identify and confirm attributes recognized by the jurisdiction. It also implements an additional [interface](https://github.com/TPL-protocol/tpl-contracts/blob/1.0-rc3/contracts/JurisdictionInterface.sol) that provides methods and events that provide further context regarding actions within the jurisdiction.


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


* The **TPLToken** is a standard [OpenZeppelin ERC20 token](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/StandardToken.sol) that enforces attribute checks during every token transfer. For this [implementation](https://github.com/TPL-protocol/tpl-contracts/blob/1.0-rc3/contracts/TPLToken.sol), the token checks the jurisdiction's registry for an attribute used to whitelist valid token recipients. The additional overhead for each transaction in the minimum-case is **4156 gas**, with 1512 used to execute jurisdiction contract logic and 2644 for general "plumbing" (the overhead of checking against an external call to the registry that simply returns `true`). *(NOTE: the attributes defined in the jurisdiction and required by TPLToken have been arbitrarily defined for this PoC, and are not intended to serve as a proposal for the attributes that will be used for validating transactions.)*


### Attribute scope
Issued attributes exist in the scope of the issuing validator - if a validator is removed, all attributes issued by that validator become invalid and must be renewed. Furthermore, an attribute exists in the scope of it's attribute type, and if the attribute type is removed from the jurisdiction the associated attributes will become invalid. Finally, each attribute type that a validator is approved to add has a scope, and if a validator has its approval for issuing attributes of a particular type, all attributes it has issued with the given type will become invalid.


The validator that issued an attribute to a given address can be found by calling `getAttributeValidator`, but most contracts that implement a jurisdiction as the primary registry for performing transaction permission logic should not have to concern themselves with the validators at all - indeed, much of the point of the jurisdiction is to allow for tokens and other interfacing contracts to delegate managing validators and attributes to the jurisdiction altogether.


### Off-chain attribute approvals
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


### Staked attributes & Revocations
When approving attributes for participants to relay off-chain, validators may specify a required stake to be included in `msg.value` of the transaction relaying the signed attribute approval. This required stake must be greater or equal to the `minimunRequiredStake` specified by the jurisdiction in the attribute type, and may easily be set to 0 as long as `minimumRequiredStake` is also set to 0. In that event, participants do not need to include any stake - they won't even need to provide an extra argument with a value of 0, as `msg.value` is included by default in every transaction. 


Should a validator elect to require a staked amount, they or the jurisdiction will receive a transaction rebate, up to the staked value, for removing the attribute in question. This value is calculated by multiplying an estimate of the transaction's gas usage (currently set to `37700`) with `tx.gasPrice`. Any additional stake will be returned to whatever address locked the funds originally - this enables the jurisdiction to receive transaction rebates for removing attributes set by the validator if required. Should the jurisdiction assign multiple validators to an attribute, market forces should cause the staked requirement to move towards equilibrium with expected gas requirements for removing the attribute in question. Validators may also perform risk analysis on participants as part of their attribute approval process and offer signed attribute approvals with a variable required stake that is catered to the reliability of the participant in question.


Care should be taken when determining the estimated gas usage of the attribute revocation, as setting the value too high will incentivize spurious revokations. Additionally, if there is a profit to be made by the revoker, they may elect to set as high a `tx.gasPrice` as possible to improve their profit margin at the expense of wasting any additional staked ether that would otherwise be returned to the staker. The actual gas usage will also depend on the attribute in question, as attributes with more data in contract storage will provide a larger gas rebate at the end of the transaction, and using `gasLeft()` to calculate gas usage will fail to account for this rebate. It is recommended to set this estimate to a conservative value, so as to provide the maximum possible transaction rebate without creating any cases where the rebate will exceed the realized transaction cost.


### Release Candidate 3
Release candidate 3 provides a mechanism for allowing jurisdictions to designate attribute types that reference other jurisdictions (or arbitrary registries). When the jurisdiction adds an attribute type, it may specify an optional external address that will serve as a secondary source for resolving attributes of that type. This addition provides greater flexibility and composablilty, but will sometimes increase the gas cost of failed attribute checks. As a consequence, a maximum of 20,000 gas is forwarded when checking remote attributes. This should allow for up to 4 layers of nested registries.


Attributes may also be assigned by third-party 'operators' by calling `addAttributeFor` and including a target assignment address. The assigning operator pays any required stake and fees, and receives any excess stake back after transaction rebates. Operators may also revoke a (non-restricted) attribute that they assigned.


Attribute types may restrict assignment by operators by setting a new `onlyPersonal` boolean when designating the attribute type, and signed attribute approvals now include an `operator` address as a parameter, which should be set to the `0x0` address when no operator is desired. This prevents griefing attacks where a signature may be used by someone other than the intended submitter.


There is also a new method on the jurisdiction interface for invalidating attribute approvals that have not yet been submitted. An alternative approach is for the validator to rotate their signing key, but the new method is preferable in cases where a targeted approach is required.


### Release Candidate 2
Release candidate 2 enables an optional fee mechanism for both jurisdictions and validators. When the jurisdiction adds an attribute type, it may specify a fee that must be paid (in addition to any staked funds, if appliciable) whenever an attribute of that type is set, whether manually by validators or directly by participants. Additionally, when a validator signs an attribute approval, they may include a fee that must be paid (in addition to any staked funds and the attribute type's jurisdiction fee, if applicable) in order for the participant to successfully add the attribute.


A few methods on the jurisdiction interface have been extended: `addAttributeType` takes an additional `_jurisdictionFee` argument, `addAttribute` takes an additional `_validatorFee` argument, and `canAddAttribute` takes `_fundsRequired` (a placeholder for `msg.value`) and `_validatorFee` arguments. Additionally, `getAttributeInformation` will now include `jurisdictionFee` as a return value. Finally, the interface has four new related event types: `StakeAllocated`, `StakeRefunded`, `FeePaid`, and `TransactionRebatePaid`.


In the event that fees are not currently deemed necessary, the entire mechanism can be avoided by leaving them set to 0 - this also applies to the mechanism of staking funds to pay for transaction rebates. These features can also be phased in gradually by either party without invalidating any existing attributes or disrupting any ongoing permissioned transfers of TPL-compliant tokens.


### Additional features
Some features of this implementation, and others that are not included as part of this implementation, are still under consideration for inclusion in TPL. Some of the most pressing open questions include:
* the degree of support for various Ethereum Improvement Proposals (with a tradeoff cross-compatibility vs over-generalization & complexity),
* enabling batched attribute assignment and removal to facilitate both cost savings by validators and simultaneous assignment of multiple related attributes by participants, and
* the possibility of integrating a native token for consistent internal accounting irregardless of external inputs (though this option is likely unneccessary and needlessly complex).
