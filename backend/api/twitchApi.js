const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

async function getTwitchAccessToken() {
  console.log("CLIENT_ID:", CLIENT_ID ? "OK" : "MISSING");
  console.log("CLIENT_SECRET:", CLIENT_SECRET ? "OK" : "MISSING");

  const url =
    "https://id.twitch.tv/oauth2/token" +
    `?client_id=${CLIENT_ID}` +
    `&client_secret=${CLIENT_SECRET}` +
    `&grant_type=client_credentials`;

  const response = await fetch(url, { method: "POST" });
  const data = await response.json();

  console.log("TWITCH STATUS:", response.status);
  console.log("TWITCH DATA:", data);

  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

module.exports = { getTwitchAccessToken };
