import { Everdome, HeroTest, VestingController } from "../typechain";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
import { computeHash, generateWhiteListData, getEvents, MerkleRecord, MerkleTreeData } from "../scripts/utils";
const hre = require("hardhat");

const chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");

const expect = chai.expect;

describe("VestingController", async function () {
    let TestInstance : HeroTest;
    let EverdomeInstance : Everdome;
  let VestingControllerInstance : VestingController;
  let deployer : Signer;
  let deployerAddr : string;
  let owner : Signer;
  let start : number;
  let ownerAddress : string;
  let provider : any;
  const desiredMaxAmount : number = 1000;
  let testSupply = 1000000;
  let startingRecords : MerkleRecord[];
  let merkleTreeData : MerkleTreeData;

  this.beforeAll(async function () {
    const decimals = 6;
    provider = hre.ethers.provider;
    const signer = await provider.getSigner(0);
    deployerAddr = await signer.getAddress();
    let Everdome = await ethers.getContractFactory("Everdome");
    let op = await Everdome.deploy(deployerAddr, testSupply, decimals);
    EverdomeInstance = await op.deployed();

    let HeroTest = await ethers.getContractFactory("HeroTest");
    let op2 = await HeroTest.deploy();
    TestInstance = await op2.deployed();
    deployer = await provider.getSigner(0);
    deployerAddr = await deployer.getAddress();
    owner = await provider.getSigner(0);
    ownerAddress = await deployer.getAddress();

    let x = await generateWhiteListData([await provider.getSigner(0),
        await provider.getSigner(1),
        await provider.getSigner(2),
        await provider.getSigner(3),
        await provider.getSigner(4),
      ]);
    startingRecords = x;

    let Tools = await ethers.getContractFactory("Tools");
    let opT = await Tools.deploy();
    let ToolsInstance = await opT.deployed();
    
    merkleTreeData = await computeHash(startingRecords, ToolsInstance);

  });

  async function forcefulSendEth(address:string, sender: Signer, amount:number) {
    let ForcefullSendEth = await ethers.getContractFactory("ForcefullSendEth");
    let opT = await ForcefullSendEth.deploy({
      value:amount
    });
    let ForcefullSendEthInstance = await opT.deployed();
    await ForcefullSendEth.connect(sender);
    await ForcefullSendEthInstance.forceAll(address);
  }

  async function deployNewVestingCopy(){
    let VestingController = await ethers.getContractFactory("VestingController");
    let deployment = await VestingController.deploy(TestInstance.address,
      EverdomeInstance.address, 
      merkleTreeData.root,
      "2000000000000000" //500 tokens for BNB
      );
    VestingControllerInstance = await deployment.deployed();
    await EverdomeInstance.setAdmin(VestingControllerInstance.address);
    await EverdomeInstance.setWhitelisted(VestingControllerInstance.address);
    const block = await provider.getBlock('latest');
    start = block.timestamp+100;
    console.log(start);
  }

  describe("constructor", async function () {
    this.beforeAll(async function () {
        await deployNewVestingCopy();
    })
  
    it("should be not initialized", async function () { 
      let status = await VestingControllerInstance.isInitialized();
      expect(status).to.be.false;
    });
    it("should have correct everdome address", async function () {
      let everdomeToken = await VestingControllerInstance.everdomeToken();
      expect(everdomeToken).to.be.equal(EverdomeInstance.address);
    });
    it("should have correct hero address", async function () {
      let parentToken = await VestingControllerInstance.parentToken();
      expect(parentToken).to.be.equal(TestInstance.address);
    });
    it("should have correct tokenPriceInBNB", async function () {
      let price = await VestingControllerInstance.tokenPriceInBNB();
      expect(price.toString()).to.be.equal("2000000000000000");
    });
  });

  describe("initialize",async function(){
    
    this.beforeEach(async function () {
        await deployNewVestingCopy();
    })

    it("should revert if called not by admin (owner)", async function () {
      let invoker = await provider.getSigner(1);
      let VestingControllerInstanceDifferentCtx = VestingControllerInstance.connect(invoker);
      let promise = VestingControllerInstanceDifferentCtx.initialize(start);
      await expect(promise).to.be.revertedWith("Ownable: caller is not the owner");
      let status = await VestingControllerInstance.isInitialized();
      expect(status).to.be.false;
    });

    it("should change initialisation flag to true when called by owner", async function () {
      let status = await VestingControllerInstance.isInitialized();
      expect(status).to.be.false;
      await VestingControllerInstance.initialize(start);
      status = await VestingControllerInstance.isInitialized();
      expect(status).to.be.true;
    });

    it("should set start time correctly", async function () {
      let result = await VestingControllerInstance.initialize(start);
      let _start = await VestingControllerInstance.start();
      expect(start).to.be.equal(_start.toNumber());
    });

  })

  
  describe("withdrawAll",async function(){
    
    this.beforeEach(async function () {
        await deployNewVestingCopy();
    })

    it("should revert if called not by admin (owner)", async function () {
      let invoker = await provider.getSigner(1);
      let VestingControllerInstanceDifferentCtx = VestingControllerInstance.connect(invoker);
      let promise = VestingControllerInstanceDifferentCtx.withdrawAll(EverdomeInstance.address);
      await expect(promise).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert if called by owner after initialisation and before END", async function () {
      await VestingControllerInstance.initialize(start);
      let promise = VestingControllerInstance.withdrawAll(EverdomeInstance.address);
      await expect(promise).to.be.revertedWith("Vesting started");
    });

    describe("before ICO", async function(){

      it("should send full Everdome balance to owner if not reverted", async function () {
        const intendedBalance = 1000;
        await EverdomeInstance.transfer(VestingControllerInstance.address,intendedBalance);
  
        const ownerBalanceBefore = await EverdomeInstance.balanceOf(ownerAddress);
        const contractBalanceBefore = await EverdomeInstance.balanceOf(VestingControllerInstance.address);
  
        let tx = await VestingControllerInstance.withdrawAll(EverdomeInstance.address);
        await tx.wait();
        const ownerBalanceAfter = await EverdomeInstance.balanceOf(ownerAddress);
        const contractBalanceAfter = await EverdomeInstance.balanceOf(VestingControllerInstance.address);
  
        expect(ownerBalanceAfter.toNumber()).to.be.equal(ownerBalanceBefore.toNumber()+intendedBalance);
        expect(contractBalanceBefore.toNumber()).to.be.equal(intendedBalance);
        expect(contractBalanceAfter.toNumber()).to.be.equal(0);
  
      });
  
      it("should send full BNB balance to owner if not reverted and called with 0x0 address", async function () {
        const intendedBalance = 1000;
  
        await forcefulSendEth(VestingControllerInstance.address, owner, intendedBalance);
  
        const ownerBalanceBefore = await provider.getBalance(ownerAddress);
        const contractBalanceBefore = await provider.getBalance(VestingControllerInstance.address);
  
        let tx = await VestingControllerInstance.withdrawAll("0x0000000000000000000000000000000000000000", {
          gasPrice:0
        });
  
        await tx.wait();
  
        const ownerBalanceAfter = await provider.getBalance(ownerAddress);
        const contractBalanceAfter = await await provider.getBalance(VestingControllerInstance.address);
  
        expect(contractBalanceBefore.toString()).to.be.equal(intendedBalance.toString());
        expect(contractBalanceAfter.toString()).to.be.equal('0');
        expect(ownerBalanceAfter.toString()).to.be.equal(ownerBalanceBefore.add(intendedBalance).toString());
      });
    })

    describe("after ICO", async function(){

      this.beforeEach(async () => {
        let result = await VestingControllerInstance.initialize(start);
        await provider.send("evm_setNextBlockTimestamp", [start+ 24*3600]);
        await provider.send("evm_mine")
      })

      it("should send full Everdome balance to owner if not reverted", async function () {
        const intendedBalance = 1000;
        await EverdomeInstance.transfer(VestingControllerInstance.address,intendedBalance);
  
        const ownerBalanceBefore = await EverdomeInstance.balanceOf(ownerAddress);
        const contractBalanceBefore = await EverdomeInstance.balanceOf(VestingControllerInstance.address);
  
        let tx = await VestingControllerInstance.withdrawAll(EverdomeInstance.address);
        await tx.wait();
        const ownerBalanceAfter = await EverdomeInstance.balanceOf(ownerAddress);
        const contractBalanceAfter = await EverdomeInstance.balanceOf(VestingControllerInstance.address);
  
        expect(ownerBalanceAfter.toNumber()).to.be.equal(ownerBalanceBefore.toNumber()+intendedBalance);
        expect(contractBalanceBefore.toNumber()).to.be.equal(intendedBalance);
        expect(contractBalanceAfter.toNumber()).to.be.equal(0);
  
      });
  
      it("should send full BNB balance to owner if not reverted and called with 0x0 address", async function () {
        const intendedBalance = 1000;
  
        await forcefulSendEth(VestingControllerInstance.address, owner, intendedBalance);
  
        const ownerBalanceBefore = await provider.getBalance(ownerAddress);
        const contractBalanceBefore = await provider.getBalance(VestingControllerInstance.address);
  
        let tx = await VestingControllerInstance.withdrawAll("0x0000000000000000000000000000000000000000", {
          gasPrice:0
        });
  
        await tx.wait();
  
        const ownerBalanceAfter = await provider.getBalance(ownerAddress);
        const contractBalanceAfter = await await provider.getBalance(VestingControllerInstance.address);
  
        expect(contractBalanceBefore.toString()).to.be.equal(intendedBalance.toString());
        expect(contractBalanceAfter.toString()).to.be.equal('0');
        expect(ownerBalanceAfter.toString()).to.be.equal(ownerBalanceBefore.add(intendedBalance).toString());
      });
    })


  })
  
  describe("claimTokens",async function(){
    
    this.beforeEach(async function () {
        await deployNewVestingCopy();
    })

    it("should revert if called before contract initialised", async function () {
      let tx = VestingControllerInstance.claimTokens(startingRecords[0].everamount, startingRecords[0].heroamount, merkleTreeData[startingRecords[0].useraddress]);
      await expect(tx).to.be.revertedWith("ico-not-ready");
    });

    it("should revert if called after ICO ended", async function () {  
      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 24*3600+1]);
      await provider.send("evm_mine")
      let tx = VestingControllerInstance.claimTokens(startingRecords[0].everamount, 
        startingRecords[0].heroamount, 
        merkleTreeData[startingRecords[0].useraddress]);
      await expect(tx).to.be.revertedWith("ico-ended");
    });

    it("should revert if called from incorrect address", async function () {
      let result = await VestingControllerInstance.initialize(start+1);
      let s1 = await provider.getSigner(1);
      let otherCtx = await VestingControllerInstance.connect(s1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let tx = otherCtx.claimTokens(startingRecords[0].everamount, 
        startingRecords[0].heroamount, 
        merkleTreeData[startingRecords[0].useraddress]);
      await expect(tx).to.be.revertedWith("whitelist-data-mismatch");
    });

    it("should revert if called with incorrect merkel proof", async function () {
      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let tx = VestingControllerInstance.claimTokens(startingRecords[0].everamount, 
        startingRecords[0].heroamount, 
        merkleTreeData[startingRecords[1].useraddress]);
      await expect(tx).to.be.revertedWith("whitelist-data-mismatch");
    });

    it("should revert if balance of hero too low", async function () {
      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      let tx = otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress]);
      await expect(tx).to.be.revertedWith("too-little-tokens-holded");
    });

    it("should revert if teransaction send without BNB", async function () {

      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);
      let tx = otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress]);
      await expect(tx).to.be.revertedWith("no-funds-end");
    });

    it("should create VestingContract on first buy", async function () {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);
      let vestingAddressBefore = await otherCtx.getVestingContract(startingRecords[1].useraddress);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let vestingAddressAfter = await otherCtx.getVestingContract(startingRecords[1].useraddress);

      expect(vestingAddressBefore).to.be.equal("0x0000000000000000000000000000000000000000");
      expect(vestingAddressAfter).to.be.not.equal("0x0000000000000000000000000000000000000000");
    });

    it("should reuse VestingContract on second buy", async function () {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      let result = await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);
      
      await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1"
        });

      let vestingAddressBefore = await otherCtx.getVestingContract(startingRecords[1].useraddress);

      await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let vestingAddressAfter = await otherCtx.getVestingContract(startingRecords[1].useraddress);
      expect(vestingAddressBefore).to.be.equal(vestingAddressAfter);
    });

    it("should call pull in VestingContract", async function () {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let receipt = await tx.wait();

      let events = getEvents(receipt, "event PullCalled(uint amount)", "PullCalled");

      expect(events.length).to.be.equal(1);

    });
    
    it("should call widthdrawAvailable in VestingContract", async function () {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let receipt = await tx.wait();

      let events = getEvents(receipt, "event WithdrawAvailableCalled(uint amount)", "WithdrawAvailableCalled");

      expect(events.length).to.be.equal(1);
    })

  })

  describe("availableToBuy",async function(){
    
    this.beforeEach(async function () {
      await deployNewVestingCopy();
    })

    it("returns 0 for user before his first claim (merkleProof verification)",async function() {
      let balance = await VestingControllerInstance.availableToBuy();

      expect(balance.toNumber()).to.be.equal(0);
    })

    it("returns less startingRecords[1].everamount for user after his first claim (merkleProof verification)",async function() {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000"
        });

      await tx.wait();

      let balance = await otherCtx.availableToBuy();

      expect(balance.toNumber()).to.be.not.equal(0);
      console.log(startingRecords[1]);
      expect(balance.toNumber()).to.be.lessThan(parseInt(startingRecords[1].everamount));
    })

  });
  
  describe("getVestingContract",async function(){
    
    this.beforeEach(async function () {
      await deployNewVestingCopy();
    })

    it("should return 0x0 address before successful token claim", async function () {
      let vestingContract = await VestingControllerInstance.getVestingContract(startingRecords[1].useraddress);
      expect(vestingContract).to.be.equal("0x0000000000000000000000000000000000000000");
    });

    it("should return not 0x0 address after successful token claim", async function () {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let vestingContract = await VestingControllerInstance.getVestingContract(startingRecords[1].useraddress);
      expect(vestingContract).to.be.not.equal("0x0000000000000000000000000000000000000000");
    });

    it("contract address returned by getVestingContract has owner set to a caller",async () => {
      await EverdomeInstance.transfer(VestingControllerInstance.address, startingRecords[1].everamount);
      await VestingControllerInstance.initialize(start+1);
      await provider.send("evm_setNextBlockTimestamp", [start+ 100]);
      let otherCtx = await VestingControllerInstance.connect(await provider.getSigner(1));
      await TestInstance.transfer(startingRecords[1].useraddress,startingRecords[1].heroamount);

      let tx = await otherCtx.claimTokens(startingRecords[1].everamount, 
        startingRecords[1].heroamount, 
        merkleTreeData[startingRecords[1].useraddress], {
          value:"1000000000000000000"
        });

      let vestingContract = await VestingControllerInstance.getVestingContract(startingRecords[1].useraddress);
     // console.log(vestingContract)
      let ownable = await hre.ethers.getContractAt("Ownable", vestingContract);
      let actual = await ownable.owner();
      expect(actual).to.be.equal(startingRecords[1].useraddress);

    });
  });

  

});
