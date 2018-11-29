pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./TPLERC20PermissionedInterface.sol";
import "../../../AttributeRegistryInterface.sol";


/**
 * @title Permissioned ERC20 token: restricted by owner, receiver, operator,
 * total number of owners, and ownership amount. Funds may be locked by revoking
 * the required attribute on an account or by pausing transfers on the contract.
 */
contract TPLERC20Permissioned is ERC20, TPLERC20PermissionedInterface {
  // declare registry interface, used to request attributes from a jurisdiction
  AttributeRegistryInterface internal _registry;

  // declare attribute ID required on account in order to send or receive tokens
  uint256 internal _validOwnerAttributeTypeID;

  // declare attribute ID required in order to transfer tokens as an operator
  uint256 internal _validOperatorAttributeTypeID;

  // declare attribute ID for determining maximum number of token holders
  uint256 internal _maximumOwnersAttributeTypeID;

  // declare attribute ID for determining maximum amount of tokens that can be
  // held by one account.
  uint256 internal _ownershipLimitAttributeTypeID;

  // declare attribute ID for determining if all transfers have been paused
  uint256 internal _transfersPausedAttributeTypeID;

  // track the total number of token holders
  uint256 internal _totalOwners;

  /**
  * @notice The constructor function, with an associated attribute registry at
  * `registry`, two assignable attribute types with ID
  * `validOwnerAttributeTypeID` and `validOperatorAttributeTypeID`, an
  * assignable number of maximum token holders of `maximumOwners`, a
  * maximum allowance of owned tokens per owner of `ownershipLimit`, and an
  * attribute for if transfers are paused of `transfersPausedAttributeTypeID`.
  * @param registry address The account of the associated attribute registry.
  * @param validOwnerAttributeTypeID uint256 The ID of the required attribute
  * type in order to send or receive tokens.
  * @param validOperatorAttributeTypeID uint256 The ID of the required attribute
  * type in order to transfer tokens as an operator.
  * @param maximumOwnersAttributeTypeID uint256 The ID of the required attribute
  * type designating maximum number of allowed token holders.
  * @param ownershipLimitAttributeTypeID uint256 The ID of the required attribute
  * type designating maximum tokens that can be owned by any one token holder.
  * @param transfersPausedAttributeTypeID uint256 The ID of the required
  * attribute type designating whether transfers are paused.
  * @dev Note that it may be appropriate to require that the referenced
  * attribute registry supports the correct interface via EIP-165.
  */
  constructor(
    AttributeRegistryInterface registry,
    uint256 validOwnerAttributeTypeID,
    uint256 validOperatorAttributeTypeID,
    uint256 maximumOwnersAttributeTypeID,
    uint256 ownershipLimitAttributeTypeID,
    uint256 transfersPausedAttributeTypeID
  ) public {
    _registry = AttributeRegistryInterface(registry);
    _validOwnerAttributeTypeID = validOwnerAttributeTypeID;
    _validOperatorAttributeTypeID = validOperatorAttributeTypeID;
    _maximumOwnersAttributeTypeID = maximumOwnersAttributeTypeID;
    _ownershipLimitAttributeTypeID = ownershipLimitAttributeTypeID;
    _transfersPausedAttributeTypeID = transfersPausedAttributeTypeID;
  }

  /**
   * @notice Check if an account is approved to transfer tokens to account `to`
   * of an amount `value`.
   * @param to address The account of the recipient.
   * @param value uint256 The amount to transfer.
   * @return Bool indicating if transfer will succeed & byte with a status code.
   */
  function canTransfer(
    address to,
    uint256 value
  ) external view returns (bool, bytes1) {
    // Call the internal _canTransfer function that will return status and code
    return _canTransfer(msg.sender, to, value);
  }

  /**
   * @notice Check if an account is approved to transfer tokens on behalf of
   * account `from` to account `to` of an amount `value`.
   * @param from address The account holding the tokens to be sent.
   * @param to address The account of the recipient.
   * @param value uint256 The amount to transfer.
   * @return Bool indicating if transfer will succeed & byte with a status code.
   */
  function canTransferFrom(
    address from,
    address to,
    uint256 value
  ) external view returns (bool, bytes1) {
    // The operator must have the correct attribute assigned.
    if (!_registry.hasAttribute(msg.sender, _validOperatorAttributeTypeID)) {
      return (false, bytes1(hex"58")); // invalid operator
    }

    // The operator must have a sufficient approved allowance.
    if (allowance(from, msg.sender) < value) {
      return (false, bytes1(hex"53")); // insufficient allowance
    }

    // Call the internal _canTransfer function that will return status and code
    return _canTransfer(from, to, value);
  }

  /**
   * @notice Get the account of the utilized attribute registry.
   * @return The account of the registry.
   */
  function getRegistry() external view returns (address) {
    return address(_registry);
  }

  /**
   * @notice Get the ID of the attribute type required to send & receive tokens.
   * @return The ID of the required attribute type.
   */
  function getValidOwnerAttributeTypeID() external view returns (uint256) {
    return _validOwnerAttributeTypeID;
  }

  /**
   * @notice Get the ID of the attribute type required to transfer tokens as an
   * operator.
   * @return The ID of the required attribute type.
   */
  function getValidOperatorAttributeTypeID() external view returns (uint256) {
    return _validOperatorAttributeTypeID;
  }

  /**
   * @notice Get the ID of the attribute type that tracks the maximum number of
   * allowed token holders.
   * @return The number of allowed token holders.
   */
  function getMaximumOwnersAttributeTypeID() external view returns (uint256) {
    return _maximumOwnersAttributeTypeID;
  }

  /**
   * @notice Get the ID of the attribute type that tracks the maximum amount of
   * tokens that can be held by any one account. Note that this could easily be
   * adapted to assign specific limits to each account.
   * @return The ownership limit for any one account.
   */
  function getOwnershipLimitAttributeTypeID() external view returns (uint256) {
    return _ownershipLimitAttributeTypeID;
  }

  /**
   * @notice Get the total number of current token holders.
   * @return The current number of token holders.
   */
  function getTotalOwners() external view returns (uint256) {
    return _totalOwners;
  }

  /**
   * @dev Modifier to make a function callable only if transfers are not paused.
   */
  modifier whenNotPaused() {
    require(!transfersPaused());
    _;
  }

  /**
   * @return true if all transfers are paused on the contract, false otherwise.
   */
  function transfersPaused() public view returns (bool) {
    return _registry.hasAttribute(
      address(this), _transfersPausedAttributeTypeID
    );
  }

  /**
   * @notice Transfer an amount of `value` to a receiver at account `to`.
   * @param to address The account of the receiver.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer was successful.
   */
  function transfer(
    address to,
    uint256 value
  ) public returns (bool) {

    _prepareTransfer(msg.sender, to, value);

    return super.transfer(to, value);
  }

  /**
   * @notice Transfer an amount of `value` to a receiver at account `to` on
   * behalf of a sender at account `from`.
   * @param from address The account of the sender.
   * @param to address The account of the receiver.
   * @param value uint256 the amount to be transferred.
   * @return True if the transfer was successful.
   */
  function transferFrom(
    address from,
    address to,
    uint256 value
  ) public returns (bool) {
    // The operator must have the correct attribute assigned.
    require(
      _registry.hasAttribute(msg.sender, _validOperatorAttributeTypeID),
      "Transfer failed - operator is not approved."
    );

    _prepareTransfer(from, to, value);

    return super.transferFrom(from, to, value);
  }

  /**
   * @notice Internal function for checking if tokens can be transferred from
   * `from` to account `to` of an amount `value`.
   * @param from address The account holding the tokens to be sent.
   * @param to address The account of the recipient.
   * @param value uint256 The amount to transfer.
   * @return Bool indicating if transfer will succeed & byte with a status code.
   */
  function _canTransfer(
    address from,
    address to,
    uint256 value
  ) internal view returns (bool, bytes1) {
    // The contract cannot be paused.
    if (transfersPaused()) {
      return (false, bytes1(hex"54")); // transfers halted
    }

    // The `to` address cannot be the null address.
    if (to == address(0)) {
      return (false, bytes1(hex"57")); // invalid receiver
    }

    // The owner must have the correct attribute assigned.
    if (!_registry.hasAttribute(from, _validOwnerAttributeTypeID)) {
      return (false, bytes1(hex"56")); // invalid sender
    }

    // The recipient of the transfer must have the correct attribute assigned.
    if (!_registry.hasAttribute(to, _validOwnerAttributeTypeID)) {
      return (false, bytes1(hex"57")); // invalid receiver
    }

    if (value > 0) {
      // The owner must have a sufficient balance.
      uint256 ownerBalance = balanceOf(from);
      if (ownerBalance < value) {
        return (false, bytes1(hex"52")); // insufficient balance
      }

      // The recipient must not be pushed over the maximum allowable balance.
      uint256 receiverBalance = balanceOf(to);
      if (
        to != from &&
        receiverBalance.add(value) > _registry.getAttributeValue(
          address(this), _ownershipLimitAttributeTypeID
        )
      ) {
        return (false, bytes1(hex"59")); // invalid balance
      }

      // The maximum number of owners must not be exceeded.
      uint256 maximumOwners = _registry.getAttributeValue(
        address(this), _maximumOwnersAttributeTypeID
      );

      if (
        receiverBalance == 0 && (
          _totalOwners > maximumOwners || (
            _totalOwners == maximumOwners &&
            ownerBalance > value
          )
        )
      ) {
        return (false, bytes1(hex"5A")); // invalid state
      }
    }

    // The transfer is approved, return true and the success status code.
    return (true, bytes1(hex"51")); // transfer approved
  }

  /**
   * @notice Internal function called before transfers with amount of `value` to
   * a receiver at account `to` and from a sender at account `from`.
   * @param from address The account holding the tokens to be sent.
   * @param to address The account of the receiver.
   * @param value uint256 the amount to be transferred.
   */
  function _prepareTransfer(
    address from,
    address to,
    uint256 value
  ) internal whenNotPaused {
    // The sender of the transfer must have the correct attribute assigned.
    require(
      _registry.hasAttribute(from, _validOwnerAttributeTypeID),
      "Transfer failed - sender is not approved."
    );

    // The recipient of the transfer must have the correct attribute assigned.
    require(
      _registry.hasAttribute(to, _validOwnerAttributeTypeID),
      "Transfer failed - recipient is not approved."
    );

    if (value > 0) {
      // The recipient must not be pushed over the maximum allowable balance.
      uint256 receiverBalance = balanceOf(to);
      require(
        to == from ||
        receiverBalance.add(value) <= _registry.getAttributeValue(
          address(this), _ownershipLimitAttributeTypeID
        ),
        "Transfer failed - recipient balance cannot exceed ownership limit."
      );

      // The maximum number of owners must not be exceeded.
      uint256 maximumOwners = _registry.getAttributeValue(
        address(this), _maximumOwnersAttributeTypeID
      );

      uint256 ownerBalance = balanceOf(from);
      require(
        _totalOwners < maximumOwners ||
        receiverBalance > 0 || (
          _totalOwners == maximumOwners &&
          ownerBalance == value
        ),
        "Transfer failed - maximum number of token holders exceeded."
      );

      // Decrease number of total token holders if transferring entire balance.
      if (ownerBalance == value) {
        _totalOwners = _totalOwners.sub(1);
      }

      // Increase number of total token holders if recipient has a zero balance.
      if (receiverBalance == 0) {
        _totalOwners = _totalOwners.add(1);
      }
    }
  }

  /**
   * @dev Internal function that mints an amount of the token and assigns it to
   * an account. This encapsulates the modification of balances such that the
   * proper events are emitted. Note that a partitioned / tranched token
   * representation should be used in order to enforce a lockup period for
   * minted funds unless tokens are only minted once per account.
   * @param account The account that will receive the created tokens.
   * @param value The amount that will be created.
   */
  function _mint(address account, uint256 value) internal whenNotPaused {
    // The receiving account must have the correct attribute assigned.
    require(
      _registry.hasAttribute(account, _validOwnerAttributeTypeID),
      "Mint failed - recipient is not approved."
    );

    if (value > 0) {
      uint256 accountBalance = balanceOf(account);

      require(
        accountBalance > 0 ||
        _totalOwners < _registry.getAttributeValue(
          address(this), _maximumOwnersAttributeTypeID
        ),
        "Mint failed - maximum number of token holders exceeded."
      );

      require(
        accountBalance.add(value) <= _registry.getAttributeValue(
          address(this), _ownershipLimitAttributeTypeID
        ),
        "Mint failed - maximum allowed ownership amount exceeded."
      );

      if (accountBalance == 0) {
        _totalOwners = _totalOwners.add(1);
      }
    }

    super._mint(account, value);
  }

  /**
   * @dev Internal function that burns an amount of the token of a given
   * account.
   * @param account The account whose tokens will be burnt.
   * @param value The amount that will be burnt.
   */
  function _burn(address account, uint256 value) internal whenNotPaused {
    if (balanceOf(account) == value && value > 0) {
      _totalOwners = _totalOwners.sub(1);
    }

    super._burn(account, value);
  }
}
