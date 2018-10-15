pragma solidity ^0.4.25;

import "openzeppelin-zos/contracts/Initializable.sol";
import "openzeppelin-zos/contracts/ownership/Ownable.sol";
import "openzeppelin-zos/contracts/lifecycle/Pausable.sol";
import "./AttributeRegistryInterface.sol";
import "./BasicJurisdictionInterface.sol";

/**
 * @title Initial validator contract for the ZEP token.
 */
contract ZEPValidator is Initializable, Ownable, Pausable {
  // declare events
  event OrganizationAdded(address organization, string name);
  event AttributeIssued(
    address indexed organization,
    address attributee
  );
  event AttributeRevoked(
    address indexed organization,
    address attributee
  );
  event IssuancePaused();
  event IssuanceUnpaused();

  // declare registry interface, used to request attributes from a jurisdiction
  AttributeRegistryInterface private _registry;

  // declare jurisdiction interface, used to set attributes in the jurisdiction
  BasicJurisdictionInterface private _jurisdiction;

  // declare the attribute ID required by ZEP in order to transfer tokens
  uint256 private _validAttributeTypeID;

  // organizations are entities who can add attibutes to a number of accounts
  struct Organization {
    bool exists;
    uint256 maximumAccounts; // NOTE: consider using uint248 to pack w/ exists
    string name;
    address[] accounts;
    mapping(address => bool) issuedAccounts;
    mapping(address => uint256) issuedAccountsIndex;
  }

  // organization data & issued attribute accounts are held in a struct mapping
  mapping(address => Organization) private _organizations;

  // accounts of all organizations are held in an array (enables enumeration)
  address[] private _organizationAccounts;

  // issuance of new attributes may be paused and unpaused by the ZEP validator.
  bool private _issuancePaused;

  /**
  * @notice The initializer function for the ZEP token, with owner and pauser
  * roles initially assigned to contract creator (`message.caller.address()`),
  * and with an associated jurisdiction at `jurisdiction` and an assignable
  * attribute type with ID `validAttributeTypeID`.
  * @param jurisdiction address The account of the associated jurisdiction.  
  * @param validAttributeTypeID uint256 The ID of the attribute type to issue.
  * @dev Note that it may be appropriate to require that the referenced
  * jurisdiction supports the correct interface via EIP-165 and that the
  * validator has been approved to issue attributes of the specified type when
  * initializing the contract - it is not currently required.
  */
  function initialize(
    address jurisdiction,
    uint256 validAttributeTypeID
  )
    public
    initializer
  {
    Ownable.initialize(msg.sender);
    Pausable.initialize(msg.sender);
    _issuancePaused = false;
    _registry = AttributeRegistryInterface(jurisdiction);
    _jurisdiction = BasicJurisdictionInterface(jurisdiction);
    _validAttributeTypeID = validAttributeTypeID;
  }

  /**
  * @notice Add an organization at account `organization` and with an initial
  * allocation of issuable attributes of `maximumIssuableAttributes`.
  * @param organization address The account to assign to the organization.  
  * @param maximumIssuableAttributes uint256 The number of issuable accounts.
  */
  function addOrganization(
    address organization,
    uint256 maximumIssuableAttributes,
    string name
  ) external onlyOwner whenNotPaused {
    // check that an empty account was not provided by mistake
    require(organization != address(0), "must supply a valid account address");

    // prevent existing organizations from being overwritten
    require(
      _organizations[organization].exists == false,
      "an organization already exists at the provided account address"
    );

    // set up the organization in the organizations mapping
    _organizations[organization].exists = true;
    _organizations[organization].maximumAccounts = maximumIssuableAttributes;
    _organizations[organization].name = name;
    
    // add the organization to the end of the organizationAccounts array
    _organizationAccounts.push(organization);

    // log the addition of the organization
    emit OrganizationAdded(organization, name);
  }

  /**
  * @notice Modify an organization at account `organization` to change the
  * number of issuable attributes to `maximumIssuableAttributes`.
  * @param organization address The account assigned to the organization.  
  * @param maximumIssuableAttributes uint256 The number of issuable attributes.
  * @dev Note that the maximum number of accounts cannot currently be set to a
  * value less than the current number of issued accounts. This feature, coupled
  * with the ability to revoke attributes, will *prevent an organization from
  * being 'frozen' since the organization can remove an address and then add an
  * arbitrary address in its place. Options to address this include a dedicated
  * method for freezing organizations, or a special exception to the requirement
  * below that allows the maximum to be set to 0 which will achieve the intended
  * effect.
  */
  function setMaximumIssuableAttributes(
    address organization,
    uint256 maximumIssuableAttributes
  ) external onlyOwner whenNotPaused {
    require(
      _organizations[organization].exists == true,
      "an organization does not exist at the provided account address"
    );

    // make sure that maximum is not set below the current number of addresses
    require(
      _organizations[organization].accounts.length <= maximumIssuableAttributes,
      "maximum cannot be set to amounts less than the current account total"
    );

    // set the organization's maximum addresses; a value == current freezes them
    _organizations[organization].maximumAccounts = maximumIssuableAttributes;
  }

  /**
  * @notice Add an attribute to account `account`.
  * @param account address The account to issue the attribute to.  
  * @dev This function would need to be made payable to support jurisdictions
  * that require fees in order to set attributes.
  */
  function issueAttribute(
    address account
  ) external whenNotPaused whenIssuanceNotPaused {
    // check that an empty address was not provided by mistake
    require(account != address(0), "must supply a valid account address");

    // make sure the request is coming from a valid organization
    require(
      _organizations[msg.sender].exists == true,
      "only organizations may issue attributes"
    );

    // ensure that the maximum has not been reached yet
    uint256 maximum = uint256(_organizations[msg.sender].maximumAccounts);
    require(
      _organizations[msg.sender].accounts.length < maximum,
      "the organization is not permitted to issue any additional attributes"
    );
 
    // assign the attribute to the jurisdiction (NOTE: a value is not required)
    _jurisdiction.addAttributeTo(account, _validAttributeTypeID, 0);

    // ensure that the attribute was correctly assigned
    require(
      _registry.hasAttribute(account, _validAttributeTypeID) == true,
      "attribute addition was not accepted by the jurisdiction"
    );

    // add the account to the mapping of issued accounts
    _organizations[msg.sender].issuedAccounts[account] = true;

    // add the index of the account to the mapping of issued accounts
    uint256 index = _organizations[msg.sender].accounts.length;
    _organizations[msg.sender].issuedAccountsIndex[account] = index;

    // add the address to the end of the organization's `accounts` array
    _organizations[msg.sender].accounts.push(account);
    
    // log the addition of the new attributed account
    emit AttributeIssued(msg.sender, account);
  }

  /**
  * @notice Revoke an attribute from account `account`.
  * @param account address The account to revoke the attribute from.  
  * @dev Organizations may still revoke attributes even after new issuance has
  * been paused. This is the intended behavior, as it allows them to correct
  * attributes they have issued that become compromised or otherwise erroneous.
  */
  function revokeAttribute(address account) external whenNotPaused {
    // check that an empty address was not provided by mistake
    require(account != address(0), "must supply a valid account address");

    // make sure the request is coming from a valid organization
    require(
      _organizations[msg.sender].exists == true,
      "only organizations may revoke attributes"
    );

    // ensure that the account has been issued an attribute
    require(
      _organizations[msg.sender].issuedAccounts[account] &&
      _organizations[msg.sender].accounts.length > 0,
      "the organization is not permitted to revoke an unissued attribute"
    );
 
    // remove the attribute to the jurisdiction
    _jurisdiction.removeAttributeFrom(account, _validAttributeTypeID);

    // ensure that the attribute was correctly removed
    require(
      _registry.hasAttribute(account, _validAttributeTypeID) == false,
      "attribute revocation was not accepted by the jurisdiction"
    );

    // get the account at the last index of the array
    uint256 lastIndex = _organizations[msg.sender].accounts.length - 1;
    address lastAccount = _organizations[msg.sender].accounts[lastIndex];

    // get the index to delete
    uint256 indexToDelete = _organizations[msg.sender].issuedAccountsIndex[account];

    // set the account at indexToDelete to last account
    _organizations[msg.sender].accounts[indexToDelete] = lastAccount;

    // update the index of the account that was moved
    _organizations[msg.sender].issuedAccountsIndex[lastAccount] = indexToDelete;
    
    // remove the (now duplicate) account at the end by trimming the array
    _organizations[msg.sender].accounts.length--;
    
    // log the addition of the new attributed account
    emit AttributeRevoked(msg.sender, account);
  }

  /**
   * @notice Pause all issuance of new attributes by organizations.
   */
  function pauseIssuance() public onlyOwner whenNotPaused whenIssuanceNotPaused {
    _issuancePaused = true;
    emit IssuancePaused();
  }

  /**
   * @notice Unpause issuance of new attributes by organizations.
   */
  function unpauseIssuance() public onlyOwner whenNotPaused {
    require(_issuancePaused); // only allow unpausing when issuance is paused
    _issuancePaused = false;
    emit IssuanceUnpaused();
  }

  /**
   * @notice Determine if attribute issuance is currently paused.
   * @return True if issuance is currently paused, false otherwise.
   */
  function issuancePaused() public view returns (bool) {
    return _issuancePaused;
  }

  /**
   * @notice Modifier to allow issuing attributes only when not paused
   */
  modifier whenIssuanceNotPaused() {
    require(!_issuancePaused);
    _;
  }

  /**
   * @notice Count the number of organizations defined by the validator.
   * @return The number of defined organizations.
   */
  function countOrganizations() external view returns (uint256) {
    return _organizationAccounts.length;
  }

  /**
   * @notice Get the account of the organization at index `index`.
   * @param index uint256 The index of the organization in question.
   * @return The account of the organization.
   */
  function getOrganization(uint256 index) external view returns (
    address organization
  ) {
    return _organizationAccounts[index];
  }

  /**
   * @notice Get the accounts of all available organizations.
   * @return A dynamic array containing all defined organization accounts.
   */
  function getOrganizations() external view returns (address[] accounts) {
    return _organizationAccounts;
  }

  /**
   * @notice Get information about the organization at account `account`.
   * @param organization address The account of the organization in question.
   * @return The organization's existence, the maximum issuable accounts, the
   * name of the organization, and a dynamic array containing issued accounts.
   * @dev Note that an organization issuing numerous attributes may cause the
   * function to fail, as the dynamic array could grow beyond a returnable size.
   */
  function getOrganizationInformation(
    address organization
  ) external view returns (
    bool exists,
    uint256 maximumAccounts,
    string name,
    address[] issuedAccounts
  ) {
    return (
      _organizations[organization].exists,
      _organizations[organization].maximumAccounts,
      _organizations[organization].name,
      _organizations[organization].accounts
    );
  }

  /**
   * @notice Get the account of the utilized jurisdiction.
   * @return The account of the jurisdiction.
   */
  function getJurisdiction() external view returns (address) {
    return address(_jurisdiction);
  }

  /**
   * @notice Get the ID of the attribute type that the validator can issue.
   * @return The ID of the attribute type.
   */
  function getValidAttributeTypeID() external view returns (uint256) {
    return _validAttributeTypeID;
  }
}