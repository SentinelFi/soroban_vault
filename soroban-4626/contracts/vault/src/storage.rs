use crate::keys::DataKey;
use soroban_sdk::{Address, Env, String};

// Anything stored in instance storage has an archival TTL that is tied to the contract instance itself.
// So, if a contract is live and available, the instance storage is guaranteed to be so, too.
// Instance storage is really useful for global contract data that is shared among all users of the contract.

pub fn has_administrator(e: &Env) -> bool {
    let key = DataKey::AdminAddress;
    e.storage().instance().has(&key)
}

pub fn read_administrator(e: &Env) -> Address {
    let key = DataKey::AdminAddress;
    e.storage().instance().get(&key).unwrap()
}

pub fn write_administrator(e: &Env, address: &Address) {
    let key = DataKey::AdminAddress;
    e.storage().instance().set(&key, address);
}

pub fn write_asset_address(e: &Env, address: &Address) {
    let key = DataKey::AssetAddress;
    e.storage().instance().set(&key, address);
}

pub fn write_asset_name(e: &Env, name: &String) {
    let key = DataKey::AssetName;
    e.storage().instance().set(&key, name);
}

pub fn write_asset_symbol(e: &Env, symbol: &String) {
    let key = DataKey::AssetSymbol;
    e.storage().instance().set(&key, symbol);
}

pub fn write_asset_decimals(e: &Env, decimals: &u32) {
    let key = DataKey::AssetDecimals;
    e.storage().instance().set(&key, decimals);
}

pub fn write_total_shares(e: &Env, shares: &i128) {
    let key = DataKey::TotalShares;
    e.storage().persistent().set(&key, shares);
}

#[allow(dead_code)]
pub fn write_total_shares_of(e: &Env, adress: Address, shares: &i128) {
    let key = DataKey::TotalSharesOf(adress);
    e.storage().persistent().set(&key, shares);
}

pub fn read_asset_decimals(e: &Env) -> u32 {
    let key = DataKey::AssetDecimals;
    e.storage().instance().get(&key).unwrap()
}

pub fn read_asset_address(e: &Env) -> Address {
    let key = DataKey::AssetAddress;
    e.storage().instance().get(&key).unwrap()
}

pub fn read_total_shares(e: &Env) -> i128 {
    let key = DataKey::TotalShares;
    e.storage().persistent().get(&key).unwrap()
}

pub fn read_total_shares_of(e: &Env, address: Address) -> i128 {
    let key = DataKey::TotalSharesOf(address);
    e.storage().persistent().get(&key).unwrap_or(0)
}
