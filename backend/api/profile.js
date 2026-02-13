const express = require("express");
const path = require("path");
const multer = require("multer");
const db = require("../dataBase/db.js");
const { requireAuth } = require("../middleware/authMiddleware.js");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "uploads", "avatars")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// GET /api/profile/me
router.put("/me", requireAuth, async (req, res) => {
  const { email, twitch_url, avatar_url } = req.body;

  if (email !== undefined) {
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email invalide" });
    }

    // vérifier unicité si changement
    if (email !== req.user.email) {
      const [exists] = await db.execute(
        `SELECT 1 FROM user_ WHERE email = ? LIMIT 1`,
        [email]
      );
      if (exists.length) return res.status(409).json({ error: "Email déjà utilisé" });
    }
  }

  await db.execute(
    `UPDATE user_
     SET email = COALESCE(?, email),
         twitch_url = ?,
         avatar_url = ?
     WHERE Id_USER = ?`,
    [
      email ?? null,
      twitch_url ?? null,
      avatar_url ?? null,
      req.user.id
    ]
  );

  const [rows] = await db.execute(
    `SELECT Id_USER, email, twitch_url, avatar_url FROM user_ WHERE Id_USER = ? LIMIT 1`,
    [req.user.id]
  );

  return res.json(rows[0]);
});


// POST /api/profile/me/avatar
router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  await db.execute(
    `UPDATE USER_ SET avatar_url = ? WHERE Id_USER = ?`,
    [avatarUrl, req.user.id]
  );

  return res.json({ avatar_url: avatarUrl });
});


router.post("/me/salt", requireAuth, async (req, res) => {
    try {
        const [rows] = await db.execute(
    `SELECT salt FROM user_ WHERE Id_USER = ? LIMIT 1`,
    [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: "Utilisateur non trouvé" });
    return res.json({ salt: rows[0].salt });
    } catch (err) {
    console.error("Error fetching salt:", err);
    return res.status(500).json({ error: "Erreur serveur" });
    }
});

const crypto = require("crypto");

function hashPassword(password, salt) {
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}


router.put("/me/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Champs manquants" });
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "Mot de passe trop court (min 8)" });
  }

  const [rows] = await db.execute(
    `SELECT password, salt FROM user_ WHERE Id_USER = ? LIMIT 1`,
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Utilisateur non trouvé" });

  const { password: storedHash, salt } = rows[0];
  if (!salt) return res.status(500).json({ error: "Salt manquant en BDD" });

  const currentHash = hashPassword(currentPassword, salt);
  if (currentHash !== storedHash) {
    return res.status(401).json({ error: "Mot de passe actuel incorrect" });
  }

  const newHash = hashPassword(newPassword, salt);

  await db.execute(
    `UPDATE user_ SET password = ? WHERE Id_USER = ?`,
    [newHash, req.user.id]
  );

  return res.json({ ok: true });
});


module.exports = router;
