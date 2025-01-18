use soroban_sdk::{Address, Env, String};

use crate::errors::{ContractError, VaultError};

pub trait IPublicVault {
    fn initialize(
        env: Env,
        admin: Address,
        asset_address: Address,
    ) -> Result<(String, String, u32), ContractError>;
    fn administrator_address(env: &Env) -> Address;
    fn decimals(env: &Env) -> u32;
    fn asset(env: &Env) -> Address;
    fn contract_address(env: &Env) -> Address;
    fn total_assets(env: &Env) -> i128;
    fn total_shares(env: &Env) -> i128;
    fn balance_of(env: &Env, address: Address) -> i128;
    fn convert_to_shares(env: &Env, assets: i128) -> i128;
    fn convert_to_assets(env: &Env, shares: i128) -> i128;
    fn max_deposit(_: &Env, _address: Address) -> i128;
    fn max_mint(_: &Env, _address: Address) -> i128;
    fn max_withdraw(env: &Env, owner: Address) -> i128;
    fn max_redeem(env: &Env, owner: Address) -> i128;
    fn preview_deposit(env: &Env, assets: i128) -> i128;
    fn preview_mint(env: &Env, shares: i128) -> i128;
    fn preview_withdraw(env: &Env, assets: i128) -> i128;
    fn preview_redeem(env: &Env, shares: i128) -> i128;
    fn deposit(
        env: Env,
        assets: i128,
        caller: Address,
        receiver: Address,
    ) -> Result<i128, VaultError>;
    fn mint(env: Env, shares: i128, caller: Address, receiver: Address)
        -> Result<i128, VaultError>;
    fn withdraw(
        env: Env,
        assets: i128,
        caller: Address,
        receiver: Address,
        owner: Address,
    ) -> Result<i128, VaultError>;
    fn redeem(
        env: Env,
        shares: i128,
        caller: Address,
        receiver: Address,
        owner: Address,
    ) -> Result<i128, VaultError>;
    fn approve(
        env: Env,
        owner: Address,
        spender: Address,
        approve_amount: i128,
        expire_in_days: u32,
    ) -> Result<(), VaultError>;
    fn transfer_shares(
        env: Env,
        owner: Address,
        receiver: Address,
        shares_amount: i128,
    ) -> Result<bool, VaultError>;
    fn is_paused(env: Env) -> bool;
    fn pause(env: Env) -> Result<bool, ContractError>;
    fn unpause(env: Env) -> Result<bool, ContractError>;
}
