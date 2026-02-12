// middleware/authMiddleware.js
const db = require("../dataBase/db.js");
const { verifyToken } = require("./token.js");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let tokenId = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      tokenId = authHeader.substring(7);
    }

    const verification = await verifyToken(tokenId, req);
    if (!verification.valid) {
      return res.status(401).json({ error: verification.error });
    }

    const userMail = verification.token.user;

    const [rows] = await db.execute(
      `SELECT id, mail FROM utilisateurs WHERE mail = ? LIMIT 1`,
      [userMail]
    );

    req.user = rows.length ? rows[0] : { mail: userMail };
    return next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = { requireAuth };
