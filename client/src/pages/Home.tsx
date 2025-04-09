import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useRef, useState } from "react";

type SpecialNumber = {
  x: number;
  y: number;
  number: number;
  effect: string;
};

export default function Home() {
  const [currentPlayer, setCurrentPlayer] = useState<"red" | "blue">("red");
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
  const [draggedPlayer, setDraggedPlayer] = useState<"red" | "blue" | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(false);

  const dragRef = useRef(null);

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

  const generateSpecialBoxes = () => {
    const specialNumbers = [] as SpecialNumber[];
    const numSpecialBoxes = 5;

    while (specialNumbers.length < numSpecialBoxes) {
      const number = Math.floor(Math.random() * 98) + 2; // Skip 1 and 100

      // Don't place special boxes at start, end, or player positions
      if (
        number === 1 ||
        number === 100 ||
        number === startingPositions.red ||
        number === startingPositions.blue ||
        specialNumbers.some((special) => special.number === number)
      ) {
        continue;
      }

      specialNumbers.push({
        x: getCoordsFromNumber(number).x,
        y: getCoordsFromNumber(number).y,
        number,
        effect: Math.random() > 0.5 ? "good" : "bad",
      });
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

  const startGame = () => {
    setPlayerPositions({
      red: getCoordsFromNumber(startingPositions.red),
      blue: getCoordsFromNumber(startingPositions.blue),
    });
    setPlayerNumbers({
      red: startingPositions.red,
      blue: startingPositions.blue,
    });
    setCurrentPlayer("red");
    setDiceValue(null);
    setWinner(null);
    setGameStarted(true);
    setWaitingForRoll(true);
    setValidMoves([]);
    generateSpecialBoxes();
  };

  const rollDice = () => {
    if (winner || !gameStarted || !waitingForRoll) return;

    const value = Math.floor(Math.random() * 6) + 1;
    setDiceValue(value as number);
    setWaitingForRoll(false);

    // Calculate valid destination
    const currentNumber = playerNumbers[currentPlayer];
    const newNumber = Math.min(100, currentNumber + value);

    // Set valid move destination
    setValidMoves([newNumber]);
  };

  const handlePlayerMove = (destinationNumber: number) => {
    if (!validMoves.includes(destinationNumber) || isAnimating) return;

    const player = currentPlayer;
    const currentNumber = playerNumbers[player];
    const newNumber = destinationNumber;

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
            [player]: stepCoords,
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
        [player]: newNumber,
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
        setWinner(player);
      }

      // Switch player unless dice value is 6
      if (diceValue !== 6) {
        setCurrentPlayer((prev) => (prev === "red" ? "blue" : "red"));
      }

      setWaitingForRoll(true);
      setIsAnimating(false);
    };
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    player: "red" | "blue" | null
  ) => {
    if (player !== currentPlayer || validMoves.length === 0) {
      e.preventDefault();
      return;
    }
    setDraggedPlayer(player);

    // Required for Firefox
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", player);
      e.dataTransfer.effectAllowed = "move";
    }
  };

  // Handle drag over
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    number: number
  ) => {
    e.preventDefault();
    if (validMoves.includes(number)) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, number: number) => {
    e.preventDefault();
    if (validMoves.includes(number) && draggedPlayer === currentPlayer) {
      handlePlayerMove(number);
    }
    setDraggedPlayer(null);
  };

  // For mobile touch events
  const handleTouchStart = (player: "red" | "blue" | null) => {
    if (player !== currentPlayer || validMoves.length === 0) return;
    setDraggedPlayer(player as any);
  };

  const handleTouchEnd = (
    e: React.TouchEvent<HTMLDivElement>,
    number: number
  ) => {
    if (validMoves.includes(number) && draggedPlayer === currentPlayer) {
      handlePlayerMove(number);
    }
    setDraggedPlayer(null);
  };

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

  // Handle direct click on a valid destination (alternative to drag & drop)
  const handleDestinationClick = (number: number) => {
    if (validMoves.includes(number)) {
      handlePlayerMove(number);
    }
  };
  return (
    <div className="flex flex-col items-center p-4 max-w-4xl mx-auto h-screen">
      <h1 className="text-2xl font-bold mb-4">
        Snakes & Ladders Style Board Game
      </h1>

      <div className="mb-4 flex flex-wrap gap-4">
        {!gameStarted ? (
          <Button
            onClick={startGame}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Start Game
          </Button>
        ) : (
          <>
            <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full ${
                  currentPlayer === "red" ? "bg-red-300" : "bg-blue-300"
                }`}
              ></div>
              <span>Current: {currentPlayer === "red" ? "Pink" : "Blue"}</span>
            </div>

            <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <span>Pink: {playerNumbers.red}</span>
            </div>

            <div className="px-4 py-2 bg-gray-100 rounded flex items-center gap-2">
              <span>Blue: {playerNumbers.blue}</span>
            </div>

            <Button
              onClick={rollDice}
              disabled={!waitingForRoll || winner !== null}
              className={`px-4 py-2 ${
                waitingForRoll && !winner
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-300"
              } text-white rounded`}
            >
              Roll Dice
            </Button>

            {diceValue && (
              <div className="px-4 py-2 bg-gray-100 rounded">
                Dice: {diceValue}
              </div>
            )}

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
            onClick={startGame}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Play Again
          </Button>
        </div>
      )}

      <div className="border-4 border-cyan-600 grid grid-cols-10 place-items-center aspect-square h-full">
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
                ${!isSpecialBox && (x + y) % 2 !== 0 ? "bg-orange-200" : ""}
                ${
                  isValidMove
                    ? "z-[100] border-2 border-black cursor-pointer"
                    : ""
                }
              `}
                onDragOver={(e) => handleDragOver(e, number)}
                onDrop={(e) => handleDrop(e, number)}
                onTouchEnd={(e) => handleTouchEnd(e, number)}
                onClick={() => {
                  handleDestinationClick(number);
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
                    onDragStart={(e) =>
                      !isAnimating && handleDragStart(e, "red")
                    }
                    onTouchStart={() => !isAnimating && handleTouchStart("red")}
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
                    onDragStart={(e) =>
                      !isAnimating && handleDragStart(e, "blue")
                    }
                    onTouchStart={() =>
                      !isAnimating && handleTouchStart("blue")
                    }
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

      {/* <div className="mt-4 text-sm text-gray-600">
        <p>Rules:</p>
        <ul className="list-disc pl-5">
          <li>Roll the dice and drag your piece to the destination.</li>
          <li>If you roll a 6, you get an extra turn.</li>
          <li>First player to reach square 100 wins.</li>
          <li>Purple squares are special spaces with effects.</li>
        </ul>
      </div> */}

      {showModal && selectedSpecialBox && (
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
                onClick={applySpecialEffect}
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
      )}
    </div>
  );
}
