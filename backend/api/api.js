const { generateToken } = require("../middleware/token.js");
const { requireAuth } = require("../middleware/authMiddleware.js");
const { requireNonce } = require("../middleware/nonce.js");





app.post("/completeRegister", requireNonce, async (req, res) => {
  try {
    const { email, password } = req.body;

    const [result] = await db.execute(
      `UPDATE USER_ SET password = ? WHERE email = ?`,
      [password, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ email });
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
