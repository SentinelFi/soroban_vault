#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, Env, Map, String, Symbol, Vec,
};

#[derive(Clone)]
#[contracttype]
pub enum EnumKey {
    One = 0,
    Two = 1,
    Three = 2,
}

#[derive(Clone)]
#[contracttype]
pub struct StructData {
    n: u32,
    s: String,
}

#[contract]
pub struct ParamsContract;

#[contractimpl]
impl ParamsContract {
    pub fn accept_string(_: Env, param: String) -> String {
        param
    }

    pub fn accept_symbol(_: Env, param: Symbol) -> Symbol {
        param
    }

    pub fn accept_bytes(_: Env, param: Bytes) -> Bytes {
        param
    }

    pub fn accept_address(_: Env, param: Address) -> Address {
        param
    }

    pub fn accept_bool(_: Env, param: bool) -> bool {
        param
    }

    pub fn accept_signed32(_: Env, param: i32) -> i32 {
        param
    }

    pub fn accept_signed128(_: Env, param: i128) -> i128 {
        param
    }

    pub fn accept_unsigned32(_: Env, param: u32) -> u32 {
        param
    }

    pub fn accept_unsigned128(_: Env, param: u128) -> u128 {
        param
    }

    pub fn accept_enum(_: Env, param: EnumKey) -> EnumKey {
        param
    }

    pub fn accept_struct(_: Env, param: StructData) -> StructData {
        param
    }

    pub fn accept_map(_: Env, param: Map<i32, String>) -> Map<i32, String> {
        param
    }

    pub fn accept_vec(_: Env, param: Vec<String>) -> Vec<String> {
        param
    }

    pub fn accept_void(_: Env, param: ()) -> () {
        param
    }
}
