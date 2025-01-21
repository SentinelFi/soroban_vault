#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    IpfsHash,
    ImageMetadata,
}

#[derive(Clone)]
#[contracttype]
pub struct ImageMetadata {
    title: String,
    description: String,
    creator: Address,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    IpfsHashNotSet = 1,
    ImageMetadataNotSet = 2,
    // For demonstration purposes
    HashEmpty = 3,
    HashTooLong = 4,
    HashTooShort = 5,
}

#[contract]
pub struct ImageContract;

#[contractimpl]
impl ImageContract {
    pub fn validate_hash(hash: String) -> Result<(), Error> {
        if hash.len() == 0 {
            return Err(Error::HashEmpty);
        }

        if hash.len() > 100 {
            return Err(Error::HashTooLong);
        }

        if hash.len() < 3 {
            return Err(Error::HashTooShort);
        }

        // Add other validations as required

        Ok(())
    }

    pub fn store_image(
        env: Env,
        title: String,
        description: String,
        creator: Address,
        ipfs_hash: String,
    ) -> Result<bool, Error> {
        Self::validate_hash(ipfs_hash.clone())?;

        let metadata = ImageMetadata {
            title,
            description,
            creator,
        };

        env.storage()
            .persistent()
            .set(&DataKey::IpfsHash, &ipfs_hash);

        env.storage()
            .persistent()
            .set(&DataKey::ImageMetadata, &metadata);

        Ok(true)
    }

    pub fn get_image_metadata(env: Env) -> Result<ImageMetadata, Error> {
        match env.storage().persistent().get(&DataKey::ImageMetadata) {
            Some(metadata) => Ok(metadata),
            None => Err(Error::ImageMetadataNotSet),
        }
    }

    pub fn get_ipfs_hash(env: Env) -> Result<String, Error> {
        match env.storage().persistent().get(&DataKey::IpfsHash) {
            Some(ipfs_hash) => Ok(ipfs_hash),
            None => Err(Error::IpfsHashNotSet),
        }
    }

    pub fn remove_image_metadata(env: Env) -> Result<bool, Error> {
        if env.storage().persistent().has(&DataKey::ImageMetadata) {
            env.storage().persistent().remove(&DataKey::ImageMetadata);
            return Ok(true);
        }
        Err(Error::ImageMetadataNotSet)
    }

    pub fn remove_ipfs_hash(env: Env) -> Result<bool, Error> {
        if env.storage().persistent().has(&DataKey::IpfsHash) {
            env.storage().persistent().remove(&DataKey::IpfsHash);
            return Ok(true);
        }
        Err(Error::IpfsHashNotSet)
    }
}
