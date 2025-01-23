use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MarketError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    InvalidUnixTimestamp = 3,
    HedgeAndRiskAddressesAreSame = 4,
    InvalidCommisionFee = 5,
    InvalidLockPeriod = 6,
    NotImplementedYet = 7,
    HedgeVaultInitializationFailed = 8,
    RiskVaultInitializationFailed = 9,
    ContractIsAlreadyPaused = 10,
    ContractIsAlreadyUnpaused = 11,
    VaultPauseFailed = 12,
    VaultUnpauseFailed = 13,
    LockTooEarly = 14,
    NotLiquidate = 15,
    NotMature = 16,
    LastKeeperTimeNotSet = 17,
    LastOracleTimeNotSet = 18,
    AlreadyMatured = 19,
    AlreadyLiquidated = 20,
    AlreadyLocked = 21,
    EventTimeIsRequired = 22,
    WithdrawalUnpauseFailed = 23,
    InvalidEventThreshold = 24,
    InvalidUnlockPeriod = 25,
    InsufficientAllowance = 26,
    ActualEventTimeNotSet = 27,
}
