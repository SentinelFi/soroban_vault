// https://github.com/stellar/soroban-examples/blob/main/events/src/lib.rs

"use client";

import {
  BASE_FEE,
  Contract,
  Networks,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

import React, { useEffect, useState } from "react";
import {
  getAddress,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";

import { ConnectButton } from "@/components/ConnectWalletButton";
import Nav from "@/components/Nav";

// Replace with the actual contract ID and network details
const CONTRACT_ID = "CA6KLVEYFY6VV77AGIBM572RJSJKXFNN52U4SSG6NRZ4PRDUQQIEYJZF";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";
const TIMEOUT_SEC = 30;

export default function CounterPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const checkWallet = async () => {
      const connected = await isConnected();
      if (connected?.isConnected) {
        const pubKey = await getAddress();
        setPublicKey(pubKey?.address);
      }
    };

    checkWallet();
  }, []);

  const handleIncrement = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);

      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);
      //   const instance = contract.getFootprint();

      const operation = contract.call("increment");

      const feeStats = await server.getFeeStats();
      console.log("Fee Stats", feeStats);

      console.log("Build Tx");

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
      })
        .setNetworkPassphrase(NETWORK_PASSPHRASE)
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .build();

      console.log("Simulate Tx");

      //const simulateResponse = await server.simulateTransaction(transaction);
      //console.log("Simulate Response: ", simulateResponse);

      console.log("Prepare Tx", transaction);

      const preparedTx = await server.prepareTransaction(transaction);

      console.log("Prepared: ", preparedTx);

      /* @example
       * const contractId = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
       * const contract = new StellarSdk.Contract(contractId);
       *
       * // Right now, this is just the default fee for this example.
       * const fee = StellarSdk.BASE_FEE;
       * const transaction = new StellarSdk.TransactionBuilder(account, { fee })
       *   // Uncomment the following line to build transactions for the live network. Be
       *   // sure to also change the horizon hostname.
       *   //.setNetworkPassphrase(StellarSdk.Networks.PUBLIC)
       *   .setNetworkPassphrase(StellarSdk.Networks.FUTURENET)
       *   .setTimeout(30) // valid for the next 30s
       *   // Add an operation to call increment() on the contract
       *   .addOperation(contract.call("increment"))
       *   .build();
       *
       * const preparedTransaction = await server.prepareTransaction(transaction);
       *
       * // Sign this transaction with the secret key
       * // NOTE: signing is transaction is network specific. Test network transactions
       * // won't work in the public network. To switch networks, use the Network object
       * // as explained above (look for StellarSdk.Network).
       * const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
       * preparedTransaction.sign(sourceKeypair);
       *
       * server.sendTransaction(transaction).then(result => {
       *   console.log("hash:", result.hash);
       *   console.log("status:", result.status);
       *   console.log("errorResultXdr:", result.errorResultXdr);
       * });
       */

      console.log("Sign Tx");

      const signedXdr = await signTransaction(
        preparedTx.toEnvelope().toXDR("base64"),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
          //address: publicKey,
        }
      );

      console.log("Send Tx");

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr?.signedTxXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      const txResult = await server.sendTransaction(signedTx);

      console.log("Status", txResult);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong. Status " + txResult.status);
      }

      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);
      // Poll `getTransaction` until the status is not "NOT_FOUND"

      console.log("Poll");

      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Process Result");

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      console.log("Return Value");

      // Extract the new count from the transaction result
      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();

      console.log("Value: ", returnValue);

      if (returnValue) {
        const newCount = returnValue.u32();
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error incrementing counter.", error);
      // alert(
      //   "Error incrementing counter. Please check the console for details."
      // );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Nav />
      <h1 className="text-2xl font-bold mb-4">Counter Contract</h1>
      {publicKey ? (
        <div>
          <p className="mb-4">Connected: {publicKey}</p>
          <p className="mb-4">Contract ID: {CONTRACT_ID}</p>
          <p className="mb-4">
            Current Count: {count === null ? "Probably Zero" : count}
          </p>
          <button
            onClick={handleIncrement}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Increment Counter"
            )}
          </button>
        </div>
      ) : (
        <>
          <p>Please connect your Freighter wallet to use this app.</p>
          <ConnectButton label="Connect Wallet" />
        </>
      )}
    </div>
  );
}
