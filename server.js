const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config();

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // 👈 add this to your .env

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// OAuth2 callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ No code provided!");

  try {
    // Step 1: Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error("Token error:", tokenData);
      return res.status(400).send("❌ Failed to get access token.");
    }

    const accessToken = tokenData.access_token;

    // Step 2: Fetch user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userResponse.json();

    // Step 3: Try adding user to multiple guilds
    const guildIds = process.env.GUILD_IDS.split(",");
    for (const guildId of guildIds) {
      await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });
    }

    // Step 4: Send GET request to webhook.site
    if (WEBHOOK_URL) {
      try {
        await fetch(`${WEBHOOK_URL}?verified_user=${encodeURIComponent(user.username)}`);
        console.log(`✅ Sent webhook for user: ${user.username}`);
      } catch (err) {
        console.error("❌ Failed to send webhook:", err);
      }
    }

    // Step 5: Redirect user to another website
    return res.redirect("https://hentaimama.io"); // 👈 change to your target URL

  } catch (error) {
    console.error("Callback Error:", error);
    return res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Website running on http://localhost:${PORT}`));
