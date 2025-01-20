// https://github.com/stellar/soroban-examples/blob/main/events/src/lib.rs

"use client";

import {
  BASE_FEE,
  Contract,
  Memo,
  Networks,
  scValToNative,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { SorobanRpc } from "@stellar/stellar-sdk";

import React, { useEffect, useState } from "react";
import {
  getAddress,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";

import { ConnectButton } from "@/components/ConnectWalletButton";
import Nav from "@/components/Nav";

// Replace with the actual contract ID and network details
const CONTRACT_ID = "CCOE3COCZUKBDGM63AALJ36RNIZADXI6V5HSO7PPSZAIM46LF4OGOZSR";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";
const TIMEOUT_SEC = 30;

export default function CounterPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<number>(0);
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

  const handleGet = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    if (!CONTRACT_ID) {
      console.error("Contract ID missing");
      return;
    }

    if (!SOROBAN_URL) {
      console.error("Soroban URL missing");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);
      //   const instance = contract.getFootprint();

      const operation = contract.call("getcounter");

      console.log("Build", operation);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .addMemo(Memo.text("counter!"))
        .build();

      const simulated = await server.simulateTransaction(transaction);
      const sim: any = simulated;

      /*
       *   - on success, this includes all fields, though `result` is only present
       *     if an invocation was simulated (since otherwise there's nothing to
       *     "resultify")
       *   - if there was an expiration error, this includes error and restoration
       *     fields
       *   - for all other errors, this only includes error fields
       */

      console.log("cost:", sim.cost);
      console.log("result:", sim.result);
      console.log("error:", sim.error);
      console.log("latest ledger:", sim.latestLedger);
      // The result is a ScVal and so we can parse that to human readable output using the sdk's `scValToNative` function:
      console.log("human readable result:", scValToNative(sim.result?.retval));

      // Extract the new count from the transaction result
      const returnValue: number = scValToNative(sim.result?.retval);

      console.log("Value: ", returnValue);

      if (returnValue) {
        const newCount = returnValue;
        console.log("Count: ", newCount);
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error getting counter.", error);
      alert("Error getting counter. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    if (!CONTRACT_ID) {
      console.error("Contract ID missing");
      return;
    }

    if (!SOROBAN_URL) {
      console.error("Soroban URL missing");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);
      //   const instance = contract.getFootprint();

      const operation = contract.call("increment");

      console.log("Build", operation);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .addMemo(Memo.text("counter!"))
        .build();

      console.log("Prepare", transaction);

      // Simulate the transaction to discover the storage footprint, and update the
      // transaction to include it. If you already know the storage footprint you
      // can use `addFootprint` to add it yourself, skipping this step.
      const preparedTx = await server.prepareTransaction(transaction);

      console.log("Prepared", preparedTx);

      console.log("Sign");

      const signedXdr = await signTransaction(
        preparedTx.toEnvelope().toXDR("base64"),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      console.log("Signed", signedXdr);

      if (!signedXdr || signedXdr.error) throw `${signedXdr?.error}`;

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr?.signedTxXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      console.log("Send");

      const txResult = await server.sendTransaction(signedTx);

      console.log("Status", txResult.status, txResult);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong. Status " + txResult.status);
      }

      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);

      console.log("Poll");

      // Poll `getTransaction` until the status is not "NOT_FOUND"
      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Process");

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      console.log("Return");

      // Extract the new count from the transaction result
      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();

      console.log("Value: ", returnValue);

      if (returnValue) {
        const newCount = returnValue.u32();
        console.log("Count: ", newCount);
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error incrementing counter.", error);
      alert(
        "Error incrementing counter. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementByValue = async (val: number) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    if (!CONTRACT_ID) {
      console.error("Contract ID missing");
      return;
    }

    if (!SOROBAN_URL) {
      console.error("Soroban URL missing");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);
      //   const instance = contract.getFootprint();

      const args = [xdr.ScVal.scvU32(val)];
      const params: xdr.ScVal[] = args || [];

      const operation = contract.call("incrementval", ...params);

      console.log("Build", operation);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .addMemo(Memo.text("counter!"))
        .build();

      console.log("Prepare", transaction);

      // Simulate the transaction to discover the storage footprint, and update the
      // transaction to include it. If you already know the storage footprint you
      // can use `addFootprint` to add it yourself, skipping this step.
      const preparedTx = await server.prepareTransaction(transaction);

      console.log("Prepared", preparedTx);

      console.log("Sign");

      const signedXdr = await signTransaction(
        preparedTx.toEnvelope().toXDR("base64"),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      console.log("Signed", signedXdr);

      if (!signedXdr || signedXdr.error) throw `${signedXdr?.error}`;

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr?.signedTxXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      console.log("Send");

      const txResult = await server.sendTransaction(signedTx);

      console.log("Status", txResult.status, txResult);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong. Status " + txResult.status);
      }

      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);

      console.log("Poll");

      // Poll `getTransaction` until the status is not "NOT_FOUND"
      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Process");

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      console.log("Return");

      // Extract the new count from the transaction result
      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();

      console.log("Value: ", returnValue);

      if (returnValue) {
        const newCount = returnValue.u32();
        console.log("Count: ", newCount);
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error incrementing counter by value.", error);
      alert(
        "Error incrementing counter by value. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDecrementByValue = async (val: number) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    if (!CONTRACT_ID) {
      console.error("Contract ID missing");
      return;
    }

    if (!SOROBAN_URL) {
      console.error("Soroban URL missing");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);
      //   const instance = contract.getFootprint();

      const args = [xdr.ScVal.scvU32(val)];
      const params: xdr.ScVal[] = args || [];

      const operation = contract.call("decrementval", ...params);

      console.log("Build", operation);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .addMemo(Memo.text("counter!"))
        .build();

      console.log("Prepare", transaction);

      // Simulate the transaction to discover the storage footprint, and update the
      // transaction to include it. If you already know the storage footprint you
      // can use `addFootprint` to add it yourself, skipping this step.
      const preparedTx = await server.prepareTransaction(transaction);

      console.log("Prepared", preparedTx);

      console.log("Sign");

      const signedXdr = await signTransaction(
        preparedTx.toEnvelope().toXDR("base64"),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      console.log("Signed", signedXdr);

      if (!signedXdr || signedXdr.error) throw `${signedXdr?.error}`;

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr?.signedTxXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      console.log("Send");

      const txResult = await server.sendTransaction(signedTx);

      console.log("Status", txResult.status, txResult);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong. Status " + txResult.status);
      }

      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);

      console.log("Poll");

      // Poll `getTransaction` until the status is not "NOT_FOUND"
      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Process");

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      console.log("Return");

      // Extract the new count from the transaction result
      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();

      console.log("Value: ", returnValue);

      if (returnValue) {
        const newCount = returnValue.u32();
        console.log("Count: ", newCount);
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error decrementing counter by value.", error);
      alert(
        "Error decrementing counter by value. Please check the console for details."
      );
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
            Current Count:{" "}
            <strong>{count === null ? "Probably Zero" : count}</strong>
          </p>
          <button
            onClick={handleGet}
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
              "Get Counter"
            )}
          </button>
          <button
            onClick={handleIncrement}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mx-2"
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
              "Increment Counter +1"
            )}
          </button>
          <div className="mt-4 mb-4">
            <label
              htmlFor="inputValue"
              className="block text-sm font-medium text-gray-700"
            >
              Increment / Decrement Value
            </label>
            <input
              id="inputValue"
              type="number"
              placeholder="Value..."
              value={inputValue}
              required
              min={0}
              onChange={(e) => setInputValue(Number(e.target.value))}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <button
            onClick={() => handleIncrementByValue(inputValue)}
            disabled={loading || !inputValue}
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
              "Increment By Value"
            )}
          </button>
          <button
            onClick={() => handleDecrementByValue(inputValue)}
            disabled={loading || !inputValue}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mx-2"
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
              "Decrement By Value"
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
