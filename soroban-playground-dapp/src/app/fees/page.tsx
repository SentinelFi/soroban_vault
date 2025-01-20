"use client";

import React, { useState, useEffect } from "react";

import * as StellarSdk from "@stellar/stellar-sdk";

import { isConnected, setAllowed, getAddress } from "@stellar/freighter-api";

import Nav from "@/components/Nav";

interface FeeType {
  lastLedgerBaseFee: string;
  lastLedger: string;
  ledgerCapacityUsage: string;
  maxFee: string;
  modeFee: string;
  minFee: string;
  feeChargedP99: string;
  feeChargedP90: string;
}

export default function Fees() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [feeValues, setFeeValues] = useState<FeeType | null>(null);

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

  useEffect(() => {
    const fetch = async () => {
      const fee = await fetchFee();
      setFeeValues(fee);
    };
    fetch();
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

  async function fetchFee(): Promise<FeeType | null> {
    try {
      const connected = await isConnected();

      if (!connected?.isConnected) {
        throw new Error("Please connect your Freighter wallet first");
      }

      const publicKey = await getAddress();

      if (!publicKey?.address) {
        throw new Error("Freighter wallet address not found");
      }

      // https://developers.stellar.org/docs/data/horizon
      const HORIZON_URL = "https://horizon-testnet.stellar.org";

      const server = new StellarSdk.Horizon.Server(HORIZON_URL);

      const fees = await server.feeStats();
      if (!fees) throw new Error("Fees not found");
      console.log("Fees", fees);

      //   const fee = await server.fetchBaseFee();
      //   if (!fee) throw new Error("Fee not found");
      //   console.log("Fee", fee);

      return {
        lastLedgerBaseFee: fees.last_ledger_base_fee,
        lastLedger: fees.last_ledger,
        ledgerCapacityUsage: fees.ledger_capacity_usage,
        maxFee: fees.max_fee.max,
        modeFee: fees.max_fee.mode,
        minFee: fees.max_fee.min,
        feeChargedP99: fees.fee_charged.p99,
        feeChargedP90: fees.fee_charged.p90,
      };
    } catch (error) {
      console.error("Error fetching fee:", error);
      return null;
    }
  }

  // https://developers.stellar.org/docs/learn/fundamentals/fees-resource-limits-metering
  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">Network Fees</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <p className="italic">
            Stroop: the smallest unit of a lumen, one ten-millionth of a lumen
            (.0000001 XLM).
          </p>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={() => fetchFee()}
          >
            Refetch Fees
          </button>
          {feeValues && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Last Base Fee:</h2>
              <p>{feeValues.lastLedgerBaseFee}</p>
              <h2 className="text-xl text-gray-500">Last Ledger:</h2>
              <p>{feeValues.lastLedger}</p>
              <h2 className="text-xl text-gray-500">Ledger Capacity Usage:</h2>
              <p>{feeValues.ledgerCapacityUsage}</p>
              <h2 className="text-xl text-gray-500 mt-4">Min Fee:</h2>
              <p>{feeValues.minFee}</p>
              <h2 className="text-xl text-gray-500">Max Fee:</h2>
              <p>{feeValues.maxFee}</p>
              <h2 className="text-xl text-gray-500">Mode Fee:</h2>
              <p>{feeValues.modeFee}</p>
              <h2 className="text-xl text-gray-500">
                Fee Charged P99 (99th percentile):
              </h2>
              <p>{feeValues.feeChargedP99}</p>
              <h2 className="text-xl text-gray-500">
                Fee Charged P90 (90th percentile):
              </h2>
              <p>{feeValues.feeChargedP90}</p>
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
