const { status } = require('minecraft-server-util');
const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1454197049720307724";

const HOST = "O-GRANDE-SERVER.aternos.me";
const PORT = 45848;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let state = "OFFLINE"; // OFFLINE | DISPONIVEL | ATIVO
let lastPlayers = [];
let offlineFails = 0;

async function checkServer(sendMessage = true) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  try {
    const response = await status(HOST, PORT, { timeout: 3000 });
    offlineFails = 0;

    const onlineCount = response.players.online;
    const playerList = response.players.sample
      ? response.players.sample.map(p => p.name)
      : [];

    // 🟡 DISPONÍVEL
    if (onlineCount === 0 && state !== "DISPONIVEL") {
      state = "DISPONIVEL";
      lastPlayers = [];
      if (sendMessage && channel) {
        channel.send("🟡 **Servidor DISPONÍVEL** (aguardando jogadores)");
      }
    }

    // 🟢 ATIVO
    if (onlineCount > 0) {
      if (state !== "ATIVO") {
        state = "ATIVO";
        if (channel) {
          channel.send("🟢 **Servidor ATIVO!**");
        }
      }

      const joined = playerList.filter(p => !lastPlayers.includes(p));
      if (joined.length && channel) {
        channel.send(`➕ **Entrou:** ${joined.join(", ")}`);
      }

      const left = lastPlayers.filter(p => !playerList.includes(p));
      if (left.length && channel) {
        channel.send(`➖ **Saiu:** ${left.join(", ")}`);
      }

      lastPlayers = playerList;
    }

    return state === "ATIVO"
      ? `🟢 ATIVO — 👥 ${onlineCount} jogadores`
      : "🟡 DISPONÍVEL (0 jogadores)";

  } catch (e) {
    offlineFails++;

    if (offlineFails >= 3 && state !== "OFFLINE") {
      state = "OFFLINE";
      lastPlayers = [];
      if (channel) {
        channel.send("🔴 **Servidor OFFLINE**");
      }
    }

    return "🔴 OFFLINE";
  }
}

client.once("ready", () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);
  setInterval(() => checkServer(true), 30000);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!status") {
    const result = await checkServer(false);
    message.reply(result);
  }

  if (message.content === "!ping") {
    message.reply("🏓 Pong! Estou online.");
  }
});

client.login(TOKEN);
