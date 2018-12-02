# Transaction Permission Layer v1.0 (tpl-contracts)

![banner](images/TPL_01@3x.png)

![GitHub](https://img.shields.io/github/license/tpl-protocol/tpl-contracts.svg?colorB=brightgreen)
[![Build Status](https://travis-ci.com/TPL-protocol/tpl-contracts.svg?branch=master)](https://travis-ci.com/TPL-protocol/tpl-contracts)
![Coverage Status](https://img.shields.io/coveralls/github/TPL-protocol/tpl-contracts.svg)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-brightgreen.svg)](https://github.com/RichardLitt/standard-readme)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Contracts implementing a TPL jurisdiction and an ERC20-enforced TPL.

TPL is a method for assigning metadata (or **“attributes”**) to Ethereum addresses. These attributes then form the basis for designing systems that enforce permissions when performing certain transactions. For instance, using TPL, securities tokens can require that attributes be present and have an appropriate value every time a token is sent or received. This allows projects to remain compliant with regulations by **validating every single exchange between participants**, beyond just the initial offering.

At the core of TPL is the [jurisdiction](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/ExtendedJurisdiction.sol) — a single smart contract that links attributes to addresses. It implements an [Attribute Registry interface](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/AttributeRegistryInterface.sol), where attributes are registered to addresses as a key-value pair with a single canonical value. [Implementing tokens](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/examples/token/ERC20/TPLERC20PermissionedInterface.sol) then use this interface to request attributes that will inform whether to permit or reject the token transfer. Furthermore, implementers do not need to know any additional information on who set the attribute or how, and can check for the attribute value in a straightforward and efficient manner.

This jurisdiction does not set attributes itself, but rather defines a valid set of attribute types and designates [validators](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/examples/validator/TPLBasicValidatorInterface.sol) that are approved to issue specific attribute types. The validators then either add attributes directly, or sign off-chain attribute approvals that can be relayed to the jurisdiction by the attribute holder or a designated third party. Considerable focus is also paid to ensuring that the jurisdiction and validators can revoke attributes, or entire categories of attributes, when necessary.

TPL is designed to be flexible enough for a wide variety of use-cases beyond just securities tokens, and promotes a distributed architecture where information is shared between multiple jurisdictions with their own specialties. It does so by allowing jurisdictions to specify secondary sources for any type of attribute, delegating the query to another jurisdiction or other attribute registry. A [basic jurisdiction](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/BasicJurisdiction.sol) is also available that implements a smaller subset of these features.

**[PROJECT PAGE](https://tplprotocol.org/)**

**[INTRODUCTION (medium post)](https://blog.zeppelin.solutions/tpl-architecture-private-draft-1-a64f168a2f88)**

**[WHITEPAPER (working draft)](https://tplprotocol.org/pdf/TPL%20-%20Transaction%20Permission%20Layer.pdf)**

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
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

*NOTE: if you have trouble getting the latest version of ganache-cli to work, try running against the following docker image instead:*
```sh
$ docker run -p 8545:8545 trufflesuite/ganache-cli:v6.1.8 -h 0.0.0.0 --gasLimit 8000000
```

Then, to run tests:
```sh
$ yarn linter
$ yarn test
$ yarn coverage
```

A jurisdiction may then be deployed locally using `yarn build` followed by `yarn deploy basic` or `yarn deploy extended`. A mock permissioned token that relies on the deployed jurisdiction can then be deployed using `yarn deploy token` (see [config.js](https://github.com/TPL-protocol/tpl-contracts/blob/master/config.js) for a few token configuration options).

## API
*NOTE: This documentation is still a work in progress. See the relevant contract source code for additional information.*
* [AttributeRegistryInterface](#attributeregistryinterface)
  * [hasAttribute](#function-hasattribute)
  * [getAttributeValue](#function-getattributevalue)
  * [countAttributeTypes](#function-countattributetypes)
  * [getAttributeTypeID](#function-getattributetypeid)
* [BasicJurisdictionInterface](#basicjurisdictioninterface)
  * [getAttributeTypeID](#function-getattributetypeid)
  * [getAttributeValidator](#function-getattributevalidator)
  * [removeValidator](#function-removevalidator)
  * [issueAttribute](#function-issueattribute)
  * [addValidator](#function-addvalidator)
  * [addValidatorApproval](#function-addvalidatorapproval)
  * [removeAttributeType](#function-removeattributetype)
  * [getAttributeTypeIDs](#function-getattributetypeids)
  * [countValidators](#function-countvalidators)
  * [getValidatorDescription](#function-getvalidatordescription)
  * [addAttributeType](#function-addattributetype)
  * [removeValidatorApproval](#function-removevalidatorapproval)
  * [getValidator](#function-getvalidator)
  * [getValidators](#function-getvalidators)
  * [countAttributeTypes](#function-countattributetypes)
  * [canIssueAttributeType](#function-canissueattributetype)
  * [revokeAttribute](#function-revokeattribute)
  * [getAttributeTypeDescription](#function-getattributetypedescription)
  * [AttributeTypeAdded](#event-attributetypeadded)
  * [AttributeTypeRemoved](#event-attributetyperemoved)
  * [ValidatorAdded](#event-validatoradded)
  * [ValidatorRemoved](#event-validatorremoved)
  * [ValidatorApprovalAdded](#event-validatorapprovaladded)
  * [ValidatorApprovalRemoved](#event-validatorapprovalremoved)
  * [AttributeAdded](#event-attributeadded)
  * [AttributeRemoved](#event-attributeremoved)
* [ExtendedJurisdictionInterface](#extendedjurisdictioninterface)
  * [invalidateAttributeApproval](#function-invalidateattributeapproval)
  * [setAttributeTypeOnlyPersonal](#function-setattributetypeonlypersonal)
  * [removeAttribute](#function-removeattribute)
  * [setValidatorSigningKey](#function-setvalidatorsigningkey)
  * [addAttribute](#function-addattribute)
  * [getAttributeTypeInformation](#function-getattributetypeinformation)
  * [addAttributeFor](#function-addattributefor)
  * [getValidatorSigningKey](#function-getvalidatorsigningkey)
  * [canAddAttribute](#function-canaddattribute)
  * [setAttributeTypeJurisdictionFee](#function-setattributetypejurisdictionfee)
  * [canAddAttributeFor](#function-canaddattributefor)
  * [getAttributeApprovalHash](#function-getattributeapprovalhash)
  * [setAttributeTypeMinimumRequiredStake](#function-setattributetypeminimumrequiredstake)
  * [setAttributeTypeSecondarySource](#function-setattributetypesecondarysource)
  * [addRestrictedAttributeType](#function-addrestrictedattributetype)
  * [removeAttributeFor](#function-removeattributefor)
  * [ValidatorSigningKeyModified](#event-validatorsigningkeymodified)
  * [StakeAllocated](#event-stakeallocated)
  * [StakeRefunded](#event-stakerefunded)
  * [FeePaid](#event-feepaid)
  * [TransactionRebatePaid](#event-transactionrebatepaid)
* [TPLBasicValidatorInterface](#tplbasicvalidatorinterface)
  * [getJurisdiction](#function-getjurisdiction)
  * [isValidator](#function-isvalidator)
  * [issueAttribute](#function-issueattribute)
  * [canIssueAttribute](#function-canissueattribute)
  * [canRevokeAttribute](#function-canrevokeattribute)
  * [canIssueAttributeType](#function-canissueattributetype)
  * [revokeAttribute](#function-revokeattribute)
* [TPLExtendedValidatorInterface](#tplextendedvalidatorinterface)
  * [withdraw](#function-withdraw)
  * [setSigningKey](#function-setsigningkey)
  * [invalidateAttributeApproval](#function-invalidateattributeapproval)
  * [canIssueAttribute](#function-canissueattribute)
  * [getSigningKey](#function-getsigningkey)
  * [getAttributeApprovalHash](#function-getattributeapprovalhash)
* [TPLERC20RestrictedReceiverInterface](#tplerc20restrictedreceiverinterface)
  * [getRegistry](#function-getregistry)
  * [canReceive](#function-canreceive)
* [TPLERC20PermissionedInterface](#tplerc20permissionedinterface)
  * [getRegistry](#function-getregistry)
  * [canTransfer](#function-cantransfer)
  * [canTransferFrom](#function-cantransferfrom)
* [TPLERC721RestrictedOwnerInterface](#tplerc721restrictedownerinterface)
  * [getRegistry](#function-getregistry)
  * [canOwn](#function-canown)
* [TPLERC721PermissionedInterface](#tplerc721permissionedinterface)
  * [canSafeTransferFrom](#function-cansafetransferfrom)
  * [canTransferFrom](#function-cantransferfrom)
  * [getRegistry](#function-getregistry)
  * [canSafeTransferFrom](#function-cansafetransferfrom)

### AttributeRegistryInterface
---

#### *function* hasAttribute

AttributeRegistryInterface.hasAttribute(account, attributeTypeID) `view` `4b5f297a`

**Check if an attribute of the type with ID `attributeTypeID` has been assigned to the account at `account` and is still valid.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to check for a valid attribute. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to check for. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* getAttributeValue

AttributeRegistryInterface.getAttributeValue(account, attributeTypeID) `view` `cd6c8343`

**Retrieve the value of the attribute of the type with ID `attributeTypeID` on the account at `account`, assuming it is valid.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to check for the given attribute value. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to check for. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* countAttributeTypes

AttributeRegistryInterface.countAttributeTypes() `view` `d71710e0`

**Count the number of attribute types defined by the registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* getAttributeTypeID

AttributeRegistryInterface.getAttributeTypeID(index) `view` `0e62fde6`

**Get the ID of the attribute type at index `index`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | index | uint256 The index of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

### BasicJurisdictionInterface
---

#### *function* getAttributeTypeID

BasicJurisdictionInterface.getAttributeTypeID(index) `view` `0e62fde6`

**Get the ID of the attribute type at index `index`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | index | uint256 The index of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* getAttributeValidator

BasicJurisdictionInterface.getAttributeValidator(account, attributeTypeID) `view` `17cf31d8`

**Find the validator that issued the attribute of the type with ID `attributeTypeID` on the account at `account` and determine if the validator is still valid.**

> if no attribute of the given attribute type exists on the account, the function will return (address(0), false).

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account that contains the attribute be checked. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | undefined |
| *bool* | isStillValid | undefined |

#### *function* removeValidator

BasicJurisdictionInterface.removeValidator(validator) `nonpayable` `40a141ff`

**Remove the validator at address `validator` from the jurisdiction.**

> Any attributes issued by the validator will become invalid upon their removal. If the validator is reinstated, those attributes will become valid again. Any approvals to issue attributes of a given type will need to be set from scratch in the event a validator is reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator to remove. |


#### *function* issueAttribute

BasicJurisdictionInterface.issueAttribute(account, attributeTypeID, value) `payable` `50135c3a`

**Issue an attribute of the type with ID `attributeTypeID` and a value of `value` to `account` if `message.caller.address()` is approved validator.**

> Existing attributes of the given type on the address must be removed in order to set a new attribute. Be aware that ownership of the account to which the attribute is assigned may still be transferable - restricting assignment to externally-owned accounts may partially alleviate this issue.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute on. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to issue. |
| *uint256* | value | uint256 An optional value for the issued attribute. |


#### *function* addValidator

BasicJurisdictionInterface.addValidator(validator, description) `nonpayable` `63e2a232`

**Add account `validator` as a validator with a description `description` who can be approved to set attributes of specific types.**

> Note that the jurisdiction can add iteslf as a validator if desired.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account to assign as the validator. |
| *string* | description | string A description of the validator. |


#### *function* addValidatorApproval

BasicJurisdictionInterface.addValidatorApproval(validator, attributeTypeID) `nonpayable` `7756588c`

**Approve the validator at address `validator` to issue attributes of the type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator to approve. |
| *uint256* | attributeTypeID | uint256 The ID of the approved attribute type. |


#### *function* removeAttributeType

BasicJurisdictionInterface.removeAttributeType(ID) `nonpayable` `7aedf3e0`

**Remove the attribute type with ID `ID` from the jurisdiction.**

> All issued attributes of the given type will become invalid upon removal, but will become valid again if the attribute is reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The ID of the attribute type to remove. |


#### *function* getAttributeTypeIDs

BasicJurisdictionInterface.getAttributeTypeIDs() `view` `9679c72a`

**Get the IDs of all available attribute types on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256[]* |  | undefined |

#### *function* countValidators

BasicJurisdictionInterface.countValidators() `view` `97f3c806`

**Count the number of validators defined by the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* getValidatorDescription

BasicJurisdictionInterface.getValidatorDescription(validator) `view` `a43569b3`

**Get a description of the validator at account `validator`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | description | undefined |

#### *function* addAttributeType

BasicJurisdictionInterface.addAttributeType(ID, description) `nonpayable` `acb29172`

**Add an attribute type with ID `ID` and description `description` to the jurisdiction.**

> Once an attribute type is added with a given ID, the description of the attribute type cannot be changed, even if the attribute type is removed and added back later.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The ID of the attribute type to add. |
| *string* | description | string A description of the attribute type. |


#### *function* removeValidatorApproval

BasicJurisdictionInterface.removeValidatorApproval(validator, attributeTypeID) `nonpayable` `b340ec81`

**Deny the validator at address `validator` the ability to continue to issue attributes of the type with ID `attributeTypeID`.**

> Any attributes of the specified type issued by the validator in question will become invalid once the approval is removed. If the approval is reinstated, those attributes will become valid again. The approval will also be removed if the approved validator is removed.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator with removed approval. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to unapprove. |


#### *function* getValidator

BasicJurisdictionInterface.getValidator(index) `view` `b5d89627`

**Get the account of the validator at index `index`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | index | uint256 The index of the validator in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* getValidators

BasicJurisdictionInterface.getValidators() `view` `b7ab4db5`

**Get the accounts of all available validators on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address[]* |  | undefined |

#### *function* countAttributeTypes

BasicJurisdictionInterface.countAttributeTypes() `view` `d71710e0`

**Count the number of attribute types defined by the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* canIssueAttributeType

BasicJurisdictionInterface.canIssueAttributeType(validator, attributeTypeID) `view` `f287f8fb`

**Determine if a validator at account `validator` is able to issue attributes of the type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to check. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* revokeAttribute

BasicJurisdictionInterface.revokeAttribute(account, attributeTypeID) `nonpayable` `f9292ffb`

**Revoke the attribute of the type with ID `attributeTypeID` from `account` if `message.caller.address()` is the issuing validator.**

> Validators may still revoke issued attributes even after they have been removed or had their approval to issue the attribute type removed - this enables them to address any objectionable issuances before being reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute on. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to issue. |


#### *function* getAttributeTypeDescription

BasicJurisdictionInterface.getAttributeTypeDescription(attributeTypeID) `view` `feec036f`

**Get a description of the attribute type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to check for. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | description | undefined |
#### *event* AttributeTypeAdded

BasicJurisdictionInterface.AttributeTypeAdded(attributeTypeID, description) `e35410b0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | indexed |
| *string* | description | not indexed |

#### *event* AttributeTypeRemoved

BasicJurisdictionInterface.AttributeTypeRemoved(attributeTypeID) `3302c92b`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | indexed |

#### *event* ValidatorAdded

BasicJurisdictionInterface.ValidatorAdded(validator, description) `1b7d03cc`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | indexed |
| *string* | description | not indexed |

#### *event* ValidatorRemoved

BasicJurisdictionInterface.ValidatorRemoved(validator) `e1434e25`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | indexed |

#### *event* ValidatorApprovalAdded

BasicJurisdictionInterface.ValidatorApprovalAdded(validator, attributeTypeID) `b85fe33f`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *uint256* | attributeTypeID | indexed |

#### *event* ValidatorApprovalRemoved

BasicJurisdictionInterface.ValidatorApprovalRemoved(validator, attributeTypeID) `61556816`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *uint256* | attributeTypeID | indexed |

#### *event* AttributeAdded

BasicJurisdictionInterface.AttributeAdded(validator, attributee, attributeTypeID, attributeValue) `fc11e611`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *address* | attributee | indexed |
| *uint256* | attributeTypeID | not indexed |
| *uint256* | attributeValue | not indexed |

#### *event* AttributeRemoved

BasicJurisdictionInterface.AttributeRemoved(validator, attributee, attributeTypeID) `aa5b822d`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *address* | attributee | indexed |
| *uint256* | attributeTypeID | not indexed |



### ExtendedJurisdictionInterface
---

#### *function* invalidateAttributeApproval

ExtendedJurisdictionInterface.invalidateAttributeApproval(hash, signature) `nonpayable` `0e9065df`

**Invalidate a signed attribute approval before it has been set by supplying the hash of the approval `hash` and the signature `signature`.**

> Attribute approvals can only be removed by issuing validators or the jurisdiction itself.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | bytes32 The hash of the attribute approval. |
| *bytes* | signature | bytes The hash's signature, resolving to the signing key. |


#### *function* setAttributeTypeOnlyPersonal

ExtendedJurisdictionInterface.setAttributeTypeOnlyPersonal(ID, onlyPersonal) `nonpayable` `13cbb970`

**Enable or disable a restriction for a given attribute type ID `ID` that prevents attributes of the given type from being set by operators based on the provided value for `onlyPersonal`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The attribute type ID in question. |
| *bool* | onlyPersonal | bool Whether the address may only be set personally. |


#### *function* removeAttribute

ExtendedJurisdictionInterface.removeAttribute(attributeTypeID) `nonpayable` `18bbfb9c`

**Remove an attribute of the type with ID `attributeTypeID` from account of `msg.sender`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to remove. |


#### *function* setValidatorSigningKey

ExtendedJurisdictionInterface.setValidatorSigningKey(newSigningKey) `nonpayable` `2724a477`

**Set the public address associated with a validator signing key, used to sign off-chain attribute approvals, as `newSigningKey`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newSigningKey | address The address associated with signing key to set. |


#### *function* addAttribute

ExtendedJurisdictionInterface.addAttribute(attributeTypeID, value, validatorFee, signature) `payable` `62e9674f`

**Add an attribute of the type with ID `attributeTypeID`, an attribute value of `value`, and an associated validator fee of `validatorFee` to account of `msg.sender` by passing in a signed attribute approval with signature `signature`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to add. |
| *uint256* | value | uint256 The value for the attribute to add. |
| *uint256* | validatorFee | uint256 The fee to be paid to the issuing validator. |
| *bytes* | signature | bytes The signature from the validator attribute approval. |


#### *function* getAttributeTypeInformation

ExtendedJurisdictionInterface.getAttributeTypeInformation(attributeTypeID) `view` `6b600462`

**Get comprehensive information on an attribute type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The attribute type ID in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | description | undefined |
| *bool* | isRestricted | undefined |
| *bool* | isOnlyPersonal | undefined |
| *address* | secondarySource | undefined |
| *uint256* | secondaryId | undefined |
| *uint256* | minimumRequiredStake | undefined |
| *uint256* | jurisdictionFee | undefined |

#### *function* addAttributeFor

ExtendedJurisdictionInterface.addAttributeFor(account, attributeTypeID, value, validatorFee, signature) `payable` `81050c65`

**Add an attribute of the type with ID `attributeTypeID`, an attribute value of `value`, and an associated validator fee of `validatorFee` to account `account` by passing in a signed attribute approval with signature `signature`.**

> Restricted attribute types can only be removed by issuing validators or the jurisdiction itself.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to add the attribute to. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to add. |
| *uint256* | value | uint256 The value for the attribute to add. |
| *uint256* | validatorFee | uint256 The fee to be paid to the issuing validator. |
| *bytes* | signature | bytes The signature from the validator attribute approval. |


#### *function* getValidatorSigningKey

ExtendedJurisdictionInterface.getValidatorSigningKey(validator) `view` `9302091f`

**Get a validator's signing key.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | signingKey | undefined |

#### *function* canAddAttribute

ExtendedJurisdictionInterface.canAddAttribute(attributeTypeID, value, fundsRequired, validatorFee, signature) `view` `952600ac`

**Check if a given signed attribute approval is currently valid when submitted directly by `msg.sender`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |
| *uint256* | value | uint256 The value of the attribute in the approval. |
| *uint256* | fundsRequired | uint256 The amount to be included with the approval. |
| *uint256* | validatorFee | uint256 The required fee to be paid to the validator. |
| *bytes* | signature | bytes The attribute approval signature, based on a hash of the other parameters and the submitting account. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* setAttributeTypeJurisdictionFee

ExtendedJurisdictionInterface.setAttributeTypeJurisdictionFee(ID, fee) `nonpayable` `aee338ee`

**Set a required fee for a given attribute type ID `ID` and an amount of `fee`, to be paid to the owner of the jurisdiction upon assignment of attributes of the given type.**

> To remove a fee requirement from an attribute type, the fee amount should be set to 0.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The attribute type ID to set the required fee for. |
| *uint256* | fee | uint256 The required fee amount to be paid upon assignment. |


#### *function* canAddAttributeFor

ExtendedJurisdictionInterface.canAddAttributeFor(account, attributeTypeID, value, fundsRequired, validatorFee, signature) `view` `b09b37d8`

**Check if a given signed attribute approval is currently valid for a given account when submitted by the operator at `msg.sender`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account specified by the attribute approval. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |
| *uint256* | value | uint256 The value of the attribute in the approval. |
| *uint256* | fundsRequired | uint256 The amount to be included with the approval. |
| *uint256* | validatorFee | uint256 The required fee to be paid to the validator. |
| *bytes* | signature | bytes The attribute approval signature, based on a hash of the other parameters and the submitting account. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* getAttributeApprovalHash

ExtendedJurisdictionInterface.getAttributeApprovalHash(account, operator, attributeTypeID, value, fundsRequired, validatorFee) `view` `d99f2c97`

**Get the hash of a given attribute approval.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account specified by the attribute approval. |
| *address* | operator | address An optional account permitted to submit approval. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |
| *uint256* | value | uint256 The value of the attribute in the approval. |
| *uint256* | fundsRequired | uint256 The amount to be included with the approval. |
| *uint256* | validatorFee | uint256 The required fee to be paid to the validator. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |

#### *function* setAttributeTypeMinimumRequiredStake

ExtendedJurisdictionInterface.setAttributeTypeMinimumRequiredStake(ID, minimumRequiredStake) `nonpayable` `e4bbca9f`

**Set a minimum required stake for a given attribute type ID `ID` and an amount of `stake`, to be locked in the jurisdiction upon assignment of attributes of the given type. The stake will be applied toward a transaction rebate in the event the attribute is revoked, with the remainder returned to the staker.**

> To remove a stake requirement from an attribute type, the stake amount should be set to 0.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The attribute type ID to set a minimum required stake for. |
| *uint256* | minimumRequiredStake | uint256 The minimum required funds to lock up. |


#### *function* setAttributeTypeSecondarySource

ExtendedJurisdictionInterface.setAttributeTypeSecondarySource(ID, attributeRegistry, sourceAttributeTypeID) `nonpayable` `e5541be7`

**Set a secondary source for a given attribute type ID `ID`, with an address `registry` of the secondary source in question and a given `sourceAttributeTypeID` for attribute type ID to check on the secondary source. The secondary source will only be checked for the given attribute in cases where no attribute of the given attribute type ID is assigned locally.**

> To remove a secondary source on an attribute type, the registry address should be set to the null address.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The attribute type ID to set the secondary source for. |
| *address* | attributeRegistry | address The secondary attribute registry account. |
| *uint256* | sourceAttributeTypeID | uint256 The attribute type ID on the secondary source to check. |


#### *function* addRestrictedAttributeType

ExtendedJurisdictionInterface.addRestrictedAttributeType(ID, description) `nonpayable` `eb3b274c`

**Add a restricted attribute type with ID `ID` and description `description` to the jurisdiction. Restricted attribute types can only be removed by the issuing validator or the jurisdiction.**

> Once an attribute type is added with a given ID, the description or the restricted status of the attribute type cannot be changed, even if the attribute type is removed and added back later.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The ID of the restricted attribute type to add. |
| *string* | description | string A description of the restricted attribute type. |


#### *function* removeAttributeFor

ExtendedJurisdictionInterface.removeAttributeFor(account, attributeTypeID) `nonpayable` `fdf9101c`

**Remove an attribute of the type with ID `attributeTypeID` from account of `account`.**

> Restricted attribute types can only be removed by issuing validators or the jurisdiction itself.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to remove the attribute from. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to remove. |

#### *event* ValidatorSigningKeyModified

ExtendedJurisdictionInterface.ValidatorSigningKeyModified(validator, newSigningKey) `a0d7a9c0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | indexed |
| *address* | newSigningKey | not indexed |

#### *event* StakeAllocated

ExtendedJurisdictionInterface.StakeAllocated(staker, attribute, amount) `299c1112`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | staker | indexed |
| *uint256* | attribute | indexed |
| *uint256* | amount | not indexed |

#### *event* StakeRefunded

ExtendedJurisdictionInterface.StakeRefunded(staker, attribute, amount) `cb777cb6`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | staker | indexed |
| *uint256* | attribute | indexed |
| *uint256* | amount | not indexed |

#### *event* FeePaid

ExtendedJurisdictionInterface.FeePaid(recipient, payee, attribute, amount) `6096acf1`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | recipient | indexed |
| *address* | payee | indexed |
| *uint256* | attribute | indexed |
| *uint256* | amount | not indexed |

#### *event* TransactionRebatePaid

ExtendedJurisdictionInterface.TransactionRebatePaid(submitter, payee, attribute, amount) `016befcd`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | submitter | indexed |
| *address* | payee | indexed |
| *uint256* | attribute | indexed |
| *uint256* | amount | not indexed |



### TPLBasicValidatorInterface
---

#### *function* getJurisdiction

TPLBasicValidatorInterface.getJurisdiction() `view` `1fa1087c`

**Get account of utilized jurisdiction and associated attribute registry managed by the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* isValidator

TPLBasicValidatorInterface.isValidator() `view` `330e9e3d`

**Check if contract is assigned as a validator on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* issueAttribute

TPLBasicValidatorInterface.issueAttribute(account, attributeTypeID) `payable` `89972e42`

**Issue an attribute of the type with ID `attributeTypeID` to account `account` on the jurisdiction.**

> Note that the function is payable - this is so that the function in question can support both basic and extended jurisdictions. Attaching a value when utilizing a basic jurisdiction will revert the transaction.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute to. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |


#### *function* canIssueAttribute

TPLBasicValidatorInterface.canIssueAttribute(account, attributeTypeID) `view` `99342c7c`

**Check if the validator is approved to issue an attribute of the type with ID `attributeTypeID` to account `account` on the jurisdiction.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to check for issuing the attribute to. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* canRevokeAttribute

TPLBasicValidatorInterface.canRevokeAttribute(account, attributeTypeID) `view` `a20673f4`

**Check if the validator is approved to revoke an attribute of the type with ID `attributeTypeID` from account `account` on the jurisdiction.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The checked account for revoking the attribute from. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* canIssueAttributeType

TPLBasicValidatorInterface.canIssueAttributeType(attributeTypeID) `view` `b61ef753`

**Check if the validator is approved to issue attributes of the type with ID `attributeTypeID` on the jurisdiction.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* revokeAttribute

TPLBasicValidatorInterface.revokeAttribute(account, attributeTypeID) `nonpayable` `f9292ffb`

**Revoke an attribute of the type with ID `attributeTypeID` from account `account` on the jurisdiction.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to revoke the attribute from. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question.



### TPLExtendedValidatorInterface
---


#### *function* withdraw

TPLExtendedValidatorInterface.withdraw(to, value) `nonpayable` `040cf020`

**Withdraw funds paid into the validator of amount `value` to the account at `to`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | to | address The address to withdraw to. |
| *uint256* | value | uint256 The amount to withdraw. |


#### *function* setSigningKey

TPLExtendedValidatorInterface.setSigningKey(newSigningKey) `nonpayable` `0ab4423e`

**Set a signing key on the jurisdiction with an associated public key at address `newSigningKey`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newSigningKey | address The signing key to set. |


#### *function* invalidateAttributeApproval

TPLExtendedValidatorInterface.invalidateAttributeApproval(hash, signature) `nonpayable` `0e9065df`

**Invalidate a signed attribute approval before it has been set by supplying the hash of the approval `hash` and the signature `signature`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | bytes32 The hash of the attribute approval. |
| *bytes* | signature | bytes The hash's signature, resolving to the signing key. |


#### *function* canIssueAttribute

TPLExtendedValidatorInterface.canIssueAttribute(account, attributeTypeID, value) `view` `0f748814`

**Check if the validator is approved to issue an attribute of the type with ID `attributeTypeID` to account `account` on the jurisdiction when `msg.value` is set to `value`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute to. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |
| *uint256* | value | uint256 The amount of ether included in the transaction. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* getSigningKey

TPLExtendedValidatorInterface.getSigningKey() `view` `8faf7747`

**Get the validator's signing key on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* getAttributeApprovalHash

TPLExtendedValidatorInterface.getAttributeApprovalHash(account, operator, attributeTypeID, value, fundsRequired, validatorFee) `view` `d99f2c97`

**Get the hash of a given attribute approval from the jurisdiction.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account specified by the attribute approval. |
| *address* | operator | address An optional account permitted to submit approval. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type in question. |
| *uint256* | value | uint256 The value of the attribute in the approval. |
| *uint256* | fundsRequired | uint256 The amount to be included with the approval. |
| *uint256* | validatorFee | uint256 The required fee to be paid to the validator. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | hash | undefined |



### TPLERC20RestrictedReceiverInterface
---


#### *function* getRegistry

TPLERC20RestrictedReceiverInterface.getRegistry() `view` `5ab1bd53`

**Get the account of the utilized attribute registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* canReceive

TPLERC20RestrictedReceiverInterface.canReceive(receiver) `view` `90d370ba`

**Check if an account is approved to receive token transfers at account `receiver`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address The account of the recipient. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |



### TPLERC20PermissionedInterface
---


#### *function* getRegistry

TPLERC20PermissionedInterface.getRegistry() `view` `5ab1bd53`

**Get the account of the utilized attribute registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* canTransfer

TPLERC20PermissionedInterface.canTransfer(to, value) `nonpayable` `d45e09c1`

**Check if an account is approved to transfer tokens to account `to` of an amount `value`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | address The account of the recipient. |
| *uint256* | value | uint256 The amount to transfer. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* canTransferFrom

TPLERC20PermissionedInterface.canTransferFrom(from, to, value) `nonpayable` `f37d11cc`

**Check if an account is approved to transfer tokens on behalf of account `from` to account `to` of an amount `value`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | address The account holding the tokens to be sent. |
| *address* | to | address The account of the recipient. |
| *uint256* | value | uint256 The amount to transfer. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |



### TPLERC721RestrictedOwnerInterface
---


#### *function* getRegistry

TPLERC721RestrictedOwnerInterface.getRegistry() `view` `5ab1bd53`

**Get the account of the utilized attribute registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* canOwn

TPLERC721RestrictedOwnerInterface.canOwn(account) `view` `a4886b69`

**Check if an account `account` is approved to own NFTs.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |



### TPLERC721PermissionedInterface
---

#### *function* canSafeTransferFrom

TPLERC721PermissionedInterface.canSafeTransferFrom(from, to, tokenId, value, data) `view` `3571ffa3`

**Check if a transfer of the NFT with ID `tokenId` on behalf of account `from` to a recipient at account `to` with `msg.value` of `value` and data `data` is approved. The check must fail if the recipient of the transfer does not correctly implement `onERC721Received`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | address The current owner of the NFT. |
| *address* | to | address The new owner. |
| *uint256* | tokenId | uint256 The NFT to transfer. |
| *uint256* | value | uint256 The amount of ether to include with the transaction.    |
| *bytes* | data | bytes Additional data with no specified format to be included. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* canTransferFrom

TPLERC721PermissionedInterface.canTransferFrom(from, to, tokenId, value) `view` `55e9a76e`

**Check if a transfer of the NFT with ID `tokenId` on behalf of account `from` to a recipient at account `to` with `msg.value` of `value` is approved. THE CALLER IS RESPONSIBLE TO CONFIRM THAT `to` IS CAPABLE OF RECEIVING NFTS OR ELSE THEY MAY BE PERMANENTLY LOST.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | address The current owner of the NFT. |
| *address* | to | address The new owner. |
| *uint256* | tokenId | uint256 The NFT to transfer. |
| *uint256* | value | uint256 The amount of ether to include with the transaction.    |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |

#### *function* getRegistry

TPLERC721PermissionedInterface.getRegistry() `view` `5ab1bd53`

**Get the account of the utilized attribute registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* canSafeTransferFrom

TPLERC721PermissionedInterface.canSafeTransferFrom(from, to, tokenId, value) `view` `97f0f17a`

**Check if a transfer of the NFT with ID `tokenId` on behalf of account `from` to a recipient at account `to` with `msg.value` of `value` is approved. The check must fail if the recipient of the transfer does not correctly implement `onERC721Received`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | address The current owner of the NFT. |
| *address* | to | address The new owner. |
| *uint256* | tokenId | uint256 The NFT to transfer. |
| *uint256* | value | uint256 The amount of ether to include with the transaction.    |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |
| *bytes1* |  | undefined |


## Additional Information

*NOTE: This section is out-of-date and is included for now for the sake of completeness.*

* An **attribute registry** is any smart contract that implements an [interface](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/AttributeRegistryInterface.sol) containing a small set of external methods related to determining the existence of attributes. It enables implementing tokens and other contracts to avoid much of the complexity inherent in attribute validation and assignment by instead retrieving information from a trusted source. Attributes can be considered a lightweight alternative to claims as laid out in [EIP-735](https://github.com/ethereum/EIPs/issues/735).


* The standard **jurisdiction** is [implemented](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/ExtendedJurisdiction.sol) as a single contract that stores validated attributes for each participant, where each attribute is a `uint256 => uint256` key-value pair. It implements an `AttributeRegistry` interface along with associated [EIP-165](https://eips.ethereum.org/EIPS/eip-165) support, allowing other contracts to identify and confirm attributes recognized by the jurisdiction. It also implements additional [basic](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/BasicJurisdictionInterface.sol) and [extended](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/ExtendedJurisdictionInterface.sol) interfaces with methods and events that provide further context regarding actions within the jurisdiction.


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


* An example **TPL-enabled ERC20** that uses a standard [OpenZeppelin ERC20 token](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/ERC20.sol) to enforce attribute checks during every token transfer is also included. For this [implementation](https://github.com/TPL-protocol/tpl-contracts/blob/master/contracts/examples/token/ERC20/TPLERC20RestrictedReceiver.sol), the token checks the jurisdiction's registry for an attribute used to whitelist valid token recipients. The additional overhead for each transaction in the minimum-case is **4156 gas**, with 1512 used to execute jurisdiction contract logic and 2644 for general "plumbing" (the overhead of checking against an external call to the registry that simply returns `true`). *(NOTE: the attributes defined in the jurisdiction and required by TPLToken have been arbitrarily defined for this PoC, and are not intended to serve as a proposal for the attributes that will be used for validating transactions.)*


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
