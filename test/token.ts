import { ContractReceipt } from "@ethersproject/contracts";
import { Everdome } from "../typechain";
import { solidity } from "ethereum-waffle";
import { Signer } from "ethers";
const hre = require("hardhat");

const chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");

const expect = chai.expect;

const getEvents = function (
  txResult: ContractReceipt,
  eventAbi: string,
  eventName: string
) {
  let abi = [eventAbi];
  let iface = new ethers.utils.Interface(abi);
  let events = txResult.events ? txResult.events : [];

  let filteredEvents = events.filter((x) => {
    return x.topics[0] == iface.getEventTopic(eventName);
  });
  return filteredEvents;
};

describe("Everdome", async function () {
  let EverdomeInstance: Everdome;
  let testSupply = 1000000;
  let deployerAddr: string;
  this.beforeAll(async function () {
    const decimals = 6;
    const provider = hre.ethers.provider;
    const signer = await provider.getSigner(0);
    deployerAddr = await signer.getAddress();
    console.log("Deployer address:",deployerAddr);
    let Everdome = await ethers.getContractFactory("Everdome");
    let op = await Everdome.deploy(deployerAddr, testSupply, decimals);
    EverdomeInstance = await op.deployed();
  });

  describe("constructor", async function () {
    it("should have name Everdome", async function () {
      let name = await EverdomeInstance.name();
      expect(name).to.be.equal("Everdome");
    });
    it("should have symbol DOME", async function () {
      let symbol = await EverdomeInstance.symbol();
      expect(symbol).to.be.equal("DOME");
    });
    it("should have symbol DOME", async function () {
      let symbol = await EverdomeInstance.symbol();
      expect(symbol).to.be.equal("DOME");
    });
    it("should send balance to specified address", async function () {
      let supply = await EverdomeInstance.totalSupply();
      let ownerBalance = await EverdomeInstance.balanceOf(
        deployerAddr as string
      );
      console.log(
        "Supply",
        supply.toString(),
        "ownerSupply",
        ownerBalance.toString()
      );
      expect(supply).to.be.equal(ownerBalance);
    });
  });

  describe("transfer", async function () {
    let admin: string;
    let adminSigner : Signer
    let whitelisted: string;
    let whitelistedSigner : Signer
    let whitelisted2: string;
    let whitelisted2Signer : Signer
    let notWhitelisted: string;
    let notWhitelistedSigner : Signer
    this.beforeAll(async function () {
      const provider = hre.ethers.provider;
      adminSigner = await provider.getSigner(0);
      whitelistedSigner = await provider.getSigner(1);
      whitelisted2Signer = await provider.getSigner(2);
      notWhitelistedSigner = await provider.getSigner(3);
      admin = await adminSigner.getAddress();
      whitelisted = await whitelistedSigner.getAddress();
      whitelisted2 = await whitelisted2Signer.getAddress();
      notWhitelisted = await notWhitelistedSigner.getAddress();
      let senderInitialBalance = await EverdomeInstance.balanceOf(deployerAddr);
      await EverdomeInstance.transfer(await whitelistedSigner.getAddress(), senderInitialBalance.div(2));
      EverdomeInstance = await EverdomeInstance.connect(adminSigner);
      await EverdomeInstance.setWhitelisted(whitelisted);
    });

    it("whitelisted user can send tokens from sender to reciver", async function () {
      EverdomeInstance = await EverdomeInstance.connect(whitelistedSigner);
      let senderInitialBalance = await EverdomeInstance.balanceOf(whitelisted);
      let reciverInitialBalance = await EverdomeInstance.balanceOf(notWhitelisted);
      expect(senderInitialBalance).to.be.not.equal(reciverInitialBalance);
      let tx = await EverdomeInstance.transfer(notWhitelisted, senderInitialBalance);
      await tx.wait();
      let senderFinalBalance = await EverdomeInstance.balanceOf(whitelisted);
      let reciverFinalBalance = await EverdomeInstance.balanceOf(notWhitelisted);
      expect(reciverInitialBalance.add(senderInitialBalance)).to.be.equal(reciverFinalBalance);
      expect(senderFinalBalance).to.be.equal(0);
    });

    describe("transfer Restrictions",async function(){
      describe("setting and clearing admin",async function(){
        it("should have admin set as admin", async function (){
          let status = await EverdomeInstance.isAdmin(admin);
          expect(status).to.be.true;
        })
        it("should have others not set as admin", async function (){
          let status = await EverdomeInstance.isAdmin(whitelisted);
          expect(status).to.be.false;
          status = await EverdomeInstance.isAdmin(whitelisted2);
          expect(status).to.be.false;
          status = await EverdomeInstance.isAdmin(notWhitelisted);
          expect(status).to.be.false;
        })
        it("should deny notAdmin to set admin",async function(){
          EverdomeInstance = await EverdomeInstance.connect(whitelistedSigner);
          let tx = EverdomeInstance.setAdmin(notWhitelisted);
          await expect(tx).to.be.revertedWith("only-admin");
        });
        it("should allow admin to set admin",async function(){
          EverdomeInstance = await EverdomeInstance.connect(adminSigner);
          let tx = await EverdomeInstance.setAdmin(notWhitelisted);
          let status = await EverdomeInstance.isAdmin(notWhitelisted);
          expect(status).to.be.true;
          tx = await EverdomeInstance.removeAdmin(notWhitelisted);
          status = await EverdomeInstance.isAdmin(notWhitelisted);
          expect(status).to.be.false;
        });
      });
      describe("setting and clearing whitelisted",async function(){
        it("should allow admin to set whitelisted", async function() {
          let status = await EverdomeInstance.isWhitelisted(whitelisted2);
          expect(status).to.be.false;
          EverdomeInstance = await EverdomeInstance.connect(adminSigner);
          let tx = await EverdomeInstance.setWhitelisted(whitelisted2);
          status = await EverdomeInstance.isWhitelisted(whitelisted2);
          expect(status).to.be.true;
        })
        it("should deny whitelisted to set whitelisted", async function() {
          let status = await EverdomeInstance.isWhitelisted(notWhitelisted);
          expect(status).to.be.false;
          status = await EverdomeInstance.isWhitelisted(whitelisted);
          expect(status).to.be.true;
          EverdomeInstance = await EverdomeInstance.connect(whitelistedSigner);
          let tx = EverdomeInstance.setWhitelisted(notWhitelisted);
          await expect(tx).to.be.revertedWith("only-admin")
        })
      })
      
    });

    it("not whitelisted user can not send tokens",async function() {
      EverdomeInstance = await EverdomeInstance.connect(notWhitelistedSigner);
      let senderInitialBalance = await EverdomeInstance.balanceOf(notWhitelisted);
      let tx = EverdomeInstance.transfer(admin, senderInitialBalance);
      await expect(tx).to.be.revertedWith("transfers-locked");
    })

    
    describe("preventing clearing lock",async function (){
      this.beforeAll(async function () {
        EverdomeInstance = await EverdomeInstance.connect(adminSigner);
        await EverdomeInstance.clearLocked();  
      });
      it("lock cannot be cleared by not admin",async function() {
        EverdomeInstance = await EverdomeInstance.connect(whitelistedSigner);
        let tx = EverdomeInstance.clearLocked(); 
        await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
      })
    })

    describe("after clearing lock",async function (){
      this.beforeAll(async function () {
        EverdomeInstance = await EverdomeInstance.connect(adminSigner);
        await EverdomeInstance.clearLocked();  
      });
      it("not whitelisted user can send tokens to others",async function() {
        EverdomeInstance = await EverdomeInstance.connect(notWhitelistedSigner);
        let senderInitialBalance = await EverdomeInstance.balanceOf(notWhitelisted);
        let tx = await EverdomeInstance.transfer(admin, senderInitialBalance);
      })
    })
  });
});
