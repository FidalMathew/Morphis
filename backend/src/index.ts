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


// const specialBoxes: Record<number, string> = {
//     2: "Swap",
//     3: "Swap",
//     4: "Swap",
//     5: "Swap",
//     6: "+5",
//     7: "+5",
//     8: "+5",
//     9: "-5",
//     10: "-5",
//     12: "Extra Roll",
//     16: "Swap",
//     17: "Swap",
//     18: "Swap",
//     19: "Swap",
//     20: "Swap",
//     21: "Swap",


//     // 15: "PowerUp5",
//     // 18: "PowerUp6",
//     // 21: "PowerUp7",
//     // 24: "PowerUp8",
//     // 27: "PowerUp9",
//     // 30: "PowerUp10",
// }

let specialBoxesGlobal: Record<number, string> = {};





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

    socket.on("joinLobby", async({ code, name }: { code: string, name: string }) => {
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

            try {

                let value = await readRandomness();
            value = value.toString();
            
            const labels = ["Swap", "+5", "Extra Roll"];
            const specialBoxes: Record<number, { number: number; effect: string }> = {};
            
            const bytes = Array.from(Buffer.from(value.slice(2), "hex")); // Remove '0x' and convert hex to bytes
            
            const positions = new Set<number>();
            
            let i = 0;
            while (positions.size < 20 && i < bytes.length * 2) {
                const byte1 = bytes[i % bytes.length];
                const byte2 = bytes[(i + 1) % bytes.length];
                const combined = (byte1 << 8) | byte2; // combine 2 bytes into a number
                const position = 5 + (combined % 91); // value between 5 and 95 inclusive
            
                if (!positions.has(position)) {
                    const label = labels[combined % labels.length];
                    specialBoxes[position] = {
                        number: position,
                        effect: label
                    };
                    positions.add(position);
                }
                i++;
            }

            let ans: any[]= [];

            console.log("gggggg")
            
            // ✅ Clean individual output
            Object.values(specialBoxes).forEach((box) => {
                // console.log(box);
                ans.push(box);

                console.log(box);
            });

            specialBoxesGlobal = ans.reduce((acc: any, box: any) => {
                acc[box.number] = box.effect;
                return acc;
            }, {});
            console.log("Special boxes:", specialBoxesGlobal);
            

            lobby.started = true;
            io.to(code).emit("gameStart", {
                turn: lobby.players[lobby.currentTurn].id,
                players: lobby.players,
                specialBoxes: ans,
            });
                
            } catch (error) {
                
                console.error("Error fetching randomness:", error);
                socket.emit("error", "Error fetching randomness");
            }

            
        }
    });

    socket.on("rollDice", async ({ code }: { code: string }) => {
        const lobby = lobbies[code];
        if (!lobby || !lobby.started) return;

        const playerIndex = lobby.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== lobby.currentTurn) {
            socket.emit("notYourTurn");
            return;
        }

        const prevPosition = lobby.players[playerIndex].position;

        let roll = getRandomNumber();
        let pos = lobby.players[playerIndex].position + await roll;



        if (pos > 100) {
            pos = lobby.players[playerIndex].position;
        } 
       else if(specialBoxesGlobal[pos]) {
            console.log("Special box found at position:", pos, specialBoxesGlobal[pos]);

            if (specialBoxesGlobal[pos] === "Swap") {
                // Swap positions with the other player
                // if player contains swap, increase its time by 2



                lobby.players[playerIndex].powerUps.push( {name: "Swap", timeLeft: 3} );
                console.log("Swap acquired");
                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You acquired a powerUp: Swap. Use it within the next 2 moves" });

            } else if (specialBoxesGlobal[pos] === "+5") {
                pos += 5;

                io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You moved 5 spaces forward!" });
            } 
            
            // else if (specialBoxesGlobal[pos] === "-5") {
            //     pos -= 5;
            //     io.to(code).emit("ModalOpen", { player: lobby.players[playerIndex], message: "You moved 5 spaces backward!" });
            // } 
            else if (specialBoxesGlobal[pos] === "Extra Roll") {
              
                // roll += getRandomNumber();
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
    

    socket.on("usePowerUp", async ({ code, playerId, powerUp }: { code: string, playerId: string, powerUp: string }) =>{

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
            const extraRoll = getRandomNumber();
            let pos = lobby.players[playerIndex].position + await extraRoll;

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


const getRandomNumber = async () => {

    try {
        const value = await readRandomness();
        const lastHash = value.toString();

        await rollDice();
        
        const lastHexChar = lastHash.slice(-1);
        // Convert it to an integer (base 16)
        const lastDigit = parseInt(lastHexChar, 16);
    
        // Get a random value from 1 to 6 using modulo
        const randomValue = (lastDigit % 6) + 1;

        return randomValue;

    } catch (error) {
        
        console.error("Error fetching randomness:", error);
        throw new Error("Error fetching randomness");
    }
}

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});