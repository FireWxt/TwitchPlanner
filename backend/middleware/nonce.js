const crypto = require('crypto');

function requireNonce(req, res, next) {
    const nonce = req.headers.nonce;
    if (!verifyNonce("http://localhost:3000" + req.originalUrl, nonce)) {
        console.log("Nonce", nonce);
        return res.status(403).json({ error: 'Invalid nonce' });
    }
}


function verifyNonce(url, nonce) {
    const hash = crypto.createHash('sha256').update(url + nonce).digest('hex');
    return hash.startsWith('0000');
}

module.exports = {
    requireNonce};