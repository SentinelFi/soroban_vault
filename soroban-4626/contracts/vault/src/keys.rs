use soroban_sdk::{contracttype, Address};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    AdminAddress,
    AssetAddress,
    AssetName,
    AssetSymbol,
    AssetDecimals,
    TotalShares,
    TotalSharesOf(Address),      // (hodler)
    Allowance(Address, Address), // (owner, spender)
}
