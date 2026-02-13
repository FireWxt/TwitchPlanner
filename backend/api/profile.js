const express = require("express");
const path = require("path");
const multer = require("multer");
const db = require("../dataBase/db.js");
const { requireAuth } = require("../middleware/authMiddleware.js");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads", "avatars")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });


// GET /api/profile/me
router.get("/me", requireAuth, async (req, res) => {
  const [rows] = await db.execute(
    `SELECT Id_USER, email, twitch_url,avatar_url FROM USER_ WHERE Id_USER = ? LIMIT 1`,
    [req.user.Id_USER]
  );

  if (!rows.length) return res.status(404).json({ error: "Utilisateur introuvable" });
  res.json(rows[0]);
});

router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  await db.execute(
    `UPDATE USER_ SET avatar_url = ? WHERE Id_USER = ?`,
    [avatarUrl, req.user.Id_USER]
  );

  res.json({ avatar_url: avatarUrl });
});

module.exports = router;
