// middleware/authMiddleware.js (fix MySQL)
const db = require("../dataBase/db.js");
const { verifyToken } = require("./token.js");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let tokenId = null;

    console.log("AUTH MIDDLEWARE - authHeader:", authHeader);

    if (authHeader && authHeader.startsWith("Bearer ")) {
      tokenId = authHeader.substring(7);
    }

    console.log("AUTH MIDDLEWARE - tokenId:", tokenId);

    const verification = await verifyToken(tokenId, req);
    console.log("AUTH MIDDLEWARE - verification:", verification);
    
    if (!verification.valid) {
      return res.status(401).json({ error: verification.error });
    }

    const userMail = verification?.token?.user;
    if (!userMail) {
      return res.status(401).json({ error: "Invalid token: no user email" });
    }

     
      const [rows] = await db.execute(
      `SELECT Id_USER, email, twitch_url, created_at, avatar_url
      FROM user_
      WHERE email = ? LIMIT 1`,
      [userMail]
    );  

    if (!rows.length) {
      return res.status(401).json({ error: "Utilisateur introuvable (requireAuth)" });
    }

    const u = rows[0];

    req.user = {
      id: u.Id_USER,
      Id_USER: u.Id_USER,      
      email: u.email,
      twitch_url: u.twitch_url,
      created_at: u.created_at,
      avartar_url: u.avatar_url,
    };

    return next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

module.exports = { requireAuth };
