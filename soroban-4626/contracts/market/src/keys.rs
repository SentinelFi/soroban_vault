use soroban_sdk::contracttype;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketStatus {
    LIVE = 1,
    LOCKED = 2,
    MATURED = 3,
    LIQUIDATED = 4,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketRisk {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    UNKNOWN = 4,
}

#[derive(Clone)]
#[contracttype]
pub enum MarketDataKey {
    AdminAddress,
    AssetAddress,
    HedgeAddress,
    RiskAddress,
    OracleAddress,
    Status,
    Name,
    Description,
    InitializedTime,
    LiquidatedTime,
    MaturedTime,
    LastOracleTime,
    LastKeeperTime,
    CommissionFee,
    RiskScore,
    IsAutomatic,
    EventUnixTimestamp,
    LockInSeconds,
    IsPaused,
}
