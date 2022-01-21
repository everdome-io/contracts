// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
import { Tools } from "../../typechain";
import { 
  computeHash, MerkleTreeData
  } from "../utils";
import {
  whitelistData
} from "./usersData/data"



async function generateData() : Promise<MerkleTreeData>{
  const Tools = await hre.ethers.getContractFactory("Tools");
  const tools = await Tools.deploy();
  const toolsInstance = await tools.deployed();
  console.log("Computing rootHash");
  let rootHash = await computeHash(whitelistData,
    toolsInstance as Tools);
  console.log("Computed rootHash",rootHash.root);
  return rootHash;
}

async function main() {
  const result = await generateData();

const fs = require('fs');
const content = JSON.stringify(result).replace("\]","\]\r\n");
  fs.writeFile('helloworld.txt', content, function (err  : any) {
    if (err) return console.log(err);
    console.log('Hello World > helloworld.txt');
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
