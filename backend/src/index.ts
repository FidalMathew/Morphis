import cors from "cors";
import dotenv from "dotenv";
import type { Application } from "express";
import express from "express";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());


// Define a simple route
app.get("/", (req, res) => {
    res.send("Hello World!");
});


app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
});
