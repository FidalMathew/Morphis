import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dices, Loader2 } from "lucide-react";
// import socket from "@/socket";
import { io } from "socket.io-client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";

type SpecialNumber = {
  x: number;
  y: number;
  number: number;
  effect: string;
};

const socket = io("http://localhost:8000"); // Use your server URL

export default function Home() {
  // Socket connection

  const [joiningCode, setJoiningCode] = useState("");

  const [lobbyCode, setLobbyCode] = useState("");
  const [gameJoinLoading, setGameJoinLoading] = useState(false);
  const [lobbyJoined, setLobbyJoined] = useState(false);
  const [name, setName] = useState("");
  const [yourId, setYourId] = useState(null as string | null);
  const [players, setPlayers] = useState([] as any[]);
  const [yourTurn, setYourTurn] = useState(false);

  const [currentPlayer, setCurrentPlayer] = useState<"red" | "blue">("red");

  const [myColor, setMyColor] = useState<"red" | "blue" | null>(null);

  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [winner, setWinner] = useState<"red" | "blue" | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [specialBoxes, setSpecialBoxes] = useState([] as SpecialNumber[]);
  const [specialBoxNumbers, setSpecialBoxNumbers] = useState(
    [] as SpecialNumber[]
  );
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ number: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedSpecialBox, setSelectedSpecialBox] =
    useState<SpecialNumber | null>(null);
  const [waitingForRoll, setWaitingForRoll] = useState(true);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [modal, setModal] = useState(false);
  const [specialMessage, setSpecialMessage] = useState("");

  const [isAnimating, setIsAnimating] = useState(false);

  const [modelOpenForPlayer, setModelOpenForPlayer] = useState(null);

  const dragRef = useRef(null);

  const [yourColor, setYourColor] = useState<"red" | "blue" | null>(null);

  useEffect(() => {
    console.log("Lobby Code", lobbyCode);

    socket.onAny((event, ...args) => {
      console.log(`🔍 Received event: ${event}`, args);
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected --> :", socket.id);
    });

    console.log("Socket connected?", socket.connected);
    console.log("Socket ID:", socket.id);

    socket.on("lobbyCreated", ({ code, player }) => {
      setLobbyCode(code);
      console.log("Lobby created:", code);
      setGameJoinLoading(true);

      setYourColor(player.color);

      console.log("Player created:", player, player.id, player.color);
      setYourId(player.id);
      setMyColor(player.color);
      setPlayers([player]);
    });

    socket.on("lobbyJoined", ({ code, player, players }) => {
      setPlayers(players);
      setLobbyCode(code);
      setGameJoinLoading(false);
      setLobbyJoined(true);
      console.log(" --- >", yourId, socket.id, myColor);

      if (socket.id && socket.id === player.id) {
        console.log("updating ----- ");
        setYourId(socket.id);
        setMyColor(player.color);
      }

      console.log("updated: ", yourId, socket.id, myColor);

      console.log("Lobby joined:", code, player, players);

      // console.log("Testing: ", socket.id, players);
      // console.log("Lobby joined:", players);
    });

    socket.on("gameStart", ({ turn, players, specialBoxes }) => {
      setGameStarted(true);
      setPlayers(players);

      console.log("specialBoxes: ", specialBoxes);

      generateSpecialBoxes(specialBoxes);
      // generateSpecialBoxes();
      // setSpecialBoxes(specialBoxes);
      setYourTurn(turn === socket.id);

      if (myColor) {
        setCurrentPlayer(
          turn === socket.id ? myColor : myColor === "red" ? "blue" : "red"
        );
      }

      console.log("Game started:", players);
      console.log("Your turn:", turn === socket.id);
    });

    socket.on(
      "diceRolled",
      ({ prevPosition, roll, position, currentPlayer, players }) => {
        console.log(
          "Dice rolled:",
          prevPosition,
          roll,
          position,
          currentPlayer,
          players
        );

        // setCustomLoading(true); // Set custom loading state to true

        setTimeout(() => {
          // setCustomLoading(false); // Turn off custom loading state after 15 seconds
          setDiceValue(roll);
          // setPlayers((prev) =>
          //   prev.map((p) => (p.id === player.id ? { ...p, position } : p))
          // );

          setPlayers(players);
          handlePlayerMove(position, prevPosition, currentPlayer);
        }, 5000);

        // setSpecialMessage("");
        // setCurrentPlayer()
        // Set valid move destination
        // setValidMoves([position]);
      }
    );

    socket.on(
      "updateHandlePlayerMove",
      ({ position, prevPosition, currentPlayer }) => {
        console.log(
          "updateHandlePlayerMove: ",
          position,
          prevPosition,
          currentPlayer
        );

        setTimeout(() => {
          handlePlayerMove(position, prevPosition, currentPlayer);
        }, 5000);
      }
    );

    socket.on("nextTurn", ({ turn }) => {
      setYourTurn(turn === socket.id);

      setCurrentPlayer((prev) => (prev === "red" ? "blue" : "red"));
      console.log("Your turn:", turn === socket.id);
    });

    socket.on("ModalOpen", ({ player, message }) => {
      console.log("ModalOpen: ", message, player.id, yourId);

      // if (player.id === yourId) {
      //   setSpecialMessage(message);
      //   // alert(message);
      //   console.log("ModalOpen: --inside", message);
      //   setModal(true);
      // }

      setTimeout(() => {
        setModelOpenForPlayer(player.id);
        setSpecialMessage(message);
      }, 1000);
    });

    socket.on("updatePlayerArray", ({ players }) => {
      console.log("updatePlayerArray: ", players);
      setTimeout(() => {
        setPlayers(players);
      }, 5000);
    });

    socket.on("gameOver", ({ winner }) => {
      setWinner(winner);

      setGameStarted(false);
    });

    socket.on("playerLeft", () => {
      alert("Opponent left. Game over.");
      setLobbyCode("");
      setGameStarted(false);
      setLobbyJoined(false);
      // reset();
    });

    socket.on("error", (msg) => alert(msg));

    return () => {
      socket.off("lobbyCreated");
      socket.off("lobbyJoined");
      socket.off("gameStart");
      socket.off("diceRolled");
      socket.off("nextTurn");
      socket.off("gameOver");
      socket.off("playerLeft");
      socket.off("error");
    };
  }, []);

  useEffect(() => {
    console.log("Modal: special ", modal, modelOpenForPlayer, yourId);
    if (yourId !== null && modelOpenForPlayer === yourId) {
      setModal(true);
    } else {
      setModal(false);
    }
  }, [modelOpenForPlayer]);

  // useEffect(() => {
  //   console.log("Modal: special ", modal);
  //   if (modal == false) setSpecialMessage("");
  // }, [modal]);

  useEffect(() => {
    console.log("useEffect: ", yourId, myColor);
  }, [yourId, myColor]);

  // useEffect(() => {
  //   handlePlayerMove(0);
  // }, [players]  );

  const createLobby = () => {
    if (!name.trim()) return alert("Enter a name");

    if (!socket.connected) {
      socket.connect();

      socket.once("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        socket.emit("createLobby", name);
      });
    } else {
      console.log("✅ Already connected:", socket.id);
      socket.emit("createLobby", name);
    }
  };

  // Above is socket code

  const getNumberFromCoords = (x: number, y: number) => {
    const row = 9 - x;
    if (row % 2 === 0) {
      return row * 10 + y + 1;
    } else {
      return row * 10 + (10 - y);
    }
  };

  const getCoordsFromNumber = (number: number) => {
    const adjustedNumber = number - 1;
    const row = Math.floor(adjustedNumber / 10);
    const position = adjustedNumber % 10;

    const x = 9 - row;
    let y;

    if (row % 2 === 0) {
      // Even rows (going left to right)
      y = position;
    } else {
      // Odd rows (going right to left)
      y = 9 - position;
    }

    return { x, y };
  };

  const startingPositions = {
    red: getNumberFromCoords(9, 0),
    blue: getNumberFromCoords(9, 0),
  };

  const [playerPositions, setPlayerPositions] = useState({
    red: getCoordsFromNumber(startingPositions.red),
    blue: getCoordsFromNumber(startingPositions.blue),
  });

  const [playerNumbers, setPlayerNumbers] = useState({
    red: startingPositions.red,
    blue: startingPositions.blue,
  });

  const generateSpecialBoxes = (specialNumbers: any[]) => {
    console.log("Generating special boxes...");

    const specialBoxesWithCoords = Object.values(specialNumbers).map((box) => {
      const { x, y } = getCoordsFromNumber(box.number);
      return {
        x,
        y,
        number: box.number,
        effect: box.effect,
      };
    });

    // const specialNumbers = [] as SpecialNumber[];
    // const numSpecialBoxes = 5;

    // while (specialNumbers.length < numSpecialBoxes) {
    //   const number = Math.floor(Math.random() * 98) + 2; // Skip 1 and 100

    //   // Don't place special boxes at start, end, or player positions
    //   if (
    //     number === 1 ||
    //     number === 100 ||
    //     number === startingPositions.red ||
    //     number === startingPositions.blue ||
    //     specialNumbers.some((special) => special.number === number)
    //   ) {
    //     continue;
    //   }

    //   specialNumbers.push({
    //     x: getCoordsFromNumber(number).x,
    //     y: getCoordsFromNumber(number).y,
    //     number,
    //     effect: Math.random() > 0.5 ? "good" : "bad",
    //   });
    // }

    specialNumbers = specialBoxesWithCoords;

    console.log("Special boxes generated: xxxxx", specialNumbers);

    for (let i = 0; i < specialNumbers.length; i++) {
      const number = specialNumbers[i].number;
      const coords = getCoordsFromNumber(number);
      specialNumbers[i].x = coords.x;
      specialNumbers[i].y = coords.y;
      specialNumbers[i].effect = specialNumbers[i].effect;
    }

    setSpecialBoxNumbers(specialNumbers);

    // Convert to coordinates for rendering
    const boxes = specialNumbers.map((box) => ({
      ...getCoordsFromNumber(box.number),
      number: box.number,
      effect: box.effect,
    }));

    setSpecialBoxes(boxes);
  };

  // const startGame = () => {
  //   setPlayerPositions({
  //     red: getCoordsFromNumber(startingPositions.red),
  //     blue: getCoordsFromNumber(startingPositions.blue),
  //   });
  //   setPlayerNumbers({
  //     red: startingPositions.red,
  //     blue: startingPositions.blue,
  //   });
  //   setCurrentPlayer("red");
  //   setDiceValue(null);
  //   setWinner(null);
  //   setGameStarted(true);
  //   setWaitingForRoll(true);
  //   setValidMoves([]);
  //   generateSpecialBoxes();
  // };

  const [customLoading, setCustomLoading] = useState(false);

  const rollDice = () => {
    if (winner || !gameStarted || !waitingForRoll) return;

    setCustomLoading(true); // Set custom loading state to true

    setTimeout(() => {
      setCustomLoading(false); // Turn off custom loading state after 15 seconds
    }, 5000);

    socket.emit("rollDice", {
      code: lobbyCode,
    });
  };

  const handlePlayerMove = (
    destinationNumber: number,
    prevPosition: number,
    currentPlayer: "red" | "blue"
  ) => {
    // if (!validMoves.includes(destinationNumber) || isAnimating) return;

    // console.log("Moving player to: ", destinationNumber);

    const currentNumber = prevPosition;
    const newNumber = destinationNumber;

    console.log(
      "Current Number: ",
      currentNumber,
      "New Number: ",
      newNumber,
      "Current Player: ",
      currentPlayer
    );

    // Start animation
    setIsAnimating(true);

    // Create animation path
    const steps = Math.abs(newNumber - currentNumber);
    const direction = newNumber > currentNumber ? 1 : -1;

    // Animate through each position
    let currentStep = 0;
    const animateStep = () => {
      if (currentStep <= steps) {
        const stepNumber = currentNumber + currentStep * direction;
        if (stepNumber >= 1 && stepNumber <= 100) {
          const stepCoords = getCoordsFromNumber(stepNumber);
          setPlayerPositions((prev) => ({
            ...prev,
            [currentPlayer]: stepCoords,
          }));
        }
        currentStep++;
        setTimeout(animateStep, 250); // 250ms per step
      } else {
        // Animation complete - update game state
        finishMove();
      }
    };

    // Start animation
    animateStep();

    // Function to handle game logic after animation completes
    const finishMove = () => {
      // Clear valid moves
      setValidMoves([]);

      // Update player number in state
      setPlayerNumbers((prev) => ({
        ...prev,
        [currentPlayer]: newNumber,
      }));

      // Check if landed on a special box
      const specialBox = specialBoxNumbers.find(
        (box) => box.number === newNumber
      );
      if (specialBox) {
        setShowTooltip(true);
        setTooltipPosition({ number: newNumber });
        setSelectedSpecialBox(specialBox);
      }

      // Check for win condition
      if (newNumber === 100) {
        setWinner(currentPlayer);
      }

      // Switch player unless dice value is 6
      // if (diceValue !== 6) {
      //   setCurrentPlayer((prev) => (prev === "red" ? "blue" : "red"));
      // }

      setWaitingForRoll(true);
      setIsAnimating(false);
    };
  };

  // const handleDragStart = (
  //   e: React.DragEvent<HTMLDivElement>,
  //   player: "red" | "blue" | null
  // ) => {
  //   if (player !== currentPlayer || validMoves.length === 0) {
  //     e.preventDefault();
  //     return;
  //   }
  //   setDraggedPlayer(player);

  //   // Required for Firefox
  //   if (e.dataTransfer) {
  //     e.dataTransfer.setData("text/plain", player);
  //     e.dataTransfer.effectAllowed = "move";
  //   }
  // };

  // // Handle drag over
  // const handleDragOver = (
  //   e: React.DragEvent<HTMLDivElement>,
  //   number: number
  // ) => {
  //   e.preventDefault();
  //   if (validMoves.includes(number)) {
  //     e.dataTransfer.dropEffect = "move";
  //   } else {
  //     e.dataTransfer.dropEffect = "none";
  //   }
  // };

  // // Handle drop
  // const handleDrop = (e: React.DragEvent<HTMLDivElement>, number: number) => {
  //   e.preventDefault();
  //   if (validMoves.includes(number) && draggedPlayer === currentPlayer) {
  //     handlePlayerMove(number);
  //   }
  //   setDraggedPlayer(null);
  // };

  // // For mobile touch events
  // const handleTouchStart = (player: "red" | "blue" | null) => {
  //   if (player !== currentPlayer || validMoves.length === 0) return;
  //   setDraggedPlayer(player as any);
  // };

  // const handleTouchEnd = (
  //   e: React.TouchEvent<HTMLDivElement>,
  //   number: number
  // ) => {
  //   if (validMoves.includes(number) && draggedPlayer === currentPlayer) {
  //     handlePlayerMove(number);
  //   }
  //   setDraggedPlayer(null);
  // };

  // Handle click on tooltip
  const handleTooltipClick = () => {
    setShowTooltip(false);
    setShowModal(true);
  };

  // Handle modal close
  const closeModal = () => {
    setShowModal(false);
    setSelectedSpecialBox(null);
  };

  const handleMove = () => {
    console.log("jaydeep", playerPositions, playerNumbers);
  };

  // Apply special box effect
  const applySpecialEffect = () => {
    if (!selectedSpecialBox) return;

    // Use the player who triggered the special box
    const player =
      selectedSpecialBox.effect === "good" ||
      selectedSpecialBox.effect === "bad"
        ? currentPlayer
        : currentPlayer;
    const currentNumber = playerNumbers[player];
    let newNumber;

    if (selectedSpecialBox.effect === "good") {
      // Move forward 5 spaces
      newNumber = Math.min(100, currentNumber + 5);
    } else {
      // Move back 5 spaces
      newNumber = Math.max(1, currentNumber - 5);
    }

    // Update position
    const newCoords = getCoordsFromNumber(newNumber);

    setPlayerPositions((prev) => ({
      ...prev,
      [player]: newCoords,
    }));

    setPlayerNumbers((prev) => ({
      ...prev,
      [player]: newNumber,
    }));

    // Check for win condition
    if (newNumber === 100) {
      setWinner(player);
    }

    closeModal();
  };

  // If Room Code is not Present, Show Create Room Button or Join Room Button

  if (!lobbyJoined) {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Content section - takes 3/4 of the screen */}
        <div className="w-3/4 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Dices className="h-8 w-8 text-emerald-600" />
                <h1 className="text-3xl font-bold text-slate-800">Morphis</h1>
              </div>
              <p className="text-slate-600">
                The strategic board game of transformation
              </p>
            </div>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Welcome to Morphis</CardTitle>
                <CardDescription>
                  Enter your name to create or join a game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium mb-1"
                  >
                    Your Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full"
                  />
                </div>

                <Tabs defaultValue="create" className="w-full mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create Room</TabsTrigger>
                    <TabsTrigger value="join">Join Room</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="mt-4">
                    <p className="text-sm text-slate-500 mb-4">
                      Create a new game room and invite friends to join you
                    </p>
                    {lobbyCode && (
                      <p className="text-center font-semibold text-3xl py-5">
                        {lobbyCode}
                      </p>
                    )}
                    {gameJoinLoading ? (
                      <Button
                        onClick={createLobby}
                        className="w-full bg-emerald-400"
                      >
                        <Loader2 className="animate-spin mr-2" />
                        Please wait
                      </Button>
                    ) : (
                      <Button
                        onClick={createLobby}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        Create New Room
                      </Button>
                    )}
                  </TabsContent>

                  <TabsContent value="join" className="mt-4">
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="roomCode"
                          className="block text-sm font-medium mb-1"
                        >
                          Room Code
                        </label>
                        <Input
                          id="roomCode"
                          type="text"
                          value={joiningCode}
                          onChange={(e) => setJoiningCode(e.target.value)}
                          placeholder="Enter room code"
                          className="w-full"
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (!name.trim()) return alert("Enter a name");
                          socket.emit("joinLobby", { code: joiningCode, name });
                        }}
                        className="w-full"
                      >
                        Join Room
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Image section - takes 1/4 of the screen */}
        <div
          className="w-1/4 h-screen flex items-center justify-center "
          style={{ backgroundColor: "#009966" }}
        >
          <img
            src="/banner.png"
            alt="Morphis Logo"
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    );
  }

  const usePowerUp = (powerUpName: string) => {
    console.log("Using power up");
    socket.emit("usePowerUp", {
      code: lobbyCode,
      player: yourId,
      powerUp: powerUpName,
    });
  };

  return (
    <div className=" bg-green-50">
      <div className="text-4xl font-bold text-center pt-4 text-green-900">
        Morphis
      </div>
      <div className="flex justify-center items-center h-screen w-full">
        {/* <Button
        // onClick={startGame}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Start Game
      </Button> */}
        <div></div>
        <div className="mb-4 flex flex-col flex-wrap gap-4">
          {!gameStarted ? (
            <></>
          ) : (
            <>
              {/* <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  currentPlayer === "red" ? "bg-red-300" : "bg-blue-300"
                }`}
              ></div>
              <span>Current: {currentPlayer === "red" ? "Pink" : "Blue"}</span>
            </div> */}

              {/* <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <span>Pink: {playerNumbers.red}</span>
            </div>

            <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <span>Blue: {playerNumbers.blue}</span>
            </div> */}

              {/* <Button
              onClick={() => {
                console.log(
                  "dsaassddas ",
                  yourId,
                  myColor,
                  players,
                  lobbyCode,
                  "currentPlayer: ",
                  currentPlayer
                );
              }}
            >
              {" "}
              Console
            </Button>

            <Button onClick={handleMove}> Move</Button> */}

              {validMoves.length > 0 && (
                <div className="px-4 py-2 bg-yellow-100 rounded">
                  Drag {currentPlayer === "red" ? "Pink" : "Blue"} to square{" "}
                  {validMoves[0]}
                </div>
              )}
            </>
          )}
        </div>

        {winner && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded text-center">
            <p className="text-lg font-bold">
              {winner === "red" ? "Pink" : "Blue"} player wins!
            </p>
            <Button
              // onClick={startGame}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Play Again
            </Button>
          </div>
        )}

        <div className="border-4 border-orange-400 grid grid-cols-10 place-items-center aspect-square h-3/4">
          {[...Array(10)].map((_, x) =>
            [...Array(10)].map((_, y) => {
              const number = getNumberFromCoords(x, y);
              const isStart = number === 1;
              const isEnd = number === 100;
              const isSpecialBox = specialBoxes.some(
                (box) => box.x === x && box.y === y
              );
              const redPlayerHere =
                playerPositions.red.x === x && playerPositions.red.y === y;
              const bluePlayerHere =
                playerPositions.blue.x === x && playerPositions.blue.y === y;
              const isValidMove = validMoves.includes(number);
              const showTooltipHere =
                showTooltip &&
                isSpecialBox &&
                specialBoxes.some(
                  (box) =>
                    box.x === x &&
                    box.y === y &&
                    tooltipPosition.number === getNumberFromCoords(x, y)
                );

              return (
                <div
                  key={`${x}-${y}`}
                  className={`relative w-full h-full ${
                    playerPositions.red.x === playerPositions.blue.x &&
                    playerPositions.red.y === playerPositions.blue.y
                      ? ""
                      : "flex items-center justify-center"
                  }
                ${isSpecialBox ? "bg-purple-200" : ""}
                ${!isSpecialBox && isEnd ? "bg-yellow-100" : ""}
                ${!isSpecialBox && isStart ? "bg-green-100" : ""}
                ${!isSpecialBox && (x + y) % 2 === 0 ? "bg-white" : ""}
                ${!isSpecialBox && (x + y) % 2 !== 0 ? "bg-green-200" : ""}
                ${
                  isValidMove
                    ? "z-[100] border-2 border-black cursor-pointer"
                    : ""
                }
              `}
                  // onDragOver={(e) => handleDragOver(e, number)}
                  // onDrop={(e) => handleDrop(e, number)}
                  // onTouchEnd={(e) => handleTouchEnd(e, number)}
                  onClick={() => {
                    // handleDestinationClick(number);
                  }}
                >
                  <div className="grid place-content-center h-full w-full text-lg font-semibold text-gray-700 p-1">
                    {/* {x}, {y} */}
                    {number}
                  </div>

                  {redPlayerHere && (
                    <div
                      className={`w-6 h-6 rounded-full bg-red-300 z-10 absolute transition-all duration-250 ease-in-out ${
                        redPlayerHere && bluePlayerHere
                          ? "top-0 left-0"
                          : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      } ${
                        currentPlayer === "red" &&
                        validMoves.length > 0 &&
                        !isAnimating
                          ? "cursor-move"
                          : ""
                      }`}
                      draggable={
                        currentPlayer === "red" &&
                        validMoves.length > 0 &&
                        !isAnimating
                      }
                      // onDragStart={(e) =>
                      //   !isAnimating && handleDragStart(e, "red")
                      // }
                      // onTouchStart={() => !isAnimating && handleTouchStart("red")}
                      ref={currentPlayer === "red" ? dragRef : null}
                    ></div>
                  )}

                  {bluePlayerHere && (
                    <div
                      className={`w-6 h-6 rounded-full bg-blue-300 z-10 absolute transition-all duration-250 ease-in-out ${
                        redPlayerHere && bluePlayerHere
                          ? "top-1/2 right-0"
                          : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      } ${
                        currentPlayer === "blue" &&
                        validMoves.length > 0 &&
                        !isAnimating
                          ? "cursor-move"
                          : ""
                      }`}
                      draggable={
                        currentPlayer === "blue" &&
                        validMoves.length > 0 &&
                        !isAnimating
                      }
                      // onDragStart={(e) =>
                      //   !isAnimating && handleDragStart(e, "blue")
                      // }
                      // onTouchStart={() =>
                      //   !isAnimating && handleTouchStart("blue")
                      // }
                      ref={currentPlayer === "blue" ? dragRef : null}
                    ></div>
                  )}

                  {showTooltipHere && (
                    <div
                      className="absolute z-20 bg-white border border-gray-300 rounded p-2 shadow-lg cursor-pointer"
                      onClick={() => handleTooltipClick()}
                    >
                      Click to see what happens
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4 p-4 w-[300px]">
          {/* Advantages Section */}
          <Card className="w-full bg-green-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-green-200">
              <CardTitle className="text-2xl font-semibold text-center text-green-900">
                🧩 Power Ups
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4">
              <div className="grid gap-4">
                {players
                  .find((player) => player.id === yourId)
                  .powerUps.map(
                    (
                      powerUp: { name: string; timeLeft: number },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="flex flex-col justify-center items-center gap-2 bg-white rounded-xl p-3 border border-green-100"
                      >
                        <Badge
                          variant="outline"
                          className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs cursor-pointer"
                          onClick={() => usePowerUp(powerUp.name)}
                        >
                          {powerUp.name}
                        </Badge>
                        <span className="text-sm text-gray-700">
                          Turns till it exhaust: {powerUp.timeLeft}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Current Player and Dice Section */}
          <Card className="w-full max-w-lg bg-amber-100 shadow-md rounded-2xl">
            <CardHeader className="pb-1 border-b border-amber-200">
              <CardTitle className="text-2xl font-semibold text-center text-amber-900">
                🎲 Current Turn
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="text-center">
                {yourColor === "red" ? (
                  <p>
                    You are <span className="text-red-700 font-bold">Red</span>
                  </p>
                ) : (
                  <p>
                    You are{" "}
                    <span className="text-blue-500 font-bold">Blue</span>
                  </p>
                )}
                <br />

                <p className="text-sm text-gray-700">
                  {yourTurn ? "  Turn" : "Opponent's Turn"}
                </p>
                <p
                  className={`text-lg font-bold ${
                    currentPlayer === "red" ? "text-red-700" : "text-blue-500"
                  }`}
                >
                  {currentPlayer.slice(0, 1).toUpperCase() +
                    currentPlayer.slice(1)}{" "}
                </p>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-amber-700 mb-1">
                  Dice Value
                </span>
                {/* {"renderDice(diceValue)"} */}

                {!customLoading && diceValue && diceValue}
                {customLoading ? (
                  <Button disabled>
                    <Loader2 className="animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button
                    onClick={rollDice}
                    variant={"outline"}
                    disabled={!yourTurn || winner !== null}
                    className={`px-4 py-2 text-black ${
                      yourTurn && !winner ? "" : "bg-gray-300 "
                    } text-white rounded`}
                    style={{
                      color: "black",
                    }}
                  >
                    Roll Dice
                  </Button>
                )}

                {/* <Button onClick={() => console.log("modal value: ", modal)}>
                  {" "}
                  Modal value
                </Button> */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* <div className="mt-4 text-sm text-gray-600">
        <p>Rules:</p>
        <ul className="list-disc pl-5">
          <li>Roll the dice and drag your piece to the destination.</li>
          <li>If you roll a 6, you get an extra turn.</li>
          <li>First player to reach square 100 wins.</li>
          <li>Purple squares are special spaces with effects.</li>
        </ul>
      </div> */}

        {/* {showModal && selectedSpecialBox && (
        <Dialog onOpenChange={setShowModal} open={showModal}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold mb-2">
                Special Space!
              </DialogTitle>
            </DialogHeader>
            <p className="mb-4">
              You landed on a{" "}
              {selectedSpecialBox.effect === "good" ? "good" : "bad"} space!
              {selectedSpecialBox.effect === "good"
                ? " Move forward 5 spaces."
                : " Move back 5 spaces."}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </Button>
              <Button
                // onClick={applySpecialEffect}
                className={`px-4 py-2 text-white rounded ${
                  selectedSpecialBox.effect === "good"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Apply Effect
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )} */}

        {specialMessage !== "" && !isAnimating && !yourTurn && (
          <Dialog
            open={modal}
            onOpenChange={(isOpen) => {
              setModal(isOpen); // Update the modal state based on the dialog's open state
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>🎉 You landed into a special box</DialogTitle>
                <DialogDescription>
                  {/* {players
                  .find((player) => player.id === yourId)
                  .powerUps.map(
                    (
                      powerUp: { name: string; timeLeft: number },
                      index: number
                    ) => (
                      <p
                        className="py-5 text-center font-semibold text-xl"
                        key={index}
                      >
                        <span className="text-sm text-gray-700">
                          You got {powerUp.name} for {powerUp.timeLeft} turns
                        </span>
                      </p>
                    )
                  )}
                   */}
                  <p className="py-5 text-center font-semibold text-xl text-black">
                    {specialMessage}
                  </p>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
