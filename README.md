# Everdome
Just a token for now in future distributor and staking Smart Contract

## Description

This is typescript hardhat project containing Smart Contracts and Tests of Everdome


## Testing

in other terminal in same folder

```shell
yarn
```
Then in main terminal

```shell
npx hardhat compile
npx hardhat test
npx hardhat coverage
```


## Deployment

To deploy on testnet run following command:
```shell
 npx hardhat run scripts/deployment/deploy.ts --network bsctest
```

To deploy on mainnet run following command:
```shell
 npx hardhat run scripts/deployment/deploy.ts --network bsc
```

keep in mind that in both cases `.env` file needs to exist in main directory with content similar to .env.example
just with proper private key and RPC urls



