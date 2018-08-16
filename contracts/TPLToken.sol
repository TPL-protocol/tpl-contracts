pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "./Registry.sol";

contract TPLToken is StandardToken {

  // declare registry interface, used to request attributes from a jurisdiction
  Registry registry;

  // declare attribute string required in order to transfer tokens
  uint256 constant VALID_TOKEN_HOLDER_ATTRIBUTE_ID = 11111;

  // initialize token with a jurisdiction address and an initial token balance
  constructor(Registry _jurisdiction, uint256 _initialBalance) public {
    registry = _jurisdiction;
    balances[msg.sender] = _initialBalance;
    totalSupply_ = _initialBalance;
  }

  // provide getter function for checking address of the registry token is using
  function getRegistryAddress() external view returns (address) {
    return address(registry);
  }

  // in order to transfer tokens, both the sender and the receiver must be valid
  function transferAllowed(address _from, address _to) public view returns (bool) {
    return (
      registry.hasAttribute(_from, VALID_TOKEN_HOLDER_ATTRIBUTE_ID) &&
      registry.hasAttribute(_to, VALID_TOKEN_HOLDER_ATTRIBUTE_ID)
    );
  }

  // check that the sender is allowed to transfer before enabling the transfer
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(msg.sender, _to));
    super.transfer(_to, _value);
  }

  // check that the transfer is valid for both parties before approved transfers
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(transferAllowed(_from, _to));
    super.transferFrom(_from, _to, _value);
  }

}