
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "contracts/interfaces.sol";



contract ForcefullSendEth {

    constructor() payable{
        require(msg.value>0,"pointless");
    }

    function forceAll(address _dest) public{
        selfdestruct(payable(_dest));
    }
}