// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:8000"); // Use your server URL

export default socket;
