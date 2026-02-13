const express = require("express");
const router = express.Router();

router.post("/games/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) return res.status(400).json({ error: "Query manquante" });

    // Token Twitch (client_credentials)
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    );
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: tokenData });
    }

    // IGDB
    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "text/plain",
      },
      body: `fields id,name,cover.url; search "${query}"; limit 10;`,
    });

    const games = await igdbResponse.json();

    if (!igdbResponse.ok) {
      return res.status(500).json({ error: games });
    }

    const formatted = games.map((g) => ({
      id: g.id,
      name: g.name,
      cover: g.cover
        ? "https:" + g.cover.url.replace("t_thumb", "t_cover_small")
        : null,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("IGDB ERROR:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

module.exports = router;
