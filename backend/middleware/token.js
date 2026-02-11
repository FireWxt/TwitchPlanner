const crypto = require('crypto');

let tokens = [];
function setTokensReference(ref) {
    tokens = ref;
}

function generateDeviceFingerPrint(req, display = false) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || "";
    const timezone = req.headers['time-zone'] || "";
    const fingerPrintData = `${userAgent}-${ip}-${timezone}`;
    if(display) {
        console.error('fingerprint', fingerPrintData, crypto.createHash('sha256').update(fingerPrintData).digest('hex'));
    }
    return crypto.createHash('sha256').update(fingerPrintData).digest('hex');
}

function generateToken(userMail, req) {
    const now = Date.now();
    const token = {
        __id : crypto.randomBytes(16).toString('hex'),
        user: userMail,
        createdAt: now,
        expireAt: now + 30 * 24 * 3600 * 1000, // expire in 24h
        deviceFingerprint: generateDeviceFingerPrint(req),
        active: true,
        signature: ""
    };

       token.signature = crypto.createHash('sha256').update(
        token._id.toString() +
        token.user +
        token.createdAt.toString() +
        token.expireAt.toString() +
        token.deviceFingerprint +
        token.active.toString()
    ).digest('hex');
    return token;
}


function verifyToken(tokenId, req) {
    if (!tokenId) {
        return { valid: false, error: 'Token manquant' };
    }

    const tok = tokens.find(t => t._id === tokenId);
    if (!tok) {
        return { valid: false, error: 'Token invalide' };
    }

    if (tok.expireAt < Date.now()) {
        return { valid: false, error: 'Token expiré' };
    }

    // recalculer la signature
    const recalculated = crypto.createHash('sha256').update(
        tok._id +
        tok.user +
        tok.createdAt +
        tok.expireAt +
        tok.deviceFingerprint +
        tok.active
    ).digest('hex');

    if (recalculated !== tok.signature) {
        return { valid: false, error: 'Signature incorrecte' };
    }

    // vérifier cohérence deviceFingerprint
    const currentFingerprint = generateDeviceFingerprint(req);
    if (currentFingerprint !== tok.deviceFingerprint) {
        return { valid: false, error: 'Appareil non reconnu' };
    }

    return { valid: true, token: tok };
}


module.exports = {
    setTokensReference,
    generateToken,
    verifyToken
};