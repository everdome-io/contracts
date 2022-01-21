import { ContractReceipt } from "@ethersproject/contracts";
import { Signer } from "ethers";
import { Tools } from "../typechain";
const { ethers } = require("hardhat");

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
  
  export interface MerkleRecord {
    heroamount:string,
    everamount:string,
    useraddress:string,
  }

  export type ReservedNames = 'root';

  export type MerkleTreeData = {
    [key:Exclude<string,ReservedNames>]:string[],
  } & {
    [key in ReservedNames] : string
  };

  const generateWhiteListData = async function(signers : Signer[]) : Promise<Array<MerkleRecord>>{
    let adresses = await Promise.all(signers.map(x=>x.getAddress()));
    let records =  adresses.map((x,idx)=>{
        return{
        everamount:(10000000+idx).toString(),
        heroamount:(333330+idx).toString(),
        useraddress:x
      }
    })
    return records;
  }
  
  const computeHash = async function(records : Array<MerkleRecord>, toolsC : Tools) : Promise<MerkleTreeData> {
    let levels : string[][]
    let merkleProofs : any = {};
    levels = [];
    
    let hashes = await Promise.all(records.map(async x=>{
      return ( await toolsC.hashLeaf(x.everamount,x.heroamount,x.useraddress) ) as string;
    }));
    levels.push(hashes);
    while(levels[levels.length-1].length > 1){
      let arrayToHash = levels[levels.length-1];
      let numberOfPairs = Math.floor((arrayToHash.length - 1) / 2) + 1;
      let nextLevel : string[] = [] ;
  
      for(let i =0;i<numberOfPairs;i++){
        let nextElement : string;
        if(i === numberOfPairs-1 && arrayToHash.length % 2 === 1){
          nextElement = await toolsC.hashSingle(arrayToHash[arrayToHash.length-1]);
        }else{
          nextElement = await toolsC.hashNodes(arrayToHash[i*2],arrayToHash[i*2+1]);
        }
        nextLevel.push(nextElement);
      }
  
      levels.push(nextLevel);
    }
  
    records.forEach((x,idx)=>{
      merkleProofs[x.useraddress] = levels.filter(x=>x.length>1).map((x, lvl)=>{
        const baseIndex = Math.floor(idx/Math.pow(2,lvl)) ;
        const siblingIndex = baseIndex+(1-2*(baseIndex%2));
        return siblingIndex>=x.length?"0x0000000000000000000000000000000000000000000000000000000000000000":x[siblingIndex]
      })
    });

    return {
      root : levels[levels.length-1][0],
      ...merkleProofs
    }
    
  }

export {
  getEvents,
  generateWhiteListData,
  computeHash
}  