-----

## Market Maker Commands

Bash:
```console
cd soroban-4626

stellar contract build

stellar contract optimize --wasm target/wasm32-unknown-unknown/release/vault.wasm

stellar contract optimize --wasm target/wasm32-unknown-unknown/release/market.wasm

// Deploy two vault contracts, hedge and risk

stellar contract deploy \
  --wasm "target/wasm32-unknown-unknown/release/vault.optimized.wasm" \
  --source bob \
  --network testnet

// Deploy market maker contract

stellar contract deploy \
  --wasm "target/wasm32-unknown-unknown/release/market.optimized.wasm" \
  --source bob \
  --network testnet

// Initialize market maker

stellar contract invoke \
  --id market_contract_id_here \
  --source bob \
  --network testnet \
  -- init \
  --data '
    {
      "name": "test", 
      "description": "desc", 
      "admin_address": "GD...",
      "asset_address": "CB...",
      "trusted_oracle_address": "GD...",
      "trusted_oracle_name": "some",
      "hedge_vault_address": "CD...",
      "risk_vault_address": "CD...",
      "commission_fee": 10,
      "risk_score": 1,
      "is_automatic": true,
      "event_unix_timestamp": 1737711000,
      "lock_period_in_seconds": 600,
      "event_threshold_in_seconds": 600,
      "unlock_period_in_seconds": 600
    }'

```

PowerShell:
```console
cd soroban-4626

stellar contract build

stellar contract optimize --wasm target/wasm32-unknown-unknown/release/vault.wasm

stellar contract optimize --wasm target/wasm32-unknown-unknown/release/market.wasm

// Deploy two vault contracts, hedge and risk:

stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/vault.optimized.wasm `
  --source bob `
  --network testnet

// Deploy market maker contract:

stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/market.optimized.wasm `
  --source bob `
  --network testnet

```

Unix Timestamp Converter, example: https://www.unixtimestamp.com/

Invoke contract functions:

```console
stellar contract invoke --id market_contract_address_here --source bob --network testnet -- status

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- name

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- description

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- admin_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- current_contract_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- current_ledger

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- underlying_asset_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- hedge_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- risk_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- oracle_address

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- oracle_name

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- change_oracle --oracle_address oracle_address_here --oracle_name oracle_name_here

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- initialized_time

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- expected_time_of_event

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- actual_time_of_event

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- time_until_event

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- lock_period_in_seconds

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- time_until_lock

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- event_threshold_in_seconds

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- unlock_period_in_seconds

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- time_of_lock

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- time_of_unlock

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- time_until_unlock

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- risk_score

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- change_risk_score --risk risk_number_here

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- exercising

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- commission

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- liquidated_time

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- matured_time

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- last_oracle_time

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- last_keeper_time

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- bump --event_occurred false

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- bump --event_occurred false --event_time event_unix_time_here

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- mature

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- liquidate

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- dispute

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- calculate_vault_assets_ratio

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- calculate_vault_shares_ratio

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- calculate_hedge_potential_return --caller caller_address_here

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- calculate_risk_potential_return --caller caller_address_here

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- is_market_paused

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- pause_market

stellar contract invoke --id market_contract_address_here --source bob --network testnet -- unpause_market
```

---
