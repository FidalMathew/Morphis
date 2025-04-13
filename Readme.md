# 🎭 Morphis - A Web3 Multiplayer Grid Adventure

**Morphis** is a thrilling two-player board game that blends strategy and luck on a grid-based battlefield. With **powerful tile effects**, **provably fair randomness**, and **real-time multiplayer** powered by sockets — every game is an unpredictable challenge!

Built using **React**, **Forge**, **Randamu VRF**, and **Socket.io**, Morphis creates a seamless and trustless Web3 gaming experience. 🧠⚡

---

## 🚀 Game Concept

Morphis pits two players against each other on a dynamically generated grid. The twist? The board contains **randomly assigned special tiles** that can either supercharge your progress or set you back!

🎯 Objective: Be the first to reach the final tile of the grid.

---

## 🧱 Tech Stack

- ⚛️ **React** – Frontend interface
- 🔌 **Socket.io** – Real-time multiplayer sync
- 🛠️ **Forge** – Smart contract development and testing
- 🔐 **Randamu VRF** – On-chain verifiable randomness
- 🌐 **Blockchain** – Decentralized and transparent game logic

---

## 🎮 Game Rules

1. 🧩 The board is a grid (10x10).
2. 👥 Two players join and take alternate turns.
3. 🎲 Each turn involves a **VRF-powered dice roll** to move.
4. ⚡ Landing on a **special tile** triggers effects:
   - 🔁 **Swap** – Switch positions with your opponent
   - ➕ **+5 Steps** – Dash ahead
   - ➖ **-5 Steps** – Slide back
   - 🎁 **Extra Roll** – Play again immediately
5. 🏁 The first player to reach the end tile wins the game!

---

## 🔀 How Morphis Uses Randamu VRF

### 📦 1. Random Special Tile Placement

At game start, **Randamu VRF** is used to generate a seed that randomly places **power-up** and **power-down** tiles across the board. This ensures:

- Every match is unique
- No pre-determined outcomes
- Tamper-proof randomness

### 🎲 2. Decentralized Dice Rolls

Each dice roll in Morphis is a **VRF request to the smart contract**, producing:

- ✅ Unbiased and unpredictable results
- 📜 Verifiable proof of fairness
- 🛡️ Trustless gameplay

---

## 🌐 Real-Time Multiplayer with Sockets

Morphis uses **Socket.io** to manage multiplayer interactions. Player turns, movements, and tile triggers are synced in real time — delivering a smooth and competitive experience! ⚔️

---

## 🧪 How to Play

### 📥 Clone the Repository

```bash
git clone https://github.com/your-username/morphis.git
cd morphis
```

### ▶️ Run the Frontend

```bash
cd client
npm install
npm run dev
```

### ⚙️ Run the Backend

```bash
cd backend
npm install

# ⚠️ Setup environment variable
# Create a .env file with:
# PRIVATE_KEY=your_wallet_private_key

npm run dev
```

## 💡 Why Use Verifiable Randomness?

Centralized randomness is often **opaque** and **untrustworthy**. By using **Randamu VRF**, Morphis ensures:

- 🔐 Security and transparency
- 🔎 On-chain verifiability
- 🎯 Equal fairness for all

Your game outcomes are not just random — they’re **provably fair**.

---
