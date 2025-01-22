/**
 * @notice DISCLAIMER - PLEASE READ CAREFULLY
 * ==========================================
 * This smart contract is provided "as is" and "as available", at your own risk, without warranty of any kind.
 *
 * By deploying, interacting with, or using this smart contract in any way, you acknowledge and agree that:
 * - This code may contain bugs, errors, or security vulnerabilities unknown to the developers
 * - The code may function unexpectedly or become deprecated
 * - You assume all risks associated with using this code including, but not limited to:
 *    - Complete loss of funds or tokens
 *    - Smart contract exploits or vulnerabilities
 *    - Unexpected behavior due to code errors
 *    - Economic or financial losses
 * - Neither the developers nor any associated parties:
 *    - Make any warranties about the code's reliability, accuracy, or fitness for any purpose
 *    - Are responsible for any losses or damages arising from its use
 *    - Guarantee the continuous functionality or maintenance of the code
 *
 * CONDUCT YOUR OWN DUE DILIGENCE AND SEEK PROFESSIONAL ADVICE BEFORE USING THIS CODE.
 * USE AT YOUR OWN RISK.
 */
// Unix time converter, example: https://www.unixtimestamp.com/
// Market lifecycle: Live -> Locked -> Liquidated or Matured
use soroban_sdk::{
    contract, contractimpl, contractmeta, symbol_short, Address, Env, String, Symbol,
};

use vault::vault::VaultContractClient;

use crate::{
    data::MarketData,
    errors::MarketError,
    keys::{MarketRisk, MarketStatus},
    storage::{
        has_administrator, has_last_keeper_time, has_last_oracle_time, has_liquidated_time,
        has_matured_time, is_paused, read_administrator, read_asset, read_commission_fee,
        read_description, read_event_timestamp, read_hedge_vault, read_initialized_time,
        read_is_automatic, read_last_keeper_time, read_last_oracle_time, read_liquidated_time,
        read_lock_seconds, read_matured_time, read_name, read_oracle, read_risk_score,
        read_risk_vault, read_status, remove_is_paused, write_administrator, write_asset,
        write_commission_fee, write_description, write_event_timestamp, write_hedge_vault,
        write_initialized_time, write_is_automatic, write_is_paused, write_last_keeper_time,
        write_last_oracle_time, write_liquidated_time, write_lock_seconds, write_matured_time,
        write_name, write_oracle, write_risk_score, write_risk_vault, write_status,
    },
};

contractmeta!(
    key = "Market Maker",
    val = "Implementation of the Market Maker using vaults in Soroban"
);

#[contract]
pub struct MarketContract;

const MIN_COMMISSION_FEE: u32 = 0;
const MAX_COMMISSION_FEE: u32 = 100;
const MIN_LOCK_IN_SECONDS: u64 = 0;
const MAX_LOCK_IN_SECONDS: u64 = 604800; // 7 days
const EVENT_THRESHOLD_IN_SECONDS: u64 = 18000; // 5 hours // TODO: configurable on init

#[allow(dead_code)]
#[contractimpl]
impl MarketContract {
    // Public functions

    pub fn init(env: Env, data: MarketData) -> Result<bool, MarketError> {
        // Authorize
        data.admin_address.require_auth();

        // Validate
        if has_administrator(&env) {
            return Err(MarketError::AlreadyInitialized);
        }

        let current_timestamp: u64 = env.ledger().timestamp();

        if data.event_unix_timestamp < current_timestamp {
            return Err(MarketError::InvalidUnixTimestamp);
        }

        if data.event_unix_timestamp < data.lock_period_in_seconds
            || data.lock_period_in_seconds < MIN_LOCK_IN_SECONDS
            || data.lock_period_in_seconds > MAX_LOCK_IN_SECONDS
        {
            return Err(MarketError::InvalidLockPeriod);
        }

        if data.hedge_vault_address == data.risk_vault_address {
            return Err(MarketError::HedgeAndRiskAddressesAreSame);
        }

        if data.commission_fee < MIN_COMMISSION_FEE || data.commission_fee > MAX_COMMISSION_FEE {
            return Err(MarketError::InvalidCommisionFee);
        }

        // Create Vaults
        let hedge_vault = VaultContractClient::new(&env, &data.hedge_vault_address);
        let risk_vault = VaultContractClient::new(&env, &data.risk_vault_address);
        _ = hedge_vault
            .try_initialize(&data.admin_address, &data.hedge_vault_address)
            .map_err(|_| MarketError::HedgeVaultInitializationFailed)?;
        _ = risk_vault
            .try_initialize(&data.admin_address, &data.risk_vault_address)
            .map_err(|_| MarketError::RiskVaultInitializationFailed)?;

        // Persist State
        write_administrator(&env, &data.admin_address);
        write_asset(&env, &data.asset_address);
        write_hedge_vault(&env, &data.hedge_vault_address);
        write_risk_vault(&env, &data.risk_vault_address);
        write_oracle(&env, &data.trusted_oracle_address);
        write_status(&env, &MarketStatus::LIVE);
        write_name(&env, &data.name);
        write_description(&env, &data.description);
        write_initialized_time(&env, &current_timestamp);
        write_commission_fee(&env, &data.commission_fee);
        write_risk_score(&env, &data.risk_score);
        write_is_automatic(&env, &data.is_automatic);
        write_event_timestamp(&env, &data.event_unix_timestamp);
        write_lock_seconds(&env, &data.lock_period_in_seconds);

        // Return Result
        Ok(true)
    }

    pub fn status(env: Env) -> Result<MarketStatus, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_status(&env))
    }

    pub fn name(env: Env) -> Result<String, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_name(&env))
    }

    pub fn description(env: Env) -> Result<String, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_description(&env))
    }

    pub fn admin_address(env: Env) -> Result<Address, MarketError> {
        if has_administrator(&env) {
            return Ok(read_administrator(&env));
        }
        Err(MarketError::NotInitialized)
    }

    pub fn current_contract_address(env: Env) -> Address {
        env.current_contract_address()
    }

    pub fn underlying_asset_address(env: Env) -> Result<Address, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_asset(&env))
    }

    pub fn hedge_address(env: Env) -> Result<Address, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_hedge_vault(&env))
    }

    pub fn risk_address(env: Env) -> Result<Address, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_risk_vault(&env))
    }

    pub fn oracle_address(env: Env) -> Result<Address, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_oracle(&env))
    }

    pub fn change_oracle_address(env: Env, oracle: Address) -> Result<bool, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Self::_ensure_not_paused(&env)?;
        let admin: Address = read_administrator(&env);
        admin.require_auth();
        write_oracle(&env, &oracle);
        Ok(true)
    }

    pub fn initialized_time(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_initialized_time(&env))
    }

    pub fn time_of_event(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_event_timestamp(&env))
    }

    pub fn time_until_event(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        let current_timestamp: u64 = env.ledger().timestamp();
        let event_timestamp: u64 = read_event_timestamp(&env);
        if event_timestamp <= current_timestamp {
            return Ok(0);
        }
        Ok(event_timestamp - current_timestamp)
    }

    pub fn lock_period_in_seconds(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_lock_seconds(&env))
    }

    pub fn time_until_lock(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        // TODO
        Ok(0)
    }

    pub fn risk_score(env: Env) -> Result<MarketRisk, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_risk_score(&env))
    }

    pub fn change_risk_score(env: Env, risk: MarketRisk) -> Result<bool, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Self::_ensure_not_paused(&env)?;
        let admin: Address = read_administrator(&env);
        admin.require_auth();
        write_risk_score(&env, &risk);
        Ok(true)
    }

    pub fn exercising(env: Env) -> Result<Symbol, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        match read_is_automatic(&env) {
            true => Ok(symbol_short!("Automatic")),
            false => Ok(symbol_short!("Manual")),
        }
    }

    pub fn commission(env: Env) -> Result<u32, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(read_commission_fee(&env))
    }

    pub fn liquidated_time(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        if !has_liquidated_time(&env) {
            return Err(MarketError::NotLiquidated);
        }
        Ok(read_liquidated_time(&env))
    }

    pub fn matured_time(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        if !has_matured_time(&env) {
            return Err(MarketError::NotMatured);
        }
        Ok(read_matured_time(&env))
    }

    pub fn last_oracle_time(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        if !has_last_oracle_time(&env) {
            return Err(MarketError::LastOracleTimeNotSet);
        }
        Ok(read_last_oracle_time(&env))
    }

    pub fn last_keeper_time(env: Env) -> Result<u64, MarketError> {
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        if !has_last_keeper_time(&env) {
            return Err(MarketError::LastKeeperTimeNotSet);
        }
        Ok(read_last_keeper_time(&env))
    }

    pub fn bump(
        env: Env,
        event_occurred: bool,
        event_time: Option<u64>,
    ) -> Result<bool, MarketError> {
        // Trusted oracle should call this function to send bumps (status updates)
        // Set event_occurred to true if the market event has already happened.
        // Set event_time to when the event has happened. Optional if event_occurred is false.
        // If event occurred and event time > (expected event time + some threshold), then change status to liquidated.
        // If event occurred and event time <= (expected event time + some threshold), then change status to matured.
        // If event didn't occurr and event time >= (expected event time + some threshold), then change status to matured.
        // If event didn't occurr and event time < (expected event time + some threshold), then ignore.
        // If event occurred and no event time sent, then return an error.
        // If event didn't occurr and no event time sent, then ignore.
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        let current_timestamp: u64 = env.ledger().timestamp();
        write_last_oracle_time(&env, &current_timestamp);
        let oracle: Address = read_oracle(&env);
        oracle.require_auth();
        Self::_ensure_not_paused(&env)?;
        // Check if already matured or liquidated
        Self::_ensure_not_liquidated_or_matured(&env)?;
        // Check if liquidation or maturity should happen
        let expected_event_time: u64 = read_event_timestamp(&env);
        if event_occurred {
            match event_time {
                // Invalid bump data
                None => return Err(MarketError::EventTimeIsRequired),
                Some(e) => {
                    // Can be liquidated
                    if e > expected_event_time + EVENT_THRESHOLD_IN_SECONDS {
                        write_liquidated_time(&env, &current_timestamp); // Also persist actual event time?
                        write_status(&env, &MarketStatus::LIQUIDATED);
                        return Ok(true);
                    } else {
                        // Can be matured
                        write_matured_time(&env, &current_timestamp); // Also persist actual event time?
                        write_status(&env, &MarketStatus::MATURED);
                        return Ok(true);
                    }
                }
            }
        } else {
            match event_time {
                // Such bump can be ignored
                None => return Ok(true),
                Some(e) => {
                    // Can be matured
                    if e >= expected_event_time + EVENT_THRESHOLD_IN_SECONDS {
                        write_matured_time(&env, &current_timestamp); // Also persist actual event time?
                        write_status(&env, &MarketStatus::MATURED);
                        return Ok(true);
                    } else {
                        // Can be ignored
                        return Ok(true);
                    }
                }
            }
        }
    }

    pub fn auto_liquidation(env: Env) -> Result<bool, MarketError> {
        // Trigger automatic liquidation event (can be called by any keeper if auto exercising was enabled)
        // TODO
        Self::_ensure_not_paused(&env)?;
        Ok(true)
    }

    pub fn manual_liquidation(env: Env) -> Result<bool, MarketError> {
        // Trigger manual liquidation event (can be called by admin only if manual exercising was enabled)
        // TODO
        Self::_ensure_not_paused(&env)?;
        // Change Status
        let current_timestamp: u64 = env.ledger().timestamp();
        write_status(&env, &MarketStatus::LIQUIDATED);
        write_last_keeper_time(&env, &current_timestamp);
        write_liquidated_time(&env, &current_timestamp);
        Ok(true)
    }

    pub fn auto_maturity(env: Env) -> Result<bool, MarketError> {
        // Trigger automatic maturity event (can be called by any keeper if auto exercising was enabled)
        // Validation
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        let oracle: Address = read_oracle(&env);
        oracle.require_auth();
        Self::_ensure_not_paused(&env)?;
        if !read_is_automatic(&env) {
            return Err(MarketError::WrongExercising);
        }
        let current_timestamp: u64 = env.ledger().timestamp();
        let event_timestamp: u64 = read_event_timestamp(&env);
        // TODO: Improve the check if possible
        if current_timestamp < event_timestamp {
            return Err(MarketError::MaturityTooEarly);
        }
        // Check if already matured or liquidated
        Self::_ensure_not_liquidated_or_matured(&env)?;
        // Change Status
        write_status(&env, &MarketStatus::MATURED);
        write_last_keeper_time(&env, &current_timestamp);
        write_matured_time(&env, &current_timestamp);
        // TODO: Transfer assets between vaults and charge the commission fee if > 0
        // TODO: unlock withdrawal of one vault
        // TODO: Emit event
        Ok(true)
    }

    pub fn manual_maturity(env: Env) -> Result<bool, MarketError> {
        // Trigger manual maturity event (can be called by admin only if manual exercising was enabled)
        // TODO
        Self::_ensure_not_paused(&env)?;
        Ok(true)
    }

    pub fn dispute(_env: Env) -> Result<bool, MarketError> {
        // Future work. Decide, who how and when can open disputes, and how to resolve them.
        Err(MarketError::NotImplementedYet)
    }

    pub fn calculate_apy(env: Env) -> Result<i128, MarketError> {
        Self::_ensure_not_paused(&env)?;
        // TODO: calculate based on vaults shares/assets ratio, return for view
        Ok(0)
    }

    pub fn is_market_paused(env: Env) -> bool {
        is_paused(&env)
    }

    pub fn pause_market(env: Env) -> Result<bool, MarketError> {
        // Pause this contract and underlying vaults
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        let admin: Address = read_administrator(&env);
        admin.require_auth();
        if is_paused(&env) {
            Err(MarketError::ContractIsAlreadyPaused)
        } else {
            let hedge: Address = read_hedge_vault(&env);
            let risk: Address = read_risk_vault(&env);
            let hedge_vault = VaultContractClient::new(&env, &hedge);
            let risk_vault = VaultContractClient::new(&env, &risk);
            _ = hedge_vault
                .try_pause()
                .map_err(|_| MarketError::VaultPauseFailed)?;
            _ = risk_vault
                .try_pause()
                .map_err(|_| MarketError::VaultPauseFailed)?;
            write_is_paused(&env);
            Ok(true)
        }
    }

    pub fn unpause_market(env: Env) -> Result<bool, MarketError> {
        // Unpause this contract and underlying vaults
        if !has_administrator(&env) {
            return Err(MarketError::NotInitialized);
        }
        let admin: Address = read_administrator(&env);
        admin.require_auth();
        if is_paused(&env) {
            remove_is_paused(&env);
            let hedge: Address = read_hedge_vault(&env);
            let risk: Address = read_risk_vault(&env);
            let hedge_vault = VaultContractClient::new(&env, &hedge);
            let risk_vault = VaultContractClient::new(&env, &risk);
            _ = hedge_vault
                .try_unpause()
                .map_err(|_| MarketError::VaultUnpauseFailed)?;
            _ = risk_vault
                .try_unpause()
                .map_err(|_| MarketError::VaultUnpauseFailed)?;
            return Ok(true);
        }
        Err(MarketError::ContractIsAlreadyUnpaused)
    }

    // Private functions

    fn _ensure_not_paused(_env: &Env) -> Result<(), MarketError> {
        match is_paused(_env) {
            true => Err(MarketError::ContractIsAlreadyPaused),
            false => Ok(()),
        }
    }

    fn _ensure_not_liquidated_or_matured(env: &Env) -> Result<(), MarketError> {
        let status: MarketStatus = read_status(&env);
        if status == MarketStatus::LIQUIDATED {
            return Err(MarketError::AlreadyLiquidated);
        }
        if status == MarketStatus::MATURED {
            return Err(MarketError::AlreadyMatured);
        }
        Ok(())
    }
}
