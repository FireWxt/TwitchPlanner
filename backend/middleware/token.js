// middleware/token.js
const crypto = require("crypto");
const db = require("../dataBase/db.js");

function generateDeviceFingerPrint(req, display = false) {
  const userAgent = req.headers["user-agent"] || "";
  const ip = req.ip || "";
  const timezone = req.headers["time-zone"] || "";
  const fingerPrintData = `${userAgent}-${ip}-${timezone}`;
  const fp = crypto.createHash("sha256").update(fingerPrintData).digest("hex");
  if (display) console.error("fingerprint", fingerPrintData, fp);
  return fp;
}

function buildSignature(token) {
  return crypto
    .createHash("sha256")
    .update(
      token.id +
        token.user_mail +
        token.created_at.toString() +
        token.expire_at.toString() +
        token.device_fingerprint +
        token.active.toString()
    )
    .digest("hex");
}

async function generateToken(user_Mail, req) {
  const now = Date.now();
  const token = {
    id: crypto.randomBytes(16).toString("hex"),
    user_mail: user_Mail,
    created_at: now,
    expire_at: now + 30 * 24 * 3600 * 1000, // 30 jours
    device_fingerprint: generateDeviceFingerPrint(req),
    active: 1,
    signature: "",
  };

  token.signature = buildSignature(token);

  await db.execute(
    `INSERT INTO tokens (id, user_email, created_at, expire_at, device_fingerprint, active, signature)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      token.id,
      token.user_mail,
      token.created_at,
      token.expire_at,
      token.device_fingerprint,
      token.active,
      token.signature,
    ]
  );
  
  return token;
}

async function verifyToken(tokenId, req) {
  if (!tokenId) return { valid: false, error: "Token manquant" };

  const [rows] = await db.execute(
    `SELECT id, user_email, created_at, expire_at, device_fingerprint, active, signature
     FROM tokens
     WHERE id = ? LIMIT 1`,
    [tokenId]
  );

  if (!rows.length) return { valid: false, error: "Token invalide" };

  const tok = rows[0];

  if (!tok.active) return { valid: false, error: "Token inactif" };
  if (Number(tok.expire_at) < Date.now()) return { valid: false, error: "Token expiré" };

  // Recalcul signature
  const recalculated = buildSignature({
    id: tok.id,
    user_mail: tok.user_mail,
    created_at: Number(tok.created_at),
    expire_at: Number(tok.expire_at),
    device_fingerprint: tok.device_fingerprint,
    active: Number(tok.active),
  });

  if (recalculated !== tok.signature) {
    return { valid: false, error: "Signature incorrecte" };
  }

  // Vérifier empreinte device
  const currentFingerprint = generateDeviceFingerPrint(req);
  if (currentFingerprint !== tok.device_fingerprint) {
    return { valid: false, error: "Appareil non reconnu" };
  }

  return {
    valid: true,
    token: {
      id: tok.id,
      user: tok.user_mail,
      createdAt: Number(tok.created_at),
      expireAt: Number(tok.expire_at),
    },
  };
}

module.exports = {
  generateToken,
  verifyToken,
};
