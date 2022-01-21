import { Tools } from "../typechain";
import { solidity } from "ethereum-waffle";
import {  generateWhiteListData,
  computeHash,
  MerkleRecord,
  MerkleTreeData
  } from "../scripts/utils";
const hre = require("hardhat");

const chai = require("chai");
chai.use(solidity);
const { ethers } = require("hardhat");

const expect = chai.expect;

describe("Tools", async function () {
  let ToolsInstance : Tools;
  let deployerAddr : string;
  let startingRecords : MerkleRecord[];
  let merkleTreeData : MerkleTreeData;
  this.beforeAll(async function () { 
    
    let Tools = await ethers.getContractFactory("Tools");
    let op = await Tools.deploy();
    const provider = hre.ethers.provider;
    ToolsInstance = await op.deployed();
    const signer = await provider.getSigner(0);
    deployerAddr = await signer.getAddress();

    let x = await generateWhiteListData([await provider.getSigner(0),
      await provider.getSigner(1),
      await provider.getSigner(2),
      await provider.getSigner(3),
      await provider.getSigner(4),
    ]);
    startingRecords = x;

  });

  describe("hashLeaf", async function () {
    it("should create hash", async function () {
      const hash = await ToolsInstance.hashLeaf(123,234,deployerAddr);
      expect(hash).to.be.equal("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6");
    });
    it("hash should be unique", async function () {
      const hash = await ToolsInstance.hashLeaf(234,123,deployerAddr);
      expect(hash).to.be.not.equal("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6");
    });
  });


  describe("hashNodes", async function () {
    it("should create hash", async function () {
      const hash = await ToolsInstance.hashNodes("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6","0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f5");
      expect(hash).to.be.equal("0x41fd986df0abad7f8d8d32330fbab222e313e58ac8154d016157a06f0a249c3d");
    });
    it("parameter order should not matter", async function () {
      const hash = await ToolsInstance.hashNodes("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f5","0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6");
      expect(hash).to.be.equal("0x41fd986df0abad7f8d8d32330fbab222e313e58ac8154d016157a06f0a249c3d");
    });
  });

  describe("hashSingle", async function () {
    it("should create hash", async function () {
      const hash = await ToolsInstance.hashSingle("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6");
      expect(hash).to.be.equal("0x91f9f3775502b534abc1e4df66b12478355269611321d0f5c0768498af4d4aa7");
    });
    it("hash should be as other parameter is 0x0", async function () {
      const hash = await ToolsInstance.hashNodes("0xd37d5edb1584a2868fc99c60c6876cbd09b94846368fa35fd6e2885376d599f6","0x0000000000000000000000000000000000000000000000000000000000000000");
      expect(hash).to.be.equal("0x91f9f3775502b534abc1e4df66b12478355269611321d0f5c0768498af4d4aa7");
    });
  });

  describe("merkelisation", async function () {
    this.beforeAll(async () => {
      merkleTreeData = await computeHash(startingRecords, ToolsInstance);
    })
    it("should have root property hash", async function () {
      expect(merkleTreeData.root).to.not.be.undefined;
    });
    it("should have property for every address", async function () {
      const adr1 = await startingRecords[0].useraddress;
      expect(Object.keys(merkleTreeData).find(x=>x == adr1)).to.be.not.undefined;
      const adr2 = await startingRecords[1].useraddress;
      expect(Object.keys(merkleTreeData).find(x=>x == adr2)).to.be.not.undefined;
      const adr3 = await startingRecords[2].useraddress;
      expect(Object.keys(merkleTreeData).find(x=>x == adr3)).to.be.not.undefined;
      const adr4 = await startingRecords[3].useraddress;
      expect(Object.keys(merkleTreeData).find(x=>x == adr4)).to.be.not.undefined;
      const adr5 = await startingRecords[4].useraddress;
      expect(Object.keys(merkleTreeData).find(x=>x == adr5)).to.be.not.undefined;
    });
    describe("nodeVerificationPasses", async function () {
      it("should return true for every merkle proof", async function () {
        const promises = startingRecords.map(x =>
          {
            return ToolsInstance.nodeVerificationPasses(x.everamount,x.heroamount,x.useraddress,merkleTreeData[x.useraddress],merkleTreeData.root)
        });
        const results = await Promise.all(promises);
        results.forEach(x => {
          expect(x).to.be.true;
        });

      });
      it("should return false for every merkle proof if address is different", async function () {
        let x = merkleTreeData.root;
        let y = merkleTreeData.foo;
        const promises = startingRecords.map((x,idx) =>
          {
            return ToolsInstance.nodeVerificationPasses(x.everamount,x.heroamount,idx===0?startingRecords[1].useraddress:startingRecords[0].useraddress,merkleTreeData[x.useraddress],merkleTreeData.root)
        });
        const results = await Promise.all(promises);
        results.forEach(x => {
          expect(x).to.be.false;
        });
      });
      it("should return false for every merkle proof if Everdome amount is different", async function () {
        const promises = startingRecords.map(x =>
          {
            return ToolsInstance.nodeVerificationPasses(x.everamount+1,x.heroamount,x.useraddress,merkleTreeData[x.useraddress],merkleTreeData.root)
        });
        const results = await Promise.all(promises);
        results.forEach(x => {
          expect(x).to.be.false;
        });
      });
      it("should return false for every merkle proof if Base token amount is different", async function () {
        const promises = startingRecords.map(x =>
          {
            return ToolsInstance.nodeVerificationPasses(x.everamount,x.heroamount+1,x.useraddress,merkleTreeData[x.useraddress],merkleTreeData.root)
        });
        const results = await Promise.all(promises);
        results.forEach(x => {
          expect(x).to.be.false;
        });
      });
    });

  })


});
