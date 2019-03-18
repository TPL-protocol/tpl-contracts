pragma solidity ^0.4.24;

/**
 * base contract for proxying dispatcher approach to upgradeability
 */
contract Upgradeable {
    /** security */
    address internal _upgradeable_delegate_owner;

    /** delegated implementation */
    address internal _upgradeable_delegate;

    constructor() public {
        _upgradeable_delegate_owner = msg.sender;
    }

    /** override this method. please call super for safety! */
    function _upgradeable_initialize() public {
        require(msg.sender == _upgradeable_delegate_owner);
    }

    /** re-assign the implementation delegate */
    function _upgradeable_assign_delegate(address target) public {
        require(msg.sender == _upgradeable_delegate_owner);
        _upgradeable_delegate = target;
        require(target.delegatecall(bytes4(keccak256("_upgradeable_initialize()"))));
    }

    // todo must be able to re-assign owner! security!
}

/**
 * front-end dispatcher proxy for upgradeability support
 */
contract Dispatcher is Upgradeable {

    constructor(address target) public Upgradeable() {
        _upgradeable_assign_delegate(target);
    }

    function _upgradeable_initialize() public {
        // shouldn't happen on the dispatcher
        // revert();
    }

//    event Upgraded(address indexed implementation);

    function () payable public {
        address _impl = _upgradeable_delegate;
        bytes memory data = msg.data;

        require(_impl != address(0));

        assembly {
            // todo note: tyson is not sure why 10000 is the appropriate number here, please validate
            let result := delegatecall(sub(gas, 10000), _impl, add(data, 0x20), mload(data), 0, 0)
            let size := returndatasize
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }
}
