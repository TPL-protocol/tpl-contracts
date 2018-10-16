# transaction-permission-layer-tpl

![banner](images/TPL_01@3x.png)

![GitHub](https://img.shields.io/github/license/tpl-protocol/tpl-contracts.svg)
[![Build Status](https://travis-ci.com/TPL-protocol/tpl-contracts.svg?branch=audit-fix)](https://travis-ci.com/TPL-protocol/tpl-contracts)
[![Coverage Status](https://coveralls.io/repos/github/TPL-protocol/tpl-contracts/badge.svg?branch=audit-fix)](https://coveralls.io/github/TPL-protocol/tpl-contracts?branch=audit-fix)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg)](https://github.com/RichardLitt/standard-readme)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> Contracts implementing a TPL jurisdiction and an ERC20-enforced TPL.

TPL is a method for assigning metadata (or **“attributes”**) to Ethereum addresses. These attributes then form the basis for designing systems that enforce permissions when performing certain transactions. For instance, using TPL, securities tokens can require that attributes be present and have an appropriate value every time a token is sent or received. This allows projects to remain compliant with regulations by **validating every single exchange between participants**, beyond just the initial offering.

At the core of TPL is the [jurisdiction](https://github.com/TPL-protocol/tpl-contracts/blob/audit-fix/contracts/BasicJurisdiction.sol) — a single smart contract that links attributes to addresses. It implements an [Attribute Registry interface](https://github.com/TPL-protocol/tpl-contracts/blob/audit-fix/contracts/AttributeRegistryInterface.sol), where attributes are registered to addresses as a key-value pair with a single canonical value. [Implementing tokens](https://github.com/TPL-protocol/tpl-contracts/blob/audit-fix/contracts/examples/ERC20Permissioned.sol) then use this interface to request attributes that will inform whether to permit or reject the token transfer. Furthermore, implementers do not need to know any additional information on who set the attribute or how, and can check for the attribute value in a straightforward and efficient manner.

This jurisdiction does not set attributes itself, but rather defines a valid set of attribute types and designates [validators](https://github.com/TPL-protocol/tpl-contracts/blob/audit-fix/contracts/ZEPValidator.sol) that are approved to issue specific attribute types. The validators then either add attributes directly, or sign off-chain attribute approvals that can be relayed to the jurisdiction by the attribute holder or a designated third party. Considerable focus is also paid to ensuring that the jurisdiction and validators can revoke attributes, or entire categories of attributes, when necessary.

TPL is designed to be flexible enough for a wide variety of use-cases beyond just securities tokens, and promotes a distributed architecture where information is shared between multiple jurisdictions with their own specialties. It does so by allowing jurisdictions to specify secondary sources for any type of attribute, delegating the query to another jurisdiction or other attribute registry. A basic jurisdiction is also available that implements a smaller subset of these features.


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
$ git clone -b audit-fix https://github.com/TPL-protocol/tpl-contracts
$ cd tpl-contracts
$ yarn install
```

## Usage
To interact with these contracts, start up a testRPC node in a seperate terminal window:
```sh
$ ganache-cli
```

Then, to run tests:
```sh
$ yarn run coverage
$ yarn test
```


## API
*NOTE: This documentation is not yet complete. See the relevant contract source code for additional information on available methods.*
* [AttributeRegistryInterface](#attributeregistryinterface)
  * [hasAttribute](#function-hasattribute)
  * [getAttributeValue](#function-getattributevalue)
  * [countAttributeTypes](#function-countattributetypes)
  * [getAttributeTypeID](#function-getattributetypeid)
* [BasicJurisdiction](#basicjurisdiction)
  * [getAttributeTypeID](#function-getattributetypeid)
  * [getAttributeValidator](#function-getattributevalidator)
  * [getValidatorInformation](#function-getvalidatorinformation)
  * [removeValidator](#function-removevalidator)
  * [issueAttribute](#function-issueattribute)
  * [addValidator](#function-addvalidator)
  * [getAttributeTypeInformation](#function-getattributetypeinformation)
  * [addValidatorApproval](#function-addvalidatorapproval)
  * [removeAttributeType](#function-removeattributetype)
  * [getAttributeTypeIDs](#function-getattributetypeids)
  * [countValidators](#function-countvalidators)
  * [addAttributeType](#function-addattributetype)
  * [removeValidatorApproval](#function-removevalidatorapproval)
  * [getValidator](#function-getvalidator)
  * [getValidators](#function-getvalidators)
  * [countAttributeTypes](#function-countattributetypes)
  * [canIssueAttributeType](#function-canissueattributetype)
  * [revokeAttribute](#function-revokeattribute)
  * [AttributeTypeAdded](#event-attributetypeadded)
  * [AttributeTypeRemoved](#event-attributetyperemoved)
  * [ValidatorAdded](#event-validatoradded)
  * [ValidatorRemoved](#event-validatorremoved)
  * [ValidatorApprovalAdded](#event-validatorapprovaladded)
  * [ValidatorApprovalRemoved](#event-validatorapprovalremoved)
  * [AttributeAdded](#event-attributeadded)
  * [AttributeRemoved](#event-attributeremoved)
* [ZEPValidator](#zepvalidator)
  * [getJurisdiction](#function-getjurisdiction)
  * [unpauseIssuance](#function-unpauseissuance)
  * [addOrganization](#function-addorganization)
  * [countOrganizations](#function-countorganizations)
  * [getOrganization](#function-getorganization)
  * [issuanceIsPaused](#function-issuanceispaused)
  * [getOrganizationInformation](#function-getorganizationinformation)
  * [getOrganizations](#function-getorganizations)
  * [getValidAttributeTypeID](#function-getvalidattributetypeid)
  * [setMaximumIssuableAttributes](#function-setmaximumissuableattributes)
  * [issueAttribute](#function-issueattribute)
  * [initialize](#function-initialize)
  * [revokeAttribute](#function-revokeattribute)
  * [pauseIssuance](#function-pauseissuance)
  * [OrganizationAdded](#event-organizationadded)
  * [AttributeIssued](#event-attributeissued)
  * [AttributeRevoked](#event-attributerevoked)
  * [IssuancePaused](#event-issuancepaused)
  * [IssuanceUnpaused](#event-issuanceunpaused)
* [TPLTokenInterface](#tpltokeninterface)
  * [getRegistry](#function-getregistry)
  * [canTransfer](#function-cantransfer)
  * [canTransferFrom](#function-cantransferfrom)
 

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

### BasicJurisdiction
---

#### *function* getAttributeTypeID

BasicJurisdiction.getAttributeTypeID(index) `view` `0e62fde6`

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

BasicJurisdiction.getAttributeValidator(account, attributeTypeID) `view` `17cf31d8`

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

#### *function* getValidatorInformation

BasicJurisdiction.getValidatorInformation(validator) `view` `35b8ef26`

**Get a description of the validator at account `validator`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | description | undefined |

#### *function* removeValidator

BasicJurisdiction.removeValidator(validator) `nonpayable` `40a141ff`

**Remove the validator at address `validator` from the jurisdiction.**

> Any attributes issued by the validator will become invalid upon their removal. If the validator is reinstated, those attributes will become valid again. Any approvals to issue attributes of a given type will need to be set from scratch in the event a validator is reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator to remove. |


#### *function* issueAttribute

BasicJurisdiction.issueAttribute(account, attributeTypeID, value) `payable` `50135c3a`

**Issue an attribute of the type with ID `attributeTypeID` and a value of `value` to `account` if `message.caller.address()` is approved validator.**

> Existing attributes of the given type on the address must be removed in order to set a new attribute. Be aware that ownership of the account to which the attribute is assigned may still be transferable - restricting assignment to externally-owned accounts may partially alleviate this issue.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute on. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to issue. |
| *uint256* | value | uint256 An optional value for the issued attribute. |


#### *function* addValidator

BasicJurisdiction.addValidator(validator, description) `nonpayable` `63e2a232`

**Add account `validator` as a validator with a description `description` who can be approved to set attributes of specific types.**

> Note that the jurisdiction can add iteslf as a validator if desired.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account to assign as the validator. |
| *string* | description | string A description of the validator. |


#### *function* getAttributeTypeInformation

BasicJurisdiction.getAttributeTypeInformation(attributeTypeID) `view` `6b600462`

**Get a description of the attribute type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to check for. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | description | undefined |

#### *function* addValidatorApproval

BasicJurisdiction.addValidatorApproval(validator, attributeTypeID) `nonpayable` `7756588c`

**Approve the validator at address `validator` to issue attributes of the type with ID `attributeTypeID`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator to approve. |
| *uint256* | attributeTypeID | uint256 The ID of the approved attribute type. |


#### *function* removeAttributeType

BasicJurisdiction.removeAttributeType(ID) `nonpayable` `7aedf3e0`

**Remove the attribute type with ID `ID` from the jurisdiction.**

> All issued attributes of the given type will become invalid upon removal, but will become valid again if the attribute is reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The ID of the attribute type to remove. |


#### *function* getAttributeTypeIDs

BasicJurisdiction.getAttributeTypeIDs() `view` `9679c72a`

**Get the IDs of all available attribute types on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256[]* |  | undefined |

#### *function* countValidators

BasicJurisdiction.countValidators() `view` `97f3c806`

**Count the number of validators defined by the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* addAttributeType

BasicJurisdiction.addAttributeType(ID, description) `nonpayable` `acb29172`

**Add an attribute type with ID `ID` and description `description` to the jurisdiction.**

> Once an attribute type is added with a given ID, the description of the attribute type cannot be changed, even if the attribute type is removed and added back later.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | ID | uint256 The ID of the attribute type to add. |
| *string* | description | string A description of the attribute type. |


#### *function* removeValidatorApproval

BasicJurisdiction.removeValidatorApproval(validator, attributeTypeID) `nonpayable` `b340ec81`

**Deny the validator at address `validator` the ability to continue to issue attributes of the type with ID `attributeTypeID`.**

> Any attributes of the specified type issued by the validator in question will become invalid once the approval is removed. If the approval is reinstated, those attributes will become valid again. The approval will also be removed if the approved validator is removed.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | address The account of the validator with removed approval. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to unapprove. |


#### *function* getValidator

BasicJurisdiction.getValidator(index) `view` `b5d89627`

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

BasicJurisdiction.getValidators() `view` `b7ab4db5`

**Get the accounts of all available validators on the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address[]* |  | undefined |

#### *function* countAttributeTypes

BasicJurisdiction.countAttributeTypes() `view` `d71710e0`

**Count the number of attribute types defined by the jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* canIssueAttributeType

BasicJurisdiction.canIssueAttributeType(validator, attributeTypeID) `view` `f287f8fb`

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

BasicJurisdiction.revokeAttribute(account, attributeTypeID) `nonpayable` `f9292ffb`

**Revoke the attribute of the type with ID `attributeTypeID` from `account` if `message.caller.address()` is the issuing validator.**

> Validators may still revoke issued attributes even after they have been removed or had their approval to issue the attribute type removed - this enables them to address any objectionable issuances before being reinstated.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute on. |
| *uint256* | attributeTypeID | uint256 The ID of the attribute type to issue. |

#### *event* AttributeTypeAdded

BasicJurisdiction.AttributeTypeAdded(attributeTypeID, description) `e35410b0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | indexed |
| *string* | description | not indexed |

#### *event* AttributeTypeRemoved

BasicJurisdiction.AttributeTypeRemoved(attributeTypeID) `3302c92b`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | attributeTypeID | indexed |

#### *event* ValidatorAdded

BasicJurisdiction.ValidatorAdded(validator, description) `1b7d03cc`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | indexed |
| *string* | description | not indexed |

#### *event* ValidatorRemoved

BasicJurisdiction.ValidatorRemoved(validator) `e1434e25`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | indexed |

#### *event* ValidatorApprovalAdded

BasicJurisdiction.ValidatorApprovalAdded(validator, attributeTypeID) `b85fe33f`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *uint256* | attributeTypeID | indexed |

#### *event* ValidatorApprovalRemoved

BasicJurisdiction.ValidatorApprovalRemoved(validator, attributeTypeID) `61556816`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *uint256* | attributeTypeID | indexed |

#### *event* AttributeAdded

BasicJurisdiction.AttributeAdded(validator, attributee, attributeTypeID, attributeValue) `fc11e611`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *address* | attributee | indexed |
| *uint256* | attributeTypeID | not indexed |
| *uint256* | attributeValue | not indexed |

#### *event* AttributeRemoved

BasicJurisdiction.AttributeRemoved(validator, attributee, attributeTypeID) `aa5b822d`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | validator | not indexed |
| *address* | attributee | indexed |
| *uint256* | attributeTypeID | not indexed |


### ZEPValidator
---


#### *function* getJurisdiction

ZEPValidator.getJurisdiction() `view` `1fa1087c`

**Get the account of the utilized jurisdiction.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* unpauseIssuance

ZEPValidator.unpauseIssuance() `nonpayable` `2585a270`

**Unpause issuance of new attributes by organizations.**





#### *function* addOrganization

ZEPValidator.addOrganization(organization, maximumIssuableAttributes, name) `nonpayable` `35357c7c`

**Add an organization at account `organization` and with an initial allocation of issuable attributes of `maximumIssuableAttributes`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | address The account to assign to the organization.   |
| *uint256* | maximumIssuableAttributes | uint256 The number of issuable accounts. |
| *string* | name | undefined |


#### *function* countOrganizations

ZEPValidator.countOrganizations() `view` `379c31bf`

**Count the number of organizations defined by the validator.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* getOrganization

ZEPValidator.getOrganization(index) `view` `4526f690`

**Get the account of the organization at index `index`.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | index | uint256 The index of the organization in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | undefined |

#### *function* issuanceIsPaused

ZEPValidator.issuanceIsPaused() `view` `6c823242`

**Determine if attribute issuance is currently paused.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* getOrganizationInformation

ZEPValidator.getOrganizationInformation(organization) `view` `83235a0a`

**Get information about the organization at account `account`.**

> Note that an organization issuing numerous attributes may cause the function to fail, as the dynamic array could grow beyond a returnable size.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | address The account of the organization in question. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* | exists | undefined |
| *uint256* | maximumAccounts | undefined |
| *string* | name | undefined |
| *address[]* | issuedAccounts | undefined |

#### *function* getOrganizations

ZEPValidator.getOrganizations() `view` `9754a3a8`

**Get the accounts of all available organizations.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address[]* | accounts | undefined |

#### *function* getValidAttributeTypeID

ZEPValidator.getValidAttributeTypeID() `view` `98a11d8c`

**Get the ID of the attribute type that the validator can issue.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

#### *function* setMaximumIssuableAttributes

ZEPValidator.setMaximumIssuableAttributes(organization, maximumIssuableAttributes) `nonpayable` `a2a71da5`

**Modify an organization at account `organization` to change the number of issuable attributes to `maximumIssuableAttributes`.**

> Note that the maximum number of accounts cannot currently be set to a value less than the current number of issued accounts. This feature, coupled with the ability to revoke attributes, will *prevent an organization from being 'frozen' since the organization can remove an address and then add an arbitrary address in its place. Options to address this include a dedicated method for freezing organizations, or a special exception to the requirement below that allows the maximum to be set to 0 which will achieve the intended effect.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | address The account assigned to the organization.   |
| *uint256* | maximumIssuableAttributes | uint256 The number of issuable attributes. |


#### *function* issueAttribute

ZEPValidator.issueAttribute(account) `nonpayable` `c828b82b`

**Add an attribute to account `account`.**

> This function would need to be made payable to support jurisdictions that require fees in order to set attributes.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to issue the attribute to.   |


#### *function* initialize

ZEPValidator.initialize(jurisdiction, validAttributeTypeID) `nonpayable` `cd6dc687`

**The initializer function for the ZEP token, with owner and pauser roles initially assigned to contract creator (`message.caller.address()`), and with an associated jurisdiction at `jurisdiction` and an assignable attribute type with ID `validAttributeTypeID`.**

> Note that it may be appropriate to require that the referenced jurisdiction supports the correct interface via EIP-165 and that the validator has been approved to issue attributes of the specified type when initializing the contract - it is not currently required.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | jurisdiction | address The account of the associated jurisdiction.   |
| *uint256* | validAttributeTypeID | uint256 The ID of the attribute type to issue. |


#### *function* revokeAttribute

ZEPValidator.revokeAttribute(account) `nonpayable` `da15b9bd`

**Revoke an attribute from account `account`.**

> Organizations may still revoke attributes even after new issuance has been paused. This is the intended behavior, as it allows them to correct attributes they have issued that become compromised or otherwise erroneous.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | account | address The account to revoke the attribute from.   |


#### *function* pauseIssuance

ZEPValidator.pauseIssuance() `nonpayable` `df23cbb1`

**Pause all issuance of new attributes by organizations.**




#### *event* OrganizationAdded

ZEPValidator.OrganizationAdded(organization, name) `99387386`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | not indexed |
| *string* | name | not indexed |

#### *event* AttributeIssued

ZEPValidator.AttributeIssued(organization, attributee) `1f8ea1fa`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | indexed |
| *address* | attributee | not indexed |

#### *event* AttributeRevoked

ZEPValidator.AttributeRevoked(organization, attributee) `2f7805b6`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | organization | indexed |
| *address* | attributee | not indexed |

#### *event* IssuancePaused

ZEPValidator.IssuancePaused() `df34d30c`



#### *event* IssuanceUnpaused

ZEPValidator.IssuanceUnpaused() `940c41df`



### TPLTokenInterface
---


#### *function* getRegistry

TPLTokenInterface.getRegistry() `view` `5ab1bd53`

**Get the account of the utilized attribute registry.**




Outputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |

#### *function* canTransfer

TPLTokenInterface.canTransfer(to, value) `view` `d45e09c1`

**Check if an account is approved to transfer an amount of `value` to a recipient at account `to`.**

> Consider also returning a status code, e.g. EIP-1066

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | address The account of the recipient. |
| *uint256* | value | uint256 the amount to be transferred. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

#### *function* canTransferFrom

TPLTokenInterface.canTransferFrom(from, to, value) `view` `f37d11cc`

**Check if an account is approved to transfer an amount of `value` to a recipient at account `to` on behalf of a sender at account `from`.**

> Consider also returning a status code, e.g. EIP-1066

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | address The account of the sender. |
| *address* | to | address The account of the recipient. |
| *uint256* | value | uint256 the amount to be transferred. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## Additional Information

*NOTE: This section is out-of-date and is included for now for the sake of completeness.*

* An **attribute registry** is any smart contract that implements an [interface](https://github.com/TPL-protocol/tpl-contracts/blob/audit/contracts/AttributeRegistry.sol) containing a small set of external methods related to determining the existence of attributes. It enables implementing tokens and other contracts to avoid much of the complexity inherent in attribute validation and assignment by instead retrieving information from a trusted source. Attributes can be considered a lightweight alternative to claims as laid out in [EIP-735](https://github.com/ethereum/EIPs/issues/735).


* The standard **jurisdiction** is [implemented](https://github.com/TPL-protocol/tpl-contracts/blob/audit/contracts/StandardJurisdiction.sol) as a single contract that stores validated attributes for each participant, where each attribute is a `uint256 => uint256` key-value pair. It implements an `AttributeRegistry` interface along with associated [EIP-165](https://eips.ethereum.org/EIPS/eip-165) support, allowing other contracts to identify and confirm attributes recognized by the jurisdiction. It also implements additional [basic](https://github.com/TPL-protocol/tpl-contracts/blob/audit/contracts/BasicJurisdictionInterface.sol) and [extended](https://github.com/TPL-protocol/tpl-contracts/blob/audit/contracts/ExtendedJurisdictionInterface.sol) interfaces with methods and events that provide further context regarding actions within the jurisdiction.


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


* The **TPLToken** is a standard [OpenZeppelin ERC20 token](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/StandardToken.sol) that enforces attribute checks during every token transfer. For this [implementation](https://github.com/TPL-protocol/tpl-contracts/blob/audit/contracts/TPLToken.sol), the token checks the jurisdiction's registry for an attribute used to whitelist valid token recipients. The additional overhead for each transaction in the minimum-case is **4156 gas**, with 1512 used to execute jurisdiction contract logic and 2644 for general "plumbing" (the overhead of checking against an external call to the registry that simply returns `true`). *(NOTE: the attributes defined in the jurisdiction and required by TPLToken have been arbitrarily defined for this PoC, and are not intended to serve as a proposal for the attributes that will be used for validating transactions.)*


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
