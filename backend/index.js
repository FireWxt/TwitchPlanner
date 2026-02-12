// index.js
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const authRoutes = require("./api/auth.js");
const app = express();
const planningRoutes = require("./api/planning.js");

app.use(cors());
app.use(express.json());

const db = require("./dataBase/db.js");

db.execute("SELECT 1")
  .then(() => console.log("Connexion MySQL OK"))
  .catch((err) => console.error("Erreur DB:", err));


app.use("/api/auth", authRoutes);

app.use("/api/planning", planningRoutes);

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
