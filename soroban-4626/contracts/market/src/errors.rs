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
    WrongExercising = 14,
    LockTooEarly = 15,
    NotLiquidate = 16,
    NotMature = 17,
    LastKeeperTimeNotSet = 18,
    LastOracleTimeNotSet = 19,
    AlreadyMatured = 20,
    AlreadyLiquidated = 21,
    AlreadyLocked = 22,
    EventTimeIsRequired = 23,
    WithdrawalUnpauseFailed = 24,
    InvalidEventThreshold = 25,
    InvalidUnlockPeriod = 26,
}
