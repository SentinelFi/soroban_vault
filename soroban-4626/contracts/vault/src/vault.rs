// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC4626.sol

use soroban_sdk::{
    contract, contractimpl, contractmeta, symbol_short, token, Address, Env, String,
};

use crate::{
    errors::{ContractError, VaultError},
    ivault::IPublicVault,
    keys::DataKey,
    math::{mul_div, safe_add, safe_mul, safe_pow, Rounding},
    storage::{
        has_administrator,
        read_administrator,
        read_asset_address,
        read_asset_decimals,
        read_total_shares,
        read_total_shares_of,
        write_administrator,
        write_asset_address,
        write_asset_decimals,
        write_asset_name,
        write_asset_symbol,
        write_total_shares,
        // write_total_shares_of,
    },
};

contractmeta!(
    key = "ERC-4626",
    val = "Implementation of the ERC-4626 Tokenized Vault Standard in Soroban"
);

#[contract]
pub struct Vault;

#[contractimpl]
impl IPublicVault for Vault {
    fn initialize(
        env: Env,
        admin: Address,
        asset_address: Address,
    ) -> Result<(String, String, u32), ContractError> {
        admin.require_auth();

        if has_administrator(&env) {
            Err(ContractError::AlreadyInitialized)
        } else {
            // Before passing asset_address, verify the underlying asset contract exists and implements the token trait, otherwise initialization will fail
            let token_client = token::Client::new(&env, &asset_address);
            let name: String = token_client.name();
            let symbol: String = token_client.symbol();
            let decimals: u32 = token_client.decimals();

            // Underlying asset, e.g. USDC or XLM
            write_asset_address(&env, &asset_address);
            write_asset_name(&env, &name);
            write_asset_symbol(&env, &symbol);
            write_asset_decimals(&env, &decimals);
            write_total_shares(&env, &0i128);
            write_administrator(&env, &admin);

            Ok((name, symbol, decimals))
        }
    }

    fn administrator_address(env: &Env) -> Address {
        read_administrator(&env)
    }

    fn decimals(env: &Env) -> u32 {
        let decimals: u32 = read_asset_decimals(&env);
        let result: u32 = safe_add(decimals, Self::decimals_offset());
        result
    }

    fn asset(env: &Env) -> Address {
        let asset_address: Address = read_asset_address(&env);
        asset_address
    }

    fn get_contract_address(env: &Env) -> Address {
        env.current_contract_address()
    }

    fn total_assets(env: &Env) -> i128 {
        let asset_address: Address = read_asset_address(&env);
        let token_client = token::Client::new(&env, &asset_address);
        let this_address: Address = Self::get_contract_address(&env);
        let balance: i128 = token_client.balance(&this_address);
        balance
    }

    fn total_shares(env: &Env) -> i128 {
        let total_shares: i128 = read_total_shares(&env);
        total_shares
    }

    fn balance_of(env: &Env, address: Address) -> i128 {
        address.require_auth();
        let balance: i128 = read_total_shares_of(&env, address.clone());
        balance
    }

    fn convert_to_shares(env: &Env, assets: i128, rounding: Rounding) -> i128 {
        Self::_convert_to_shares(env, assets, rounding)
    }

    fn convert_to_assets(env: &Env, shares: i128, rounding: Rounding) -> i128 {
        Self::_convert_to_assets(env, shares, rounding)
    }

    fn max_deposit(_: &Env, _adress: Address) -> i128 {
        i128::MAX
    }

    fn max_mint(_: &Env, _adress: Address) -> i128 {
        i128::MAX
    }

    fn max_withdraw(env: &Env, owner: Address) -> i128 {
        let balance: i128 = Self::balance_of(&env, owner);
        Self::_convert_to_assets(&env, balance, Rounding::Floor)
    }

    fn max_redeem(env: &Env, owner: Address) -> i128 {
        Self::balance_of(&env, owner)
    }

    fn preview_deposit(env: &Env, assets: i128) -> i128 {
        Self::convert_to_shares(&env, assets, Rounding::Floor)
    }

    fn preview_mint(env: &Env, shares: i128) -> i128 {
        Self::convert_to_assets(&env, shares, Rounding::Ceil)
    }

    fn preview_withdraw(env: &Env, assets: i128) -> i128 {
        Self::convert_to_shares(&env, assets, Rounding::Ceil)
    }

    fn preview_redeem(env: &Env, shares: i128) -> i128 {
        Self::convert_to_assets(&env, shares, Rounding::Floor)
    }

    fn deposit(
        env: Env,
        assets: i128,
        caller: Address,
        receiver: Address,
    ) -> Result<i128, VaultError> {
        caller.require_auth();
        if assets <= 0 {
            Err(VaultError::ZeroAssets)
        } else {
            let max_assets: i128 = Self::max_deposit(&env, receiver.clone());
            if assets > max_assets {
                Err(VaultError::ERC4626ExceededMaxDeposit)
            } else {
                let shares: i128 = Self::preview_deposit(&env, assets);
                Self::_deposit(&env, &caller, &receiver, assets, shares);
                Ok(shares)
            }
        }
    }

    fn mint(
        env: Env,
        shares: i128,
        caller: Address,
        receiver: Address,
    ) -> Result<i128, VaultError> {
        caller.require_auth();
        if shares <= 0 {
            Err(VaultError::ZeroShares)
        } else {
            let max_shares: i128 = Self::max_mint(&env, receiver.clone());
            if shares > max_shares {
                Err(VaultError::ERC4626ExceededMaxMint)
            } else {
                let assets: i128 = Self::preview_mint(&env, shares);
                Self::_deposit(&env, &caller, &receiver, assets, shares);
                Ok(assets)
            }
        }
    }

    fn withdraw(
        env: Env,
        assets: i128,
        caller: Address,
        receiver: Address,
        owner: Address,
    ) -> Result<i128, VaultError> {
        caller.require_auth();
        if assets <= 0 {
            Err(VaultError::ZeroAssets)
        } else {
            let max_assets: i128 = Self::max_withdraw(&env, owner.clone());
            if assets > max_assets {
                Err(VaultError::ERC4626ExceededMaxWithdraw)
            } else {
                let shares: i128 = Self::preview_withdraw(&env, assets);
                Self::_withdraw(&env, &caller, &receiver, &owner, assets, shares);
                Ok(shares)
            }
        }
    }

    fn redeem(
        env: Env,
        shares: i128,
        caller: Address,
        receiver: Address,
        owner: Address,
    ) -> Result<i128, VaultError> {
        caller.require_auth();
        if shares <= 0 {
            Err(VaultError::ZeroShares)
        } else {
            let max_shares: i128 = Self::max_redeem(&env, owner.clone());
            if shares > max_shares {
                Err(VaultError::ERC4626ExceededMaxRedeem)
            } else {
                let assets: i128 = Self::preview_redeem(&env, shares);
                Self::_withdraw(&env, &caller, &receiver, &owner, assets, shares);
                Ok(assets)
            }
        }
    }
}

#[allow(dead_code)]
impl Vault {
    fn transfer(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
    ) -> Result<(Address, Address, i128, u32, i128), VaultError> {
        from.require_auth();
        if amount <= 0 {
            Err(VaultError::InvalidAmount)
        } else {
            let decimals: u32 = read_asset_decimals(&env);

            let result_pow: i128 = safe_pow(10i128, decimals);
            let result: i128 = safe_mul(amount, result_pow);

            let asset_address: Address = env
                .storage()
                .persistent()
                .get(&DataKey::AssetAddress)
                .unwrap();

            let token_client = token::Client::new(&env, &asset_address);
            token_client.transfer(&from, &to, &result);

            // Emit some event?

            Ok((from, to, amount, decimals, result))
        }
    }

    fn _convert_to_shares(env: &Env, assets: i128, rounding: Rounding) -> i128 {
        mul_div(
            assets,
            Self::total_shares(env) + safe_pow(10, Self::decimals_offset()),
            Self::total_assets(env) + 1,
            rounding,
        )
    }

    fn _convert_to_assets(env: &Env, shares: i128, rounding: Rounding) -> i128 {
        mul_div(
            shares,
            Self::total_assets(env) + 1,
            Self::total_shares(env) + safe_pow(10, Self::decimals_offset()),
            rounding,
        )
    }

    fn _deposit(
        _env: &Env,
        _caller: &Address,
        _receiver: &Address,
        _assets: i128,
        _shares: i128,
    ) -> () {
        // Transfer Assets
        // Mint Shares
        // Emit Event
    }

    fn _withdraw(
        _env: &Env,
        _caller: &Address,
        _receiver: &Address,
        _owner: &Address,
        _assets: i128,
        _shares: i128,
    ) -> () {
        // Spend Allowance
        // Burn Shares
        // Transfer Assets
        // Emit Event
    }

    fn emit_deposit_event(
        env: &Env,
        caller: Address,
        receiver: Address,
        assets: i128,
        shares: i128,
    ) {
        let topics = (symbol_short!("deposit"), caller, receiver);
        env.events().publish(topics, (assets, shares));
    }

    fn emit_withdraw_event(
        env: &Env,
        caller: Address,
        receiver: Address,
        owner: Address,
        assets: i128,
        shares: i128,
    ) {
        let topics = (symbol_short!("withdraw"), caller, receiver, owner);
        env.events().publish(topics, (assets, shares));
    }

    fn decimals_offset() -> u32 {
        0
    }
}
