"use client";

import React, { useState, useEffect } from "react";

import * as StellarSdk from "@stellar/stellar-sdk";

import { isConnected, setAllowed, getAddress } from "@stellar/freighter-api";

import Nav from "@/components/Nav";

interface AssetType {
  code: string;
  balance: string;
}

interface AssetBalances {
  native: string;
  other: AssetType[];
}

export default function Home() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string>("");
  const [otherBalances, setOtherBalances] = useState<AssetType[]>([]);

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
    const fetchBalance = async () => {
      const balances = await fetchBalances();
      setXlmBalance(balances.native);
      setOtherBalances(balances.other);
    };
    fetchBalance();
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

  async function fetchBalances(): Promise<AssetBalances> {
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

      const acc = await server.accounts().accountId(publicKey?.address).call();
      const balances = acc?.balances;

      if (!balances) throw new Error("Account balances not found");

      // Find the native balance
      const nativeBalance: string =
        balances.find((balance) => balance.asset_type === "native")?.balance ??
        "0";

      // Filter out non-native balances
      const otherBalances: AssetType[] = balances
        .filter((balance) => balance.asset_type !== "native")
        .map((bal: any) => ({ code: bal.asset_code, balance: bal.balance }));

      console.log("XLM", nativeBalance);
      console.log("Other", otherBalances);

      return { native: nativeBalance, other: otherBalances };
    } catch (error) {
      console.error("Error fetching balances:", error);
      return { native: "0", other: [] };
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">Asset Balances</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <button
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => fetchBalances()}
          >
            Refetch Balances
          </button>
          {xlmBalance && xlmBalance !== "0" && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Your Native Balance:</h2>
              <p>{xlmBalance} XLM</p>
            </div>
          )}
          {otherBalances && otherBalances.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Your Other Balances:</h2>
              {otherBalances.map((bal, id) => (
                <p key={id + bal.code}>
                  {bal.balance} {bal.code}
                </p>
              ))}
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
