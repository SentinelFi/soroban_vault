"use client";

import React, { useState, useEffect } from "react";
import SendForm from "../components/SendForm";

import * as StellarSdk from "@stellar/stellar-sdk";
import { SorobanRpc } from "@stellar/stellar-sdk";

import {
  isConnected,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import Nav from "@/components/Nav";

export default function Home() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

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

  const handleSendPayment = async (destination: string, amount: string) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org:443";
      const timeoutInSeconds = 30;
      const networkPhrase = StellarSdk.Networks.TESTNET;

      const server = new SorobanRpc.Server(SOROBAN_RPC_URL);
      const sourceAccount = await server.getAccount(publicKey);

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: networkPhrase,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(timeoutInSeconds)
        .build();

      const signedTransaction = await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      if (!signedTransaction || signedTransaction.error)
        throw `${signedTransaction?.error}`;

      const transactionResult = await server.sendTransaction(
        StellarSdk.TransactionBuilder.fromXDR(
          signedTransaction.signedTxXdr,
          StellarSdk.Networks.TESTNET
        )
      );

      console.log("Transaction successful:", transactionResult);
      alert("Payment sent successfully!");
    } catch (error) {
      console.error("Error sending payment:", error);
      alert("Error sending payment. Please check the console for details.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">Send Payment</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <SendForm onSubmit={handleSendPayment} />
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
