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

// POST /api/users/me/avatar
router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;

  await db.execute(
    `UPDATE utilisateurs SET avatar_url = ? WHERE id = ?`,
    [avatarUrl, req.user.id]
  );

  res.json({ avatar_url: avatarUrl });
});

module.exports = router;
