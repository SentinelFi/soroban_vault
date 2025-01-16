use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    ERC4626ExceededMaxDeposit = 1,
    ERC4626ExceededMaxMint = 2,
    ERC4626ExceededMaxWithdraw = 3,
    ERC4626ExceededMaxRedeem = 4,
    InvalidAmount = 5,
    ZeroAssets = 6,
    ZeroShares = 7,
    NoAllowance = 8,
    InsufficientAllowance = 9,
    AllowanceExpired = 10,
    InvalidExpiry = 11,
    InvalidExpiryDays = 12,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    ArithmeticError = 2,
}
