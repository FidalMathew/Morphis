import cors from "cors";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
import express, { Application } from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import { readRandomness, rollDice } from "./contractCall";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

// Constants
// const snakes: Record<number, number> = {
//     16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60,
//     87: 24, 93: 73, 95: 75, 98: 78
// };

// const ladders: Record<number, number> = {
//     1: 38, 4: 14, 9: 31, 21: 42, 28: 84,
//     36: 44, 51: 67, 71: 91, 80: 100
// };

const specialBoxes: Record<number, string> = {
    2: "Swap",
    3: "Swap",
    4: "Swap",
    5: "Swap",
    6: "+5",
    7: "+5",
    8: "+5",
    9: "-5",
    10: "-5",
    12: "Extra Roll",
    16: "Swap",
    17: "Swap",
    18: "Swap",
    19: "Swap",
    20: "Swap",
    21: "Swap",


    // 15: "PowerUp5",
    // 18: "PowerUp6",
    // 21: "PowerUp7",
    // 24: "PowerUp8",
    // 27: "PowerUp9",
    // 30: "PowerUp10",
}





type Player = {
    id: string;
    name: string;
    color: string;
    position: number;
    powerUps: any[];
};

type Lobby = {
    code: string;
    players: Player[];
    currentTurn: number;
    started: boolean;

};

const lobbies: Record<string, Lobby> = {};

// Generate unique 5-letter code
const generateLobbyCode = (): string => {
    return randomBytes(3).toString("hex").toUpperCase();
};

// Socket logic
io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);

    socket.on("createLobby", (name: string) => {

        const color = "red";

        const code = generateLobbyCode();
        const player: Player = { id: socket.id, name, color, position: 1 , powerUps: [

            // {name: "Swap", timeLeft: 3},
            // {name: "Extra Roll", timeLeft: 3}
        ]};

        const lobby: Lobby = {
            code,
            players: [player],
            currentTurn: 0,
            started: false,
        };

        lobbies[code] = lobby;
        socket.join(code);

        socket.emit("lobbyCreated", { code, player });
        console.log(`Lobby ${code} created by ${name}`);
    });

    socket.on("joinLobby", ({ code, name }: { code: string, name: string }) => {
        const lobby = lobbies[code];

        const color = "blue";

        if (!lobby) {
            socket.broadcast.emit("error", "Lobby not found");
            return;
        }

        if (lobby.players.length >= 2) {
            socket.broadcast.emit("error", "Lobby is full");
            return;
        }

        const player: Player = { id: socket.id, name, color, position: 1 , powerUps: []};
        lobby.players.push(player);
        socket.join(code);

        console.log(`Player ${name} joined lobby ${code}`);

        io.to(code).emit("lobbyJoined", { code:code, player: player,  players: lobby.players });

        if (lobby.players.length === 2) {
            lobby.started = true;
            io.to(code).emit("gameStart", {
                turn: lobby.players[lobby.currentTurn].id,
                players: lobby.players
            });
        }
    });

    socket.on("rollDice", ({ code }: { code: string }) => {
        const lobby = lobbies[code];
        if (!lobby || !lobby.started) return;

        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== lobby.currentTurn) {
            socket.emit("notYourTurn");
            return;
        }

        const prevPosition = lobby.players[playerIndex].position;

        let roll = Math.floor(Math.random() * 6) + 1;
        let pos = lobby.players[playerIndex].position + roll;



        if (pos > 100) {
            pos = lobby.players[playerIndex].position;
        } 
       else if(specialBoxes[pos]) {
            console.log("Special box found at position:", pos, specialBoxes[pos]);

            if (specialBoxes[pos] === "Swap") {
                // Swap positions with the other player
                // if player contains swap, increase its time by 2



                lobby.players[playerIndex].powerUps.push( {name: "Swap", timeLeft: 3} );
                console.log("Swap acquired");
                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You acquired a powerUp: Swap. Use it within the next 2 moves" });

            } else if (specialBoxes[pos] === "+5") {
                pos += 5;

                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You moved 5 spaces forward!" });
            } else if (specialBoxes[pos] === "-5") {
                pos -= 5;
                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You moved 5 spaces backward!" });
            } else if (specialBoxes[pos] === "Extra Roll") {
                // roll += Math.floor(Math.random() * 6) + 1;
                console.log("Extra Roll acquired");
                lobby.players[playerIndex].powerUps.push( {name: "Extra Roll", timeLeft: 3} );
                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You acquired a powerUp: Extra Roll. Use it within the next 2 moves" });
            }
            else{

            }
        }
        
        console.log(`Player ${lobby.players[playerIndex].name} rolled a ${roll} and moved to position ${pos}`);

        lobby.players[playerIndex].position = pos;

        io.to(code).emit("diceRolled", {
            prevPosition,
            roll,
            position: pos,
            currentPlayer: lobby.players[playerIndex].color,
            players: lobby.players,
        });


        // reduce powerup time left

        lobby.players[playerIndex].powerUps.forEach((powerUp: any) => {
            powerUp.timeLeft -= 1;
        });

        // remove powerup if time left is 0
        lobby.players[playerIndex].powerUps = lobby.players[playerIndex].powerUps.filter((powerUp: any) => powerUp.timeLeft > 0);
        console.log("Updated players:", lobby.players);
        io.to(code).emit("updatePlayerArray", {
            players: lobby.players,
        })

        if (pos === 100) {
            io.to(code).emit("gameOver", { winner: lobby.players[playerIndex].name });
            delete lobbies[code];
        } else {
            lobby.currentTurn = (lobby.currentTurn + 1) % 2;
            io.to(code).emit("nextTurn", {
                turn: lobby.players[lobby.currentTurn].id
            });
        }
    });
    

    socket.on("usePowerUp", ({ code, playerId, powerUp }: { code: string, playerId: string, powerUp: string }) =>{

        const lobby = lobbies[code];
        if (!lobby || !lobby.started) return;

        const playerIndex = lobby.players.findIndex(p => p.id === socket.id); // use socketId instead if it doesn't work

        console.log("Player index:", playerIndex, lobby.currentTurn);
        if (playerIndex !== lobby.currentTurn) {
            socket.emit("notYourTurn");
            return;
        }


        const prevPlayers = lobby.players.map((player) => ({
            id: player.id,
            color: player.color,
            name: player.name,
            position: player.position,
            powerUps: player.powerUps,
        }));

        console.log("prevPlayers", prevPlayers);

        if (powerUp === "Swap") {
            const otherPlayerIndex = (playerIndex + 1) % 2;
            const tempPosition = lobby.players[playerIndex].position;
            lobby.players[playerIndex].position = lobby.players[otherPlayerIndex].position;
            lobby.players[otherPlayerIndex].position = tempPosition;

            io.to(code).emit("powerUpUsed", {
                player: lobby.players[playerIndex],
                otherPlayer: lobby.players[otherPlayerIndex],
                powerUp: "Swap"
            });
        } else if (powerUp === "Extra Roll") {
            const extraRoll = Math.floor(Math.random() * 6) + 1;
            let pos = lobby.players[playerIndex].position + extraRoll;

            if (pos > 100) {
                pos = lobby.players[playerIndex].position;
            } 
           
            console.log(`Player ${lobby.players[playerIndex].name} used Extra Roll and rolled a ${extraRoll} and moved to position ${pos}`);

            lobby.players[playerIndex].position = pos;

            // io.to(code).emit("diceRolled", {
            //     prevPosition: lobby.players[playerIndex].position,
            //     roll: extraRoll,
            //     position: pos,
            //     currentPlayer: lobby.players[playerIndex].color,
            //     players: lobby.players,
            // });

        }

        // Remove the power-up from the player's list
        const powerUpIndex = lobby.players[playerIndex].powerUps.findIndex((p: any) => p.name === powerUp);
        if (powerUpIndex !== -1) {
            lobby.players[playerIndex].powerUps.splice(powerUpIndex, 1);
        }

        io.to(code).emit("updatePlayerArray", {
            players: lobby.players,
        })

        console.log("dassada", prevPlayers)
        console.log("Updated players:", lobby.players);

        for(const player of lobby.players) {
            for(const prevPlayer of prevPlayers) {

                console.log("Comparing players:", player.id, prevPlayer.id);
                if(player.id === prevPlayer.id) {

                    console.log("Player ID:", player.id, prevPlayer.id, ": ", player.position, prevPlayer.position);
                    if(player.position !== prevPlayer.position) {

                        console.log("Player moved:", player.position, prevPlayer.position);
                        io.to(code).emit("updateHandlePlayerMove",{
                            position: player.position,
                            prevPosition: prevPlayer.position,
                            currentPlayer: player.color
                        })
                    }
                }
            }
        }


    })


    socket.on("disconnect", () => {
        for (const code in lobbies) {
            const lobby = lobbies[code];
            const playerIndex = lobby.players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                lobby.players.splice(playerIndex, 1);
                io.to(code).emit("playerLeft");

                if (lobby.players.length === 0) {
                    delete lobbies[code];
                } else {
                    lobby.started = false;
                }

                break;
            }
        }
    });
});

app.get("/", (_, res) => {
    res.send("Snake and Ladders Socket Server with Lobbies 🐍🪜");
});


app.get("/readRandomness", async(_, res) => {
    try {
        
        const value = await readRandomness();
        console.log("Current value:", value.toString());
        res.status(200).json({ value: value.toString() });
        
    } catch (error) {
        res.status(500).json({ error: "Error fetching randomness" });
        console.error("Error fetching randomness:", error);
    }
});


app.get("/rollDice", async(_, res) => {
    try {

        await rollDice();
        console.log("Dice rolled");
        res.status(200).json({ message: "Dice rolled" });

    } catch (error) {
        res.status(500).json({ error: "Error fetching randomness" });
        console.error("Error fetching randomness:", error);
    }
});

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
