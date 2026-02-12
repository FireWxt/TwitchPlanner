// index.js
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const db = require("./dataBase/db.js");
const { generateToken } = require("./middleware/token.js");
const { requireAuth } = require("./middleware/authMiddleware.js");
const { requireNonce } = require("./middleware/nonce.js");

db.execute("SELECT 1")
  .then(() => console.log("Connexion MySQL OK"))
  .catch((err) => console.error("Erreur DB:", err));

// Récupérer le sel
app.post("/getsalt", async (req, res) => {
  try {
    const { mail } = req.body;
    const [rows] = await db.execute(
      `SELECT salt FROM utilisateurs WHERE mail = ? LIMIT 1`,
      [mail]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    return res.json({ salt: rows[0].salt });
  } catch (err) {
    console.error("/getsalt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/register", requireNonce, async (req, res) => {
  try {
    const { mail } = req.body;
    const salt = crypto.randomBytes(16).toString("hex");

    // insert user with empty pass for now
    await db.execute(
      `INSERT INTO utilisateurs (mail, pass, salt) VALUES (?, ?, ?)`,
      [mail, "", salt]
    );

    return res.status(201).json({ message: "User registered successfully", salt });
  } catch (err) {
    // mail déjà pris
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Mail déjà utilisé" });
    }
    console.error("/register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/completeRegister", requireNonce, async (req, res) => {
  try {
    const { mail, password } = req.body;

    const [result] = await db.execute(
      `UPDATE utilisateurs SET pass = ? WHERE mail = ?`,
      [password, mail]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ mail });
  } catch (err) {
    console.error("/completeRegister error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/login", requireNonce, async (req, res) => {
  try {
    const { mail, password } = req.body;

    const [rows] = await db.execute(
      `SELECT mail, pass FROM utilisateurs WHERE mail = ? LIMIT 1`,
      [mail]
    );

    if (!rows.length || rows[0].pass !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await generateToken(mail, req);

    return res.status(200).json({
      message: "Login successful",
      mail,
      token: token.id, // on renvoie juste l'id (comme Bearer)
      tokenObject: token, // optionnel: si tu veux debug
    });
  } catch (err) {
    console.error("/login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Exemple route protégée
app.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
