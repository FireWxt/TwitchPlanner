// index.js
require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const authRoutes = require("./api/auth.js");
const app = express();
const planningRoutes = require("./api/planning.js");
const profileRoutes = require("./api/profile.js");
const igdbRoutes = require("./api/igdbApi.js");
const {getTwitchAccessToken} = require("./api/twitchApi.js");
const path = require("path");


app.use(cors());
app.use(express.json());

const db = require("./dataBase/db.js");

db.execute("SELECT 1")
  .then(() => console.log("Connexion MySQL OK"))
  .catch((err) => console.error("Erreur DB:", err));


app.use("/api/auth", authRoutes);

app.use("/api/planning", planningRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/profile", profileRoutes);

app.use("/api/igdb", igdbRoutes);

app.post("/api/twitch/token", async (req, res) => {
  try {
    const tokenData = await getTwitchAccessToken(); 
    return res.json(tokenData);
  } catch (err) {
    console.error("Error fetching Twitch token:", err);
    return res.status(500).json({ error: "Failed to fetch Twitch token" });
  }
});

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
