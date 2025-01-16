# Soroban Vault

---

First and foremost, setup development environment:

https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup

https://okashi.dev/

---

Identity (address):

```
stellar keys generate --global bob --network testnet --fund

stellar keys address bob

stellar keys show bob
```

Contract:

```
stellar contract build

stellar contract optimize --wasm target/wasm32-unknown-unknown/release/vault.wasm

stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/vault.optimized.wasm `
  --source bob `
  --network testnet

// Copy-paste deployed contract address, bob's (or similar) address and underlying asset address:

stellar contract invoke --id <contract_address> --source bob --network testnet -- initialize --admin <admin_address> --asset_address <asset_address>
```

---

USDC asset example:

https://www.circle.com/multi-chain-usdc/stellar

Testnet contract address: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

Mainnet contract address: CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75

---

Query asset contract IDs:

```
// Testnet USDC
stellar contract id asset --network testnet --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
// CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

// Mainnet USDC
stellar contract id asset --network mainnet --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
// CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75

// Testnet XLM
stellar contract id asset --network testnet --asset native
// CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

// Mainnet XLM
stellar contract id asset --network mainnet --asset native
// CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA
```

---

Token Interface:

https://developers.stellar.org/docs/tokens/token-interface

```
pub trait TokenInterface
```

(SAC) Stellar Asset Contract:

https://developers.stellar.org/docs/tokens/stellar-asset-contract

https://developers.stellar.org/docs/build/guides/tokens

```
pub trait StellarAssetInterface
```

---

Recommendation. Use Freighter wallet extension for testing:

https://www.freighter.app/

Import accounts, enable trust lines, swap assets.

---
