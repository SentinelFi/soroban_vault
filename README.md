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

Copy-paste deployed contract address, bob's (or similar) address and underlying asset address:

stellar contract invoke --id <contract_address> --source bob --network testnet -- initialize --admin <admin_address> --asset_address <asset_address>

```

---

USDC asset example:

https://www.circle.com/multi-chain-usdc/stellar

Testnet contract address: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

Mainnet contract address: CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75

---

Recommendation. Use Freighter wallet extension for testing:

https://www.freighter.app/

Import accounts, enable trust lines, swap assets.

---
