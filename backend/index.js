const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const { setTokensReference, generateToken } = require('./middleware/token.js');
const { setUsersReference, requireAuth } = require('./middleware/authMiddleware.js');
const { requireNonce } = require('./middleware/nonce.js');
const { run } = require('./dataBase/dbconnect.js');

run().catch(console.dir);

let users = [];
let tokens = [];
setUsersReference(users);
setTokensReference(tokens);

// recuperer le sel
app.post("/getsalt", (req, res) => {
    const {mail} = req.body;
    const user = users.find(u => u.mail === mail);
    if(!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json({ salt: user.salt });
});

app.post("/login", requireAuth,requireNonce, (req, res) => {
    const {mail, password} = req.body;
    const user = users.find(u => u.mail === mail);
    if(user && user.pass === password) {
        const token = generateToken(user.mail, req);
        tokens.push(token);
        res.json({ token });
        res.status(200).json({ message: 'Login successful', mail: user.mail, token});
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/register', requireNonce,(req, res) => {
    const { mail } = req.body;
    const salt = crypto.randomBytes(16).toString('hex');
    
    const newUser = {
        mail:mail,
        pass: "",
        salt: salt
    };
    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully', salt: salt });
});

app.post('/completeRegister', requireNonce,(req, res) => {
    const { mail, password } = req.body;
    const user = users.find(u => u.mail === mail);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    user.pass = password;
    res.status(200).json({ mail:user.mail });
});



app.listen(3000, () => {
    console.log('http://localhost:3000/');
});
