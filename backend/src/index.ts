import cors from "cors";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
import express, { Application } from "express";
import { createServer } from "http";
import { Server } from "socket.io";

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
const snakes: Record<number, number> = {
    16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60,
    87: 24, 93: 73, 95: 75, 98: 78
};

const ladders: Record<number, number> = {
    1: 38, 4: 14, 9: 31, 21: 42, 28: 84,
    36: 44, 51: 67, 71: 91, 80: 100
};

type Player = {
    id: string;
    name: string;
    position: number;
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
        const code = generateLobbyCode();
        const player: Player = { id: socket.id, name, position: 0 };

        const lobby: Lobby = {
            code,
            players: [player],
            currentTurn: 0,
            started: false,
        };

        lobbies[code] = lobby;
        socket.join(code);

        socket.broadcast.emit("lobbyCreated", { code, player });
        console.log(`Lobby ${code} created by ${name}`);
    });

    socket.on("joinLobby", ({ code, name }: { code: string, name: string }) => {
        const lobby = lobbies[code];

        if (!lobby) {
            socket.broadcast.emit("error", "Lobby not found");
            return;
        }

        if (lobby.players.length >= 2) {
            socket.broadcast.emit("error", "Lobby is full");
            return;
        }

        const player: Player = { id: socket.id, name, position: 0 };
        lobby.players.push(player);
        socket.join(code);

        io.to(code).emit("lobbyJoined", { players: lobby.players });

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

        let roll = Math.floor(Math.random() * 6) + 1;
        let pos = lobby.players[playerIndex].position + roll;

        if (pos > 100) {
            pos = lobby.players[playerIndex].position;
        } else if (snakes[pos]) {
            pos = snakes[pos];
        } else if (ladders[pos]) {
            pos = ladders[pos];
        }

        lobby.players[playerIndex].position = pos;

        io.to(code).emit("diceRolled", {
            playerId: socket.id,
            roll,
            position: pos
        });

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

httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
