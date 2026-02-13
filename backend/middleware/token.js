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
        token.user_email +
        token.created_at.toString() +
        token.expire_at.toString() +
        token.device_fingerprint +
        token.active.toString()
    )
    .digest("hex");
}

async function generateToken(userEmail, req) {
  if (!userEmail) throw new Error("generateToken: userEmail manquant");

  const now = Date.now();
  const token = {
    id: crypto.randomBytes(16).toString("hex"),
    user_email: userEmail,
    created_at: now,
    expire_at: now + 30 * 24 * 3600 * 1000, // 30 jours
    device_fingerprint: generateDeviceFingerPrint(req),
    active: 1,
    signature: "",
  };

  token.signature = buildSignature(token);

  await db.execute(
    `INSERT INTO tokens (id, created_at, user_email, expire_at, device_fingerprint, active, signature)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      token.id,
      token.created_at,
      token.user_email,
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
    `SELECT id, created_at, user_email, expire_at, device_fingerprint, active, signature
     FROM tokens
     WHERE id = ? LIMIT 1`,
    [tokenId]
  );

  if (!rows.length) return { valid: false, error: "Token invalide" };

  const tok = rows[0];

  if (!tok.active) return { valid: false, error: "Token inactif" };
  if (Number(tok.expire_at) < Date.now()) return { valid: false, error: "Token expiré" };
  if (!tok.user_email) return { valid: false, error: "Invalid token: no user email" };

  const recalculated = buildSignature({
    id: tok.id,
    user_email: tok.user_email,
    created_at: Number(tok.created_at),
    expire_at: Number(tok.expire_at),
    device_fingerprint: tok.device_fingerprint,
    active: Number(tok.active),
  });

  if (recalculated !== tok.signature) {
    return { valid: false, error: "Signature incorrecte" };
  }

  const currentFingerprint = generateDeviceFingerPrint(req);
  console.log("VERIFY TOKEN - stored fingerprint:", tok.device_fingerprint);
  console.log("VERIFY TOKEN - current fingerprint:", currentFingerprint);
  if (currentFingerprint !== tok.device_fingerprint) {
    return { valid: false, error: "Appareil non reconnu" };
  }

  return {
    valid: true,
    token: {
      id: tok.id,
      user: tok.user_email,
      createdAt: Number(tok.created_at),
      expireAt: Number(tok.expire_at),
    },
  };
}

module.exports = {
  generateToken,
  verifyToken,
};
