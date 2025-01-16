"use client";

import React, { useState } from "react";

import Button from "./Button";
import Input from "./Input";

interface SendPaymentFormProps {
  onSubmit: (destination: string, amount: string) => void;
}

const SendForm = ({ onSubmit }: SendPaymentFormProps) => {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(destination, amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="destination"
          className="block text-sm font-medium text-gray-700"
        >
          Destination Address
        </label>
        <Input
          type="text"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          value={destination}
          required
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount (XLM)
        </label>
        <Input
          type="number"
          placeholder="0.0"
          value={amount}
          required
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!destination || !amount}>
        Send Payment
      </Button>
    </form>
  );
};

export default SendForm;
