# Transaction Permission Layer PoC

Proof of concept for the contracts implementing a TPL jurisdiction and an ERC20-enforced TPL.

* The **jurisdiction** is implemented as a single contract that stores validated attributes for each participant, where each attribute is a string-uint256 key-value pair.
* The **RootDAO** is managed as a standard Gnosis multisig wallet, which has permission to modify the list of validators in the jurisdiction.
* Each **Validator** (or CA) is an address with permission to modify the attributes of the participants in the jurisdiction.
* The **TPLERC20** is a standard OpenZeppelin ERC20 token, that enforces certain attributes to be present in the participants of each transaction.

Certain features are unimplemented, such as revoking all attributes granted by a Validator. The attributes required by the TPLERC20 token have been arbitrarily defined for this PoC, and should not be considered as a proposal for the actual attributes to be used in validating transactions.