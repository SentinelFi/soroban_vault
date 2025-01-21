"use client";

import React, { useState, useEffect } from "react";

import {
  BASE_FEE,
  Contract,
  Networks,
  scValToNative,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

import Nav from "@/components/Nav";
import {
  ParsedSorobanError,
  SorobanErrorParser,
} from "@/utils/SorobanErrorParser";

export default function SorobanErrors() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ParsedSorobanError | null>(null);

  const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";
  const CONTRACT_ID =
    "CD4UIMZ3CQPVGMTTIPMPO2CQWJSPHGLOZTZPI2SZ2TZOR44MBYSS4A6F";
  const NETWORK_PASSPHRASE = Networks.TESTNET;
  const TIMEOUT_SEC = 30;

  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const connected = await isConnected();
        if (!connected) throw "Freigher connection returned empty response";
        if (connected.error)
          throw `Freighter connection error: ${connected.error}`;
        if (connected.isConnected) {
          const pubKey = await getAddress();
          if (!pubKey) throw "Freigher address returned empty response";
          if (pubKey.error) throw `Freighter address error: ${pubKey.error}`;
          setPublicKey(pubKey.address);
        }
      } catch (error) {
        console.error("Error checking Freighter connection:", error);
        alert("Error Freighter. Please check the console for details.");
      }
    };

    checkFreighter();
  }, []);

  const handleConnectWallet = async () => {
    try {
      const isAllowed = await setAllowed();
      if (!isAllowed) throw "Freigher returned empty allowed response";
      if (isAllowed.error) throw `Freighter allowed error: ${isAllowed.error}`;
      else
        console.log(
          "Successfully added the app to Freighter's Allow List " +
            isAllowed.isAllowed
        );
      const pubKey = await getAddress();
      if (!pubKey) throw "Freigher address returned empty response";
      if (pubKey.error) throw `Freighter address error: ${pubKey.error}`;
      setPublicKey(pubKey.address);
    } catch (error) {
      console.error("Error connecting to Freighter:", error);
      alert("Error connecting wallet. Please check the console for details.");
    }
  };

  // Map from the contract error codes enum
  const generateErrorMap = (): Record<number, string> => {
    const result: Record<number, string> = {
      1: "Some Error",
      2: "Internal Error",
    };
    return result;
  };

  async function sendErrorTransaction(operationName: string): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const connected = await isConnected();

      if (!connected?.isConnected) {
        throw new Error("Please connect your Freighter wallet first");
      }

      if (!publicKey) {
        throw new Error("Address not found");
      }

      if (!SOROBAN_URL) {
        throw new Error("Soroban URL missing");
      }

      if (!CONTRACT_ID) {
        throw new Error("Contract ID missing");
      }

      if (!operationName) {
        throw new Error("Operaton name missing");
      }

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);
      const operation = contract.call(operationName);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .build();

      const preparedTx = await server.prepareTransaction(transaction);

      const signedXdr = await signTransaction(
        preparedTx.toEnvelope().toXDR("base64"),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      if (!signedXdr || signedXdr.error) throw `${signedXdr?.error}`;

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr?.signedTxXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      const txResult = await server.sendTransaction(signedTx);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong. Status " + txResult.status);
      }

      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);

      // Poll `getTransaction` until the status is not "NOT_FOUND"
      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();

      console.log("Value: ", returnValue);
    } catch (error: any) {
      console.log(error);
      console.log("Received error", typeof error);
      const parsed = SorobanErrorParser.parse(error, generateErrorMap());
      setError(parsed);
      console.log("Error.", parsed);
    } finally {
      setLoading(false);
    }
  }

  const getSimulated = async (operationName: string) => {
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

    if (!operationName) {
      console.error("Operation name missing");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call(operationName);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .build();

      const simulated = await server.simulateTransaction(transaction);
      const sim: any = simulated;

      if (sim.error) {
        console.log("Received error", typeof sim.error);
        const parsed = SorobanErrorParser.parse(sim.error, generateErrorMap());
        setError(parsed);
      } else {
        console.log("cost:", sim.cost);
        console.log("result:", sim.result);
        console.log("latest ledger:", sim.latestLedger);
        console.log(
          "human readable result:",
          scValToNative(sim.result?.retval)
        );
        const returnValue: any = scValToNative(sim.result?.retval);
        console.log("Value: ", returnValue);
      }
    } catch (error) {
      console.log("Error simulating.", error);
      alert("Error simulating. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">Soroban Errors</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <p className="italic mb-4">Expect to see some errors here.</p>
          <button
            onClick={() => sendErrorTransaction("result_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Result Error"
            )}
          </button>
          <button
            onClick={() => sendErrorTransaction("panic_result_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Panic Result Error"
            )}
          </button>
          <button
            onClick={() => sendErrorTransaction("panic_plain_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Panic Plain Error"
            )}
          </button>
          <button
            onClick={() => getSimulated("panic_result_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Simulate Error"
            )}
          </button>
          <button
            onClick={() => sendErrorTransaction("unwrap_plain_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Unwrap Plain Error"
            )}
          </button>

          <button
            onClick={() => sendErrorTransaction("inner_result_error")}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Inner Result Error"
            )}
          </button>
          {error && (
            <div className="mt-4">
              <h2 className="text-xl text-red-500">Error:</h2>
              <div>
                <p className="my-2">
                  <strong>Type |</strong> {error.type}
                </p>
                <p className="my-2">
                  <strong>Code |</strong> {error.code}
                </p>
                <p className="my-2">
                  <strong>Function |</strong> {error.functionName}
                </p>
                <p className="my-2">
                  <strong>Message |</strong> {error.message}
                </p>
                <p className="my-2">
                  <strong>Diagnostic |</strong> {error.diagnosticError}
                </p>
                <p className="my-2">
                  <strong>Raw |</strong> {error.rawError}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          onClick={handleConnectWallet}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Connect Freighter Wallet
        </button>
      )}
    </div>
  );
}
