const express = require("express");
const crypto = require("crypto");
const db = require("../dataBase/db");

const { generateToken } = require("../middleware/token.js");
const { requireAuth } = require("../middleware/authMiddleware.js");
const { requireNonce } = require("../middleware/nonce.js");

const router = express.Router();

// Validation email simple
function isValidEmail(email) {
  return typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Générer un salt sécurisé
function generateSalt() {
  return crypto.randomBytes(32).toString("hex"); // 64 chars
}

// Hash password + salt
function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, twitch_url } = req.body;


    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    const [existing] = await db.execute(
      "SELECT Id_USER FROM USER_ WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Invalid Credentials" });
    }


    const salt = generateSalt();


    const passwordHash = hashPassword(password, salt);

    const [result] = await db.execute(
      `INSERT INTO USER_ (email, password, salt, twitch_url, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [email, passwordHash, salt, twitch_url || null]
    );

    return res.status(201).json({
      message: "Utilisateur créé avec succès",
      userId: result.insertId,
      email
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("LOGIN req.body:", req.body);
    console.log("EMAIL reçu:", email, "| type:", typeof email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Email invalide" });
    }
    if (typeof password !== "string" || password.length === 0) {
      return res.status(400).json({ error: "Mot de passe manquant" });
    }

    const [rows] = await db.execute(
      `SELECT Id_USER, email, password, salt, twitch_url, created_at
       FROM USER_
       WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const user = rows[0];
    const candidateHash = hashPassword(password, user.salt);

    if (candidateHash !== user.password) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = await generateToken(user.email, req);

    return res.status(200).json({
      message: "Login successful",
      token: token.id,
      user: {
        id: user.Id_USER,
        email: user.email,
        twitch_url: user.twitch_url,
        created_at: user.created_at,
      },
      expireAt: token.expire_at,
    });
  } catch (err) {
    console.error("LOGIN error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



module.exports = router;
