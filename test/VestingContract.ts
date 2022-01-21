import { HeroTest, VestingContract } from "../typechain";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
const hre = require("hardhat");

const chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");

const expect = chai.expect;

describe("VestingContract", async function () {
  let TestInstance : HeroTest;
  let VestingContractInstance : VestingContract;
  let deployer : Signer;
  let deployerAddr : string;
  let owner : Signer;
  let provider : any;
  let start : number;
  let ownerAddress : string;
  const desiredMaxAmount : number = 1000;

  this.beforeAll(async function () {
    let HeroTest = await ethers.getContractFactory("HeroTest");
    let op = await HeroTest.deploy();
    provider = hre.ethers.provider;
    TestInstance = await op.deployed();
    deployer = await provider.getSigner(0);
    deployerAddr = await deployer.getAddress();
    owner = await provider.getSigner(0);
    ownerAddress = await deployer.getAddress();
  });

  describe("constructor", async function () {
    this.beforeAll(async function () {
      let VestingContract = await ethers.getContractFactory("VestingContract");
      let deployment = await VestingContract.deploy(desiredMaxAmount, TestInstance.address, ownerAddress);
      start = (await provider.getBlock(deployment.deployTransaction.blockNumber)).timestamp;
      VestingContractInstance = await deployment.deployed();
    
    })
  
    it("should have correct token address", async function () {
      let address = await VestingContractInstance.everdomeToken();
      expect(address).to.be.equal(TestInstance.address);
    });
    it("should have correct maxAmount", async function () {
      let _setMax = await VestingContractInstance.maxAmount();
      expect(_setMax).to.be.equal(desiredMaxAmount);
    });
    it("should have correct owner", async function () {
      let _owner = await VestingContractInstance.owner();
      expect(ownerAddress).to.be.equal(_owner);
    });
    it("should have correct start", async function () {
      let _start = await VestingContractInstance.start();
      expect(start).to.be.equal(_start.toNumber());
    });
  });

  describe("amountAvailableToBuy",async function(){
    
    this.beforeEach(async function () {
      let VestingContract = await ethers.getContractFactory("VestingContract");
      let deployment = await VestingContract.deploy(desiredMaxAmount, TestInstance.address, ownerAddress);
      VestingContractInstance = await deployment.deployed();
    })

    it("should return maxAmount if no tokens on contract", async function () {
      let _available = await VestingContractInstance.amountAvailableToBuy();
      expect(_available).to.be.equal(desiredMaxAmount);
    });

    it("should deduce tokens available on contract from maxAmount", async function () {
      const amountToDeduce = 100;
      await TestInstance.transfer(VestingContractInstance.address, amountToDeduce);
      let _available = await VestingContractInstance.amountAvailableToBuy();
      expect(_available).to.be.equal(desiredMaxAmount-amountToDeduce);
    });

    it("should not change after withdraw",async () => {
      const amountToDeduce = 100;
      await TestInstance.transfer(VestingContractInstance.address, amountToDeduce);
      const _availableBefore = await VestingContractInstance.amountAvailableToBuy();
      const _balanceBefore = await TestInstance.balanceOf(VestingContractInstance.address);
      const _withdrawnBefore = await VestingContractInstance.withdrawn();
      await VestingContractInstance.widthdrawAvailable();
      const _availableAfter = await VestingContractInstance.amountAvailableToBuy();
      const _withdrawnAfter = await VestingContractInstance.withdrawn();
      const _balanceAfter = await TestInstance.balanceOf(VestingContractInstance.address);
      expect(_availableBefore.toNumber()).to.be.equal(_availableAfter.toNumber());
      expect(_balanceBefore.toNumber()).to.be.equal(_balanceAfter.toNumber()+_withdrawnAfter.toNumber()-_withdrawnBefore.toNumber());
    })
  })

  describe("amountAvailableToWithdraw",async function(){
    this.beforeEach(async function () {
      let VestingContract = await ethers.getContractFactory("VestingContract");
      let deployment = await VestingContract.deploy(desiredMaxAmount, TestInstance.address, ownerAddress);
      VestingContractInstance = await deployment.deployed();
    })
    it("should be 5% of vesting contract balance after contract creation",async () => {
      await TestInstance.transfer(VestingContractInstance.address, desiredMaxAmount);
      const _balanceBefore = await TestInstance.balanceOf(VestingContractInstance.address);
      const _availableBefore = await VestingContractInstance.amountAvailableToWithdraw();
      expect(_availableBefore.toNumber()).to.be.equal(_balanceBefore.toNumber()*5/100);
    });
    it("should be 9% after 2 weeks passed", async ()=>{
      let _start = await VestingContractInstance.start();
      await TestInstance.transfer(VestingContractInstance.address, desiredMaxAmount);
      const _balanceBefore = await TestInstance.balanceOf(VestingContractInstance.address);
      await provider.send("evm_setNextBlockTimestamp", [_start.toNumber()+2*7*24*3600+1]);
      await provider.send("evm_mine")
      const _availableAfter = await VestingContractInstance.amountAvailableToWithdraw();
      expect(_availableAfter.toNumber()).to.be.equal(desiredMaxAmount*9/100);
    });
    it("should be 100% after 48 weeks passed", async ()=>{
      let _start = await VestingContractInstance.start();
      await TestInstance.transfer(VestingContractInstance.address, desiredMaxAmount);
      const _balanceBefore = await TestInstance.balanceOf(VestingContractInstance.address);
      await provider.send("evm_setNextBlockTimestamp", [_start.toNumber()+48*7*24*3600+1]);
      await provider.send("evm_mine")
      const _availableAfter = await VestingContractInstance.amountAvailableToWithdraw();
      expect(_availableAfter.toNumber()).to.be.equal(desiredMaxAmount);
    });
    it("should be 0 after withdraw",async () => {
      await TestInstance.transfer(VestingContractInstance.address, desiredMaxAmount);
      const _balanceBefore = await TestInstance.balanceOf(VestingContractInstance.address);
      await VestingContractInstance.widthdrawAvailable();
      const _availableAfter = await VestingContractInstance.amountAvailableToWithdraw();
      expect(_availableAfter.toNumber()).to.be.equal(0);
      expect(_balanceBefore.toNumber()).to.be.not.equal(0);
    });


  });

  describe("pull",async function() {
    this.beforeEach(async function () {
      let VestingContract = await ethers.getContractFactory("VestingContract");
      let deployment = await VestingContract.deploy(desiredMaxAmount, TestInstance.address, ownerAddress);
      VestingContractInstance = await deployment.deployed();
    })

    it("should revert if called with amount exceeding maxAmount", async function () {
      const promise = VestingContractInstance.pull(desiredMaxAmount+1);
      await expect(promise).to.be.revertedWith("over-buy-limit");
    });

    it("should transfer requested amount from caller to contract", async function () {
      const amountToPull = 100;
      await TestInstance.approve(VestingContractInstance.address, amountToPull);
      const _balance1Before = await TestInstance.balanceOf(VestingContractInstance.address);
      const _balance2Before = await TestInstance.balanceOf(deployerAddr);
      await VestingContractInstance.pull(amountToPull);
      const _balance1After = await TestInstance.balanceOf(VestingContractInstance.address);
      const _balance2After = await TestInstance.balanceOf(deployerAddr);
      expect(_balance1After.toNumber()-amountToPull).to.be.equal(_balance1Before.toNumber())
      expect(_balance2After.toNumber()+amountToPull).to.be.equal(_balance2Before.toNumber())
    });
    
  });

});
