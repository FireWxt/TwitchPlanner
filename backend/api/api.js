const { generateToken } = require("../middleware/token.js");
const { requireAuth } = require("../middleware/authMiddleware.js");
const { requireNonce } = require("../middleware/nonce.js");


// Récupérer le sel
app.post("/getsalt", async (req, res) => {
  try {
    const { mail } = req.body;
    const [rows] = await db.execute(
      `SELECT salt FROM utilisateurs WHERE mail = ? LIMIT 1`,
      [mail]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    return res.json({ salt: rows[0].salt });
  } catch (err) {
    console.error("/getsalt error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});



app.post("/completeRegister", requireNonce, async (req, res) => {
  try {
    const { mail, password } = req.body;

    const [result] = await db.execute(
      `UPDATE utilisateurs SET pass = ? WHERE mail = ?`,
      [password, mail]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ mail });
  } catch (err) {
    console.error("/completeRegister error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});


// Exemple route protégée
app.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log("http://localhost:3000/");
});
