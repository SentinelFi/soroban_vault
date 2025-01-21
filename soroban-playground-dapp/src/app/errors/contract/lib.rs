#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, symbol_short, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    SomeError = 1,
    InternalError = 2,
}

#[contract]
pub struct ErrorContract;

#[allow(dead_code)]
#[contractimpl]
impl ErrorContract {
    pub fn result_error(_: Env) -> Result<bool, Error> {
        Err(Error::SomeError)
    }

    pub fn panic_result_error(_: Env) -> Result<bool, Error> {
        panic!("Panic error")
    }

    pub fn panic_plain_error(_: Env) -> bool {
        panic!("Panic error")
    }

    pub fn unwrap_plain_error(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&symbol_short!("TEST"))
            .unwrap()
    }

    pub fn inner_result_error(env: Env) -> Result<bool, Error> {
        let _ = Self::internal_error(env)?;
        Ok(true)
    }

    fn internal_error(_: Env) -> Result<(), Error> {
        Err(Error::InternalError)
    }
}
