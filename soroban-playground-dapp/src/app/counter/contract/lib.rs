#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

const COUNTER: Symbol = symbol_short!("COUNTER");

#[contract]
pub struct IncrementContract;

#[contractimpl]
impl IncrementContract {
    /// Increment increments an internal counter, and returns the value.
    pub fn increment(env: Env) -> u32 {
        // Get the current count.
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.

        // Increment the count.
        count += 1;

        // Save the count.
        env.storage().instance().set(&COUNTER, &count);

        // Publish an event about the increment occuring.
        // The event has two topics:
        //   - The "COUNTER" symbol.
        //   - The "increment" symbol.
        // The event data is the count.
        env.events()
            .publish((COUNTER, symbol_short!("increment")), count);

        // Return the count to the caller.
        count
    }

    /// IncrementVal increments an internal counter by value, and returns the value.
    pub fn incrementval(env: Env, val: u32) -> u32 {
        // Get the current count.
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.

        // Increment the count by value.
        count += val;

        // Save the count.
        env.storage().instance().set(&COUNTER, &count);

        // Publish an event about the increment occuring.
        // The event has two topics:
        //   - The "COUNTER" symbol.
        //   - The "increment" symbol.
        // The event data is the count.
        env.events()
            .publish((COUNTER, symbol_short!("increment")), count);

        // Return the count to the caller.
        count
    }

    /// DecrementVal decrements an internal counter by value, and returns the value. Minimum returns 0.
    pub fn decrementval(env: Env, val: u32) -> u32 {
        // Get the current count.
        let mut count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.

        if count == 0 {
            count
        } else {
            // Decrement the count by value.
            if count >= val {
                count -= val;
            } else {
                count = 0;
            }

            // Save the count.
            env.storage().instance().set(&COUNTER, &count);

            // Publish an event about the increment occuring.
            // The event has two topics:
            //   - The "COUNTER" symbol.
            //   - The "increment" symbol.
            // The event data is the count.
            env.events()
                .publish((COUNTER, symbol_short!("decrement")), count);

            // Return the count to the caller.
            count
        }
    }

    /// Get the current count.
    pub fn getcounter(env: Env) -> u32 {
        // Get and return the current count.
        let count: u32 = env.storage().instance().get(&COUNTER).unwrap_or(0); // If no value set, assume 0.
        count
    }
}
