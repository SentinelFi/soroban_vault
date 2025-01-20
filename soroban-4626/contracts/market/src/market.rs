// Official workspace example: https://github.com/stellar/soroban-examples/tree/v22.0.1/workspace
// use vault::{ivault::IPublicVault, vault::VaultContractClient};

// Official cross-contract example (not needed here): https://github.com/stellar/soroban-examples/tree/v22.0.1/cross_contract
// mod vault {
//     soroban_sdk::contractimport!(
//         file = "../../target/wasm32-unknown-unknown/release/vault.optimized.wasm"
//     );
// }
use soroban_sdk::{contract, contractimpl, contractmeta /*Address, Env*/};

contractmeta!(
    key = "Market Maker",
    val = "Implementation of the Market Maker using vaults in Soroban"
);

#[contract]
pub struct MarketContract;

#[allow(dead_code)]
#[contractimpl]
impl MarketContract {
    // pub fn create_vault(env: Env, contract_address: Address, asset_address: Address) -> () {
    //     let vault_contract = VaultContractClient::new(&env, &contract_address);
    //     let owner_address: Address = env.current_contract_address();
    //     vault_contract.initialize(&owner_address, &asset_address);
    // }
}

// #[contractimpl]
// impl IPublicVault for MarketContract {
// }
