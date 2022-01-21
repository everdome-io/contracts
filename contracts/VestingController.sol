//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "contracts/interfaces.sol";
import "contracts/Tools.sol";
import "hardhat/console.sol";
import "contracts/VestingContract.sol";

contract VestingController is Ownable, Tools {

    bool public isInitialized;
    uint public immutable ICO_TIMESPAN;
    uint public start;
    uint public tokenPriceInBNB;
    bytes32 public rootHash;
    mapping (address => address) vestingContracts;
    IBEP20 public parentToken;
    IBEP20 public everdomeToken;

    constructor(address _parentToken, address _everdomeToken, 
            bytes32 _rootHash, uint _tokenPrice ){
        parentToken = IBEP20(_parentToken);
        everdomeToken = IBEP20(_everdomeToken);
        isInitialized = false;
        ICO_TIMESPAN = 24*3600;
        rootHash = _rootHash;
        tokenPriceInBNB = _tokenPrice;
    }

    function initialize(uint _start) onlyOwner public{
        require(_start > block.timestamp, "too-early");
        start = _start; 
        isInitialized = true;
    }

    function withdrawAll(address token) onlyOwner public{
        require(isInitialized == false || block.timestamp > start+ICO_TIMESPAN,"Vesting started");
        if(token == address(0)){
            require((payable(owner())).send(address(this).balance),"transfer failed");
        }else{
            IBEP20(token).transfer( _msgSender(), IBEP20(token).balanceOf(address(this)));
        }
    }

    function hasVestingContract() public view returns(bool){
        return vestingContracts[ _msgSender()] != address(0);
    }

    function availableToBuy() public view returns(uint){
        if(hasVestingContract()){
            VestingContract c = VestingContract(vestingContracts[ _msgSender()]) ;
            return c.amountAvailableToBuy();
        }
        return 0;
    }

    function claimTokens(uint amount, uint holdedBaseTokensAmount, bytes32[] memory proof) payable public{
        require(isInitialized,"ico-not-ready");
        require(block.timestamp >= start,"ico-not-started");
        require(block.timestamp < start+ICO_TIMESPAN,"ico-ended");
        require(nodeVerificationPasses(amount, holdedBaseTokensAmount, _msgSender(), proof, rootHash), "whitelist-data-mismatch");
        require(parentToken.balanceOf( _msgSender()) >= holdedBaseTokensAmount, "too-little-tokens-holded");
        require(msg.value > 0,"no-funds-end");
        VestingContract usersVault;
        if(hasVestingContract() == false){
            usersVault = new VestingContract(amount, everdomeToken, _msgSender());
            IWhitelisted(address(everdomeToken)).setWhitelisted(address(usersVault));
            vestingContracts[ _msgSender()] = address(usersVault);
        }else{
            usersVault = VestingContract(vestingContracts[ _msgSender()]);
        }

        uint amountAvailable = usersVault.amountAvailableToBuy();
        require(amountAvailable>0,"no-tokens-left-to-buy");
        uint boughtAmount = msg.value * (10**everdomeToken.decimals()) / tokenPriceInBNB;
        if(boughtAmount>amountAvailable){
            everdomeToken.approve(address(usersVault), amountAvailable);
            uint remainingBNB = (boughtAmount- amountAvailable) * tokenPriceInBNB / (10**everdomeToken.decimals()) ;
            usersVault.pull(amountAvailable);
            (bool sent,) = msg.sender.call{value: remainingBNB, gas:5000}("");
            require(sent, "failed-BNB-send");
        }else{
            everdomeToken.approve(address(usersVault), boughtAmount);
            usersVault.pull(boughtAmount);
        }
        usersVault.widthdrawAvailable();
    }

    function getVestingContract(address _owner) public view returns(address){
        return vestingContracts[_owner];
    }

}