"use client";

import {
  Address,
  BASE_FEE,
  Contract,
  Memo,
  Networks,
  Transaction,
  TransactionBuilder,
  xdr,
  StrKey,
  scValToNative,
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
import {
  EnumKey,
  SorobanTypeConverter,
  StructData,
} from "../../utils/SorobanTypeConverter";

// Replace with the actual contract ID and network details
const CONTRACT_ID = "CDL7PKHEPE4FLXTSRQA5GKITESYJAAZD77PTV7BTNEP7G4QH32NQFLM7";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";
const TIMEOUT_SEC = 30;

export default function ParamsPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [switchType, setSwitchType] = useState<string>("");
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

  function convertSorobanAddressToString(scVal: xdr.ScVal): string {
    const scAddress = scVal.address();
    // acount
    if (scAddress.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
      const ed25519Bytes = scAddress.accountId().ed25519();
      return StrKey.encodeEd25519PublicKey(ed25519Bytes);
    }
    // contract
    else if (scAddress.switch() === xdr.ScAddressType.scAddressTypeContract()) {
      const bytes = scAddress.contractId();
      return StrKey.encodeContract(bytes);
    }
    throw new Error("Not an address");
  }

  function convertSorobanMapToString(returnValue: xdr.ScVal): string {
    const entries = returnValue.map() ?? [];
    const nativeMap = new Map();
    for (const entry of entries) {
      const key = scValToNative(entry.key());
      const value = scValToNative(entry.val());
      console.log("keyval", key, value);
      nativeMap.set(key, value);
    }
    return JSON.stringify(Object.fromEntries(nativeMap));
  }

  function convertSorobanVecToString(val: xdr.ScVal): string {
    const vec = val.vec() ?? [];
    if (!vec || vec.length === 0) {
      return "";
    }
    const strings = vec.map((element) => {
      switch (element.switch()) {
        case xdr.ScValType.scvString():
          return element.str().toString();
        default:
          throw new Error(
            `Unsupported vector element type, implement in code: ${
              element.switch().name
            }`
          );
      }
    });
    return strings.join(" ");
  }

  function convertSorobanU128toString(val: xdr.ScVal): string {
    const u128 = val.u128();
    const hi = BigInt(u128.hi().toString());
    const lo = BigInt(u128.lo().toString());
    const value = (hi << BigInt(64)) | lo;
    return value.toString();
  }

  function convertSorobanI128toString(val: xdr.ScVal): string {
    const i128 = val.i128();
    const hi = BigInt(i128.hi().toString());
    const lo = BigInt(i128.lo().toString());
    const value = (hi << BigInt(64)) | lo;
    return value.toString();
  }

  const callWithHardcodedString = async () => {
    await handleSend("accept_string", SorobanTypeConverter.toString("Hello"));
  };

  const callWithHardcodedSymbol = async () => {
    await handleSend("accept_symbol", SorobanTypeConverter.toSymbol("foo"));
  };

  const callWithHardcodedBytes = async () => {
    const textEncoder = new TextEncoder();
    const uint8Array = textEncoder.encode("bar");
    await handleSend(
      "accept_bytes",
      SorobanTypeConverter.toBytes(Buffer.from(uint8Array))
    );
  };

  const callWithHardcodedAccountAddress = async () => {
    const pubKey = await getAddress();
    if (!pubKey?.address) throw Error("Please connect");
    const adr = Address.fromString(pubKey.address);
    await handleSend(
      "accept_address",
      SorobanTypeConverter.toAddress(adr)
      //SorobanTypeConverter.stringToAddress(pubKey.address)
    );
  };

  const callWithHardcodedContractAddress = async () => {
    if (!CONTRACT_ID) throw Error("Please provide contract ID");
    const adr = Address.fromString(CONTRACT_ID);
    await handleSend(
      "accept_address",
      SorobanTypeConverter.toAddress(adr)
      //SorobanTypeConverter.stringToAddress(CONTRACT_ID)
    );
  };

  const callWithHardcodedBool = async () => {
    await handleSend("accept_bool", SorobanTypeConverter.toBool(true));
  };

  const callWithHardcodedI32 = async () => {
    const num: number = -123;
    await handleSend("accept_signed32", SorobanTypeConverter.toI32(num));
  };

  const callWithHardcodedI128 = async () => {
    const num: bigint = BigInt(-123456789012345);
    await handleSend("accept_signed128", SorobanTypeConverter.toI128(num));
  };

  const callWithHardcodedU32 = async () => {
    const num: number = 123;
    await handleSend("accept_unsigned32", SorobanTypeConverter.toU32(num));
  };

  const callWithHardcodedU128 = async () => {
    const num: bigint = BigInt(123456789012345);
    await handleSend("accept_unsigned128", SorobanTypeConverter.toU128(num));
  };

  const callWithHardcodedEnum = async () => {
    await handleSend("accept_enum", SorobanTypeConverter.toEnum(EnumKey.Three));
  };

  const callWithHardcodedStruct = async () => {
    const data: StructData = { n: 10, s: "test" };
    await handleSend("accept_struct", SorobanTypeConverter.toStruct(data));
  };

  const callWithHardcodedMap = async () => {
    const map: Map<number, string> = new Map<number, string>([
      [10, "apples"],
      [20, "bananas"],
      [30, "oranges"],
    ]);
    await handleSend(
      "accept_map",
      SorobanTypeConverter.stringNumberMapToMap(map)
    );
  };

  const callWithHardcodedVector = async () => {
    const vec: string[] = ["It", "Worked", "Congratz"];
    await handleSend("accept_vec", SorobanTypeConverter.toStringsVec(vec));
  };

  const callWithHardcodedVoid = async () => {
    await handleSend("accept_void", SorobanTypeConverter.toVoid());
  };

  const handleSend = async (method: string, param: xdr.ScVal) => {
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

    if (!method) {
      console.error("Operation missing");
      return;
    }

    setLoading(true);

    try {
      console.log("Init");

      const server = new SorobanRpc.Server(SOROBAN_URL);
      const account = await server.getAccount(publicKey);
      console.log("Acc", account);

      const contract = new Contract(CONTRACT_ID);

      const operation = contract.call(method, param);
      //   const instance = contract.getFootprint();

      console.log("Build");

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .setTimeout(TIMEOUT_SEC)
        .addOperation(operation)
        .addMemo(Memo.text("params"))
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
        const valSwitch = returnValue.switch();
        console.log(valSwitch);
        setSwitchType(valSwitch?.name?.toString());
        const val = returnValue.value();
        console.log(val?.toString(), typeof val);
        // https://github.com/stellar/js-stellar-sdk/blob/master/src/contract/spec.ts
        // special handling mechanism
        switch (valSwitch.value) {
          case xdr.ScValType.scvAddress().value:
            setResult(convertSorobanAddressToString(returnValue));
            break;
          case xdr.ScValType.scvMap().value:
            setResult(convertSorobanMapToString(returnValue));
            break;
          case xdr.ScValType.scvVec().value:
            setResult(convertSorobanVecToString(returnValue));
            break;
          case xdr.ScValType.scvU128().value:
            setResult(convertSorobanU128toString(returnValue));
            break;
          case xdr.ScValType.scvI128().value:
            setResult(convertSorobanI128toString(returnValue));
            break;
          case xdr.ScValType.scvVoid().value:
            setResult("()");
            break;
          default:
            setResult(val!.toString());
        }
      }
    } catch (error) {
      console.error("Error testing params.", error);
      alert("Error testing params. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Nav />
      <h1 className="text-2xl font-bold mb-4">Parameter Types</h1>
      {publicKey ? (
        <div>
          <p className="mb-4">Connected: {publicKey}</p>
          <p className="mb-4">Contract ID: {CONTRACT_ID}</p>
          <p className="mb-4">
            Received back: <span>{switchType}</span> <strong>{result}</strong>
          </p>
          <button
            onClick={callWithHardcodedString}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send String"
            )}
          </button>
          <button
            onClick={callWithHardcodedSymbol}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Symbol"
            )}
          </button>
          <button
            onClick={callWithHardcodedBytes}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Bytes"
            )}
          </button>
          <button
            onClick={callWithHardcodedAccountAddress}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Account Address"
            )}
          </button>
          <button
            onClick={callWithHardcodedContractAddress}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Contract Address"
            )}
          </button>
          <button
            onClick={callWithHardcodedBool}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Bool"
            )}
          </button>
          <button
            onClick={callWithHardcodedI32}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send I32"
            )}
          </button>
          <button
            onClick={callWithHardcodedI128}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send I128"
            )}
          </button>
          <button
            onClick={callWithHardcodedU32}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send U32"
            )}
          </button>
          <button
            onClick={callWithHardcodedU128}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send U128"
            )}
          </button>
          <button
            onClick={callWithHardcodedEnum}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Enum"
            )}
          </button>
          <button
            onClick={callWithHardcodedStruct}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Struct"
            )}
          </button>
          <button
            onClick={callWithHardcodedMap}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Map"
            )}
          </button>
          <button
            onClick={callWithHardcodedVector}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Vector"
            )}
          </button>
          <button
            onClick={callWithHardcodedVoid}
            disabled={loading}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mr-2 mt-2"
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
              "Send Void"
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
