// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const axios = require('axios');

const usersAdresses = require('../deployment/usersData/adresses.json');

async function generateData() : Promise<any>{

  let token = await hre.ethers.getContractAt("IBEP20", "0xd40bedb44c081d2935eeba6ef5a3c8a31a1bbe13");
  let retVal : any[] = [];
  let promises : any[] = [];
  for(let i=0;i<usersAdresses.length;i++){

    promises.push({
      account:usersAdresses[i],
      promise:token.balanceOf(usersAdresses[i])
    });
    let results : any [];

    if(i%10==9){

      try{

        
        results = await Promise.all(promises.map(x=>x.promise));
        const elements = promises.map((x,idx)=>{
          return {
            account:x.account,
            balance:results[idx].toString()
          }
        })
        promises = [];
        retVal.push(...elements);
      }catch(err){
        i = i - 10;
        console.log("retry");
      }
    }
    let rec :any = {};
    if(i%100==0) console.log(i,usersAdresses.length);
  }
  return retVal;
}

async function main() {
  const result = await generateData();

const fs = require('fs');
const content = JSON.stringify(result).replace(",",",\r\n");
  fs.writeFile('12947484.json', content, function (err  : any) {
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
