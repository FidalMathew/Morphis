// const { ethers } = require("ethers");
// const abi = require('./RandomnessConsumer.json');// Replace with your values

// const dotenv = require('dotenv');
// dotenv.config();

import dotenv from 'dotenv';
import { ethers } from "ethers";
import abi from './RandomnessConsumer.json'; // Replace with your values
dotenv.config();


const PRIVATE_KEY = process.env.PRIVATE_KEY;
// const PRIVATE_KEY = "1e14b93e0129cf29eb247a8dac88d1a3edef6f5a206c7fc35bcc52878641e77d";
const CONTRACT_ADDRESS = "0x91cF36c6391071d9Be70a9863BBC67E706217282";

// ABI of the contract

// Provider (e.g., for Ethereum mainnet or testnet)
const provider = new ethers.providers.JsonRpcProvider(`https://api.calibration.node.glif.io/rpc/v1`);

// Wallet signer
if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not defined in the environment variables.");
}
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract instance
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi.abi, wallet);

// console.log("Contract address:", contract);

// Read function call
async function readRandomness() {
//   const value = await contract.requestId();
//   console.log("Current value:", value.toString());

    const value = await contract.randomness();
    console.log("Current value:", value.toString());

    return value.toString();
}

// // Write function call
async function rollDice() {
  const tx = await contract.rollDice();
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("Transaction confirmed!");
}

// Example usage
// (async () => {
//   await readValue();
// //   await writeValue(); // Set a new value
// //   await writeValue(42); // Set a new value
// //   await readValue();
// })();

export { readRandomness, rollDice };
