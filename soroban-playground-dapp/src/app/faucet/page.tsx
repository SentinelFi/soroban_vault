// https://lab.stellar.org/account/fund?$=network$id=testnet&label=Testnet&horizonUrl=https:////horizon-testnet.stellar.org&rpcUrl=https:////soroban-testnet.stellar.org&passphrase=Test%20SDF%20Network%20/;%20September%202015;;
// https://developers.stellar.org/docs/learn/fundamentals/networks#friendbot

"use client";

import React, { useState, useEffect } from "react";

import { Keypair, SorobanRpc } from "@stellar/stellar-sdk";
import { isConnected, setAllowed, getAddress } from "@stellar/freighter-api";

import Nav from "@/components/Nav";

export default function Faucet() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";

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

  function createRandomAddress(): string {
    const pair = Keypair.random();
    // pair.secret();
    return pair.publicKey();
  }

  async function callFaucet(): Promise<void> {
    try {
      setLoading(true);

      const connected = await isConnected();

      if (!connected?.isConnected) {
        throw new Error("Please connect your Freighter wallet first");
      }

      if (!inputValue) {
        throw new Error("Address not found");
      }

      if (!SOROBAN_URL) {
        throw new Error("Soroban URL missing");
      }

      const server = new SorobanRpc.Server(SOROBAN_URL);

      console.log("Network");

      const network = await server.getNetwork();
      if (!network) console.log("Invalid network returned");
      else console.log(network);

      console.log("Requesting", inputValue);

      // Network will be resolved automatically if not specified
      const airdrop = network
        ? await server.requestAirdrop(inputValue, network.friendbotUrl)
        : await server.requestAirdrop(inputValue);

      if (!airdrop) throw new Error("Invalid value returned");
      console.log("Airdrop", airdrop);

      setResult(airdrop?.accountId());
    } catch (error: any) {
      console.error("Error calling faucet:", error);
      if (error?.response?.data) {
        alert(
          `${error.response.data?.detail} ${error.response.data?.status} ${error.response.data?.title}`
        );
      } else if (error?.message) {
        alert(error.message);
      }
      console.log(error?.code, error?.response);
      setResult("Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">Friendbot Faucet</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <p>
            <i>
              Note: faucet tokens are not real. The account will not be "topped
              off" if it already exists and was funded before. Instead, an error
              will be returned (400).
            </i>
          </p>
          <div className="mt-4 mb-4">
            <label
              htmlFor="inputValue"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Public Address
            </label>
            <input
              id="inputValue"
              type="text"
              placeholder="Address..."
              value={inputValue}
              required
              onChange={(e) => setInputValue(e.target.value)}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-full"
            />
          </div>
          <button
            onClick={callFaucet}
            disabled={loading || !inputValue}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4"
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
              "Request XLM"
            )}
          </button>
          <button
            onClick={() => setInputValue(publicKey)}
            disabled={loading}
            className="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4"
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
              "Fill current address"
            )}
          </button>
          <button
            onClick={() => setInputValue(createRandomAddress())}
            disabled={loading}
            className="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Fill new random"
            )}
          </button>
          <button
            onClick={() => setInputValue("")}
            disabled={loading}
            className="bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-4 mt-4"
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
              "Clear address"
            )}
          </button>
          {result && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Returned:</h2>
              <p>{result}</p>
            </div>
          )}
          <p className="my-2">
            <i>
              Please ignore the internal bug, as address still gets funded: "The
              first argument must be one of type string, Buffer, ArrayBuffer,
              Array, or Array-like Object. Received type undefined."
            </i>
          </p>
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
