//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "contracts/Everdome.sol";


contract HeroTest is Everdome {

    constructor()
    Everdome(msg.sender,100000,8)
    {
        _name = "HeroTest";
        _symbol = "HT";
        locked = false;
    }
}