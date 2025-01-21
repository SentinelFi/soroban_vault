// Resources
// https://ipfs.tech/
// Pin any image file to IPFS to obtain CID.
// https://docs.ipfs.tech/concepts/content-addressing/
// https://pinata.cloud/blog/how-to-pin-a-file-to-ipfs/
// IPFS Gateway examples: ipfs.io, pinata.cloud, dweb.link, infura.io
// Example of public gateway: https://gateway.pinata.cloud/ipfs/QmP4eZj61tDxCmtb6aqSwQsrxRQAN2gwxTEXkTed9TujHh
// https://knowledge.pinata.cloud/en/articles/6297294-public-gateways-vs-dedicated-gateways
// https://docs.pinata.cloud/quickstart

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  scValToNative,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  xdr,
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
import Link from "next/link";

export default function ImageIpfs() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<ParsedSorobanError | null>(null);
  const [inputCid, setInputCid] = useState<string>("");
  const [inputTitle, setInputTitle] = useState<string>("");
  const [inputDescription, setInputDescription] = useState<string>("");
  const [resultCid, setResultCid] = useState<string>("");
  const [resultTitle, setResultTitle] = useState<string>("");
  const [resultDescription, setResultDescription] = useState<string>("");
  const [resultCreator, setResultCreator] = useState<string>("");

  const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";
  const CONTRACT_ID =
    "CBX6N24Q6T25SVMRQOLBIIEHLERI6XXKFIPIKEQ5HFHH6LUUQP2PGLHJ";
  const NETWORK_PASSPHRASE = Networks.TESTNET;
  const TIMEOUT_SEC = 30;

  const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

  // Popular public IPFS gateways
  //   const gateways = [
  //     "https://ipfs.io/ipfs/",
  //     "https://gateway.pinata.cloud/ipfs/",
  //     "https://dweb.link/ipfs/",
  //     "https://ipfs.infura.io/ipfs/",
  //   ];

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
      1: "IPFS hash not set",
      2: "Image metadata not set",
      3: "Hash is empty",
      4: "Hash is too long",
      5: "Hash is too short",
    };
    return result;
  };

  async function storeImage(): Promise<void> {
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

      if (!inputCid) {
        throw new Error("CID not found");
      }

      // Title and description can be empty

      if (!SOROBAN_URL) {
        throw new Error("Soroban URL missing");
      }

      if (!CONTRACT_ID) {
        throw new Error("Contract ID missing");
      }

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const title = xdr.ScVal.scvString(inputTitle);
      const description = xdr.ScVal.scvString(inputDescription);
      const creator = xdr.ScVal.scvAddress(
        Address.fromString(publicKey).toScAddress()
      );
      const ipfs_hash = xdr.ScVal.scvString(inputCid);

      const operation = contract.call(
        "store_image",
        title,
        description,
        creator,
        ipfs_hash
      );

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

      if (returnValue) {
        const result = returnValue.b();
        console.log("Result: ", result);
        if (result) {
          alert("Success!");
        }
      }
    } catch (error: any) {
      console.log("Received error", typeof error);
      const parsed = SorobanErrorParser.parse(error, generateErrorMap());
      setError(parsed);
      console.log("Error storing image.", parsed);
      alert("Error calling contract. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function removeMetadata(): Promise<void> {
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

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call("remove_image_metadata");

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

      if (returnValue) {
        const result = returnValue.b();
        console.log("Result: ", result);
        if (result) {
          setResultTitle("");
          setResultDescription("");
          setResultCreator("");
          alert("Success!");
        }
      }
    } catch (error: any) {
      console.log("Received error", typeof error);
      const parsed = SorobanErrorParser.parse(error, generateErrorMap());
      setError(parsed);
      console.log("Error removing metadata.", parsed);
      alert("Error calling contract. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  }

  async function removeCid(): Promise<void> {
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

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call("remove_ipfs_hash");

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .build();

      const preparedTx = await server.prepareTransaction(transaction);

      console.log(preparedTx);

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

      if (returnValue) {
        const result = returnValue.b();
        console.log("Result: ", result);
        if (result) {
          setResultCid("");
          alert("Success!");
        }
      }
    } catch (error: any) {
      console.log("Received error", typeof error);
      const parsed = SorobanErrorParser.parse(error, generateErrorMap());
      setError(parsed);
      console.log("Error removing CID.", parsed);
      alert("Error calling contract. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  }

  const getMetadata = async () => {
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

    try {
      setLoading(true);
      setError(null);

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call("get_image_metadata");

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
        throw parsed;
      }

      console.log("cost:", sim.cost);
      console.log("result:", sim.result);
      console.log("latest ledger:", sim.latestLedger);
      console.log("human readable result:", scValToNative(sim.result?.retval));

      const returnValue: any = scValToNative(sim.result?.retval);
      console.log("Value: ", returnValue);
      setResultTitle(returnValue.title ?? "");
      setResultDescription(returnValue.description ?? "");
      setResultCreator(returnValue.creator ?? "");
    } catch (error) {
      console.log("Error getting metadata.", error);
      alert("Error getting metadata. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const getImageCID = async () => {
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

    try {
      setLoading(true);
      setError(null);

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call("get_ipfs_hash");

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
        throw parsed;
      }

      console.log("cost:", sim.cost);
      console.log("result:", sim.result);
      console.log("latest ledger:", sim.latestLedger);
      console.log("human readable result:", scValToNative(sim.result?.retval));

      const returnValue: string = scValToNative(sim.result?.retval);
      console.log("Value: ", returnValue);
      setResultCid(returnValue);
    } catch (error) {
      console.log("Error getting CID.", error);
      alert("Error getting CID. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Nav />
      <h2 className="text-2xl font-bold mb-4">IPFS Image</h2>
      {publicKey ? (
        <>
          <p className="mb-4">Connected: {publicKey}</p>
          <i>CID example: QmP4eZj61tDxCmtb6aqSwQsrxRQAN2gwxTEXkTed9TujHh</i>
          <div className="mt-4 mb-4">
            <label
              htmlFor="cid"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Image CID
            </label>
            <input
              id="cid"
              type="text"
              placeholder="CID..."
              value={inputCid}
              required
              onChange={(e) => setInputCid(e.target.value)}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-full"
            />
          </div>
          <div className="mt-4 mb-4">
            <label
              htmlFor="ttl"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Title
            </label>
            <input
              id="ttl"
              type="text"
              placeholder="Title..."
              value={inputTitle}
              required
              onChange={(e) => setInputTitle(e.target.value)}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-full"
            />
          </div>
          <div className="mt-4 mb-4">
            <label
              htmlFor="dsc"
              className="block text-sm font-medium text-gray-700"
            >
              Enter Description
            </label>
            <input
              id="dsc"
              type="text"
              placeholder="Description..."
              value={inputDescription}
              required
              onChange={(e) => setInputDescription(e.target.value)}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-full"
            />
          </div>
          <button
            onClick={storeImage}
            disabled={loading || !inputCid}
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
              "Store Image Data"
            )}
          </button>
          <button
            onClick={() => {
              setInputCid("");
              setInputTitle("");
              setInputDescription("");
            }}
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
              "Clear Fields"
            )}
          </button>
          <button
            onClick={getMetadata}
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
              "Get Metadata"
            )}
          </button>
          <button
            onClick={getImageCID}
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
              "Get Image CID"
            )}
          </button>
          <button
            onClick={removeMetadata}
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
              "Remove Image Metadata"
            )}
          </button>
          <button
            onClick={removeCid}
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
              "Remove Image CID"
            )}
          </button>
          {error && (
            <div className="mt-4">
              <h2 className="text-xl text-red-500">Error:</h2>
              <p>
                <i>{error.type}:</i> {error.message ?? error.rawError}
              </p>
            </div>
          )}
          {resultCid && (
            <div>
              <div className="mt-4">
                <h2 className="text-xl text-gray-500">CID:</h2>
                <p>{resultCid}</p>
              </div>
              <div className="mt-4">
                <h2 className="text-xl text-gray-500">Link:</h2>
                <Link
                  className="text-blue-500"
                  target="_blank"
                  href={`${IPFS_GATEWAY}${resultCid}`}
                >{`${IPFS_GATEWAY}${resultCid}`}</Link>
              </div>
              <Image
                src={`${IPFS_GATEWAY}${resultCid}`}
                alt="Image IPFS"
                width={128}
                height={128}
              />
            </div>
          )}
          {resultTitle && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Title:</h2>
              <p>{resultTitle}</p>
            </div>
          )}
          {resultDescription && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Description:</h2>
              <p>{resultDescription}</p>
            </div>
          )}
          {resultCreator && (
            <div className="mt-4">
              <h2 className="text-xl text-gray-500">Creator:</h2>
              <p>{resultCreator}</p>
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
