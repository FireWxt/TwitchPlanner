let users = [];
function setUsersReference(ref) {
    users = ref;
}
const { verifyToken } = require('./token.js');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    let tokenId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        tokenId = authHeader.substring(7);
    }

    const verifiedToken = verifyToken(tokenId, req);
    if (!verifiedToken) {
        return res.status(401).json({ error: verification.error });
    }
    const utilisateur = users.find(u => u.mail === verification.token.user);
    req.user = utilisateur || {mail: verification.token.user};
    next();
}


module.exports = {
    setUsersReference,
    requireAuth
};