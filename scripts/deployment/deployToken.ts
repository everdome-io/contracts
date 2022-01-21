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
  import {
    merkleProofs
  } from "./usersData/merkleProofs"



async function generateData() : Promise<MerkleTreeData>{
  const Tools = await hre.ethers.getContractFactory("Tools");
  const tools = await Tools.deploy();
  const toolsInstance = await tools.deployed();
  console.log("Computing rootHash");
  let rootHash = await computeHash(whitelistData,
    toolsInstance as Tools);
  console.log("Computed rootHash",rootHash);
  return rootHash;
}

async function main() {

  const provider = hre.ethers.provider;
  const signer = await provider.getSigner(0);
  const addr = await signer.getAddress();
  console.log('Deployer address:',addr);
  const Everdome = await hre.ethers.getContractFactory("Everdome");
  const rootHash = merkleProofs.root;
  const VestingController = await hre.ethers.getContractFactory("VestingController");
  const decimals = 18;
  const totalSupply = "100000000000";
  const tokenPrice = "19768000000000";
  console.log("Deploying Everdome....");
  const instance = await Everdome.deploy(addr ,totalSupply, decimals);
  const everdomeInstance = await instance.deployed(); 
  console.log("Token created", everdomeInstance.address);
  
  await everdomeInstance.setAdmin(process.env.OWNER_PUBLIC_KEY);
  console.log("Admin added");

  await everdomeInstance.transfer(process.env.OWNER_PUBLIC_KEY, await everdomeInstance.balanceOf(addr));
  console.log("Tokens transfered");

  await everdomeInstance.transferOwnership(process.env.OWNER_PUBLIC_KEY);
  console.log("Ownership transfered");

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
