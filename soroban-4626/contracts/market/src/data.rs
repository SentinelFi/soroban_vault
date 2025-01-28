use soroban_sdk::{contracttype, Address, String};

use crate::keys::MarketRisk;

#[derive(Clone)]
#[contracttype]
pub struct MarketData {
    pub name: String,
    pub description: String,
    pub admin_address: Address,
    pub asset_address: Address,
    pub trusted_oracle_name: String,
    pub trusted_oracle_address: Address,
    pub hedge_vault_address: Address,
    pub risk_vault_address: Address,
    pub commission_fee: u32,
    pub risk_score: MarketRisk,
    pub is_automatic: bool,
    pub event_unix_timestamp: u64,
    pub lock_period_in_seconds: u64,
    pub event_threshold_in_seconds: u64,
    pub unlock_period_in_seconds: u64,
}
