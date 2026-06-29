const axios = require("axios");
const { ensureDir, outputFile, unlink } = require("fs-extra");
const { join } = require("path");
const { createReadStream } = require("fs");

const API_URL = "https://myinstants-api-two.vercel.app/api/instants";

async function fetchAPI(endpoint) {
  const { data } = await axios.get(`${API_URL}${endpoint}`);
  if (!data?.status) throw new Error("API Error");
  return data;
}

module.exports = {
  config: {
    name: "voice2",
    aliases: ["sound2", "vo"],
    version: "2.2.0",
    role: 0,
    author: "Rafix4x",
    countDown: 10,
    category: "media",
    shortDescription: "Play fun voice lines from MyInstants",
    guide: {
      en: "• /voice (Random)\n• /voice <name> (Exact match)\n• /voice s <name> (Search)\n• Reply with number or 'next'/'prev'"
    }
  },

  onStart: async function ({ api, message, event, args }) {
    api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
    try {
      if (!args.length) {
        const data = await fetchAPI("");
        return sendVoice(api, message, event, data.random_result);
      }

      const isSearch = ["s", "search"].includes(args[0].toLowerCase());
      const query = (isSearch ? args.slice(1) : args).join(" ");
      if (!query) return message.reply("Please provide a search term.");

      const data = await fetchAPI(`?query=${encodeURIComponent(query)}`);
      if (!data.results?.length) return message.reply(`No results found for "${query}".`);

      if (isSearch) return sendList(api, message, event, query, 1, data.results);
      return sendVoice(api, message, event, data.results[0]);

    } catch (err) {
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      message.reply("Failed to process command. Please try again.");
    }
  },

  onReply: async function ({ api, message, event, Reply }) {
    const { author, query, page, results, timeoutId, messageID } = Reply;
    if (event.senderID !== author) return;
    clearTimeout(timeoutId);

    const input = event.body?.toLowerCase().trim();
    api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);

    try {
      const totalPages = Math.ceil(results.length / 10);

      if (["n", "next"].includes(input) && page < totalPages) {
        api.unsendMessage(messageID);
        return sendList(api, message, event, query, page + 1, results);
      }

      if (["p", "prev", "previous"].includes(input) && page > 1) {
        api.unsendMessage(messageID);
        return sendList(api, message, event, query, page - 1, results);
      }

      const idx = parseInt(input, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= results.length) {
        return message.reply(`Invalid. Reply with 1-${results.length}, or next/prev.`);
      }

      api.unsendMessage(messageID);
      return sendVoice(api, message, event, results[idx]);

    } catch (err) {
      api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      message.reply("Error playing selected voice.");
    }
  }
};

async function sendList(api, message, event, query, page, results) {
  const start = (page - 1) * 10;
  const items = results.slice(start, start + 10);
  const totalPages = Math.ceil(results.length / 10);

  const listText = items.map((item, i) => `${start + i + 1}. ${item.title}`).join("\n");
  const msg = `🔊 Search: "${query}"\nPage ${page}/${totalPages} (Total: ${results.length})\n━━━━━━━━━━━━━━━━━━\n${listText}\n━━━━━━━━━━━━━━━━━━\nReply with a number to play, or 'next'/'prev'.`;

  const replyInfo = await message.reply(msg);

  const timeoutId = setTimeout(() => {
    api.unsendMessage(replyInfo.messageID).catch(() => {});
    global.GoatBot.onReply.delete(replyInfo.messageID);
  }, 60000);

  global.GoatBot.onReply.set(replyInfo.messageID, {
    commandName: "voice",
    messageID: replyInfo.messageID,
    author: event.senderID,
    query,
    page,
    results,
    timeoutId
  });

  api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
}

async function sendVoice(api, message, event, soundObj) {
  const cleanUrl = soundObj.url.split("',")[0].replace(/'/g, "");
  const dir = join(__dirname, "cache");
  const file = join(dir, `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`);

  await ensureDir(dir);

  try {
    const { data } = await axios.get(cleanUrl, { responseType: "arraybuffer" });
    await outputFile(file, data);

    await message.reply({
      body: `🔊 Playing: ${soundObj.title}`,
      attachment: createReadStream(file)
    });

    api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
  } finally {
    setTimeout(() => unlink(file).catch(() => {}), 5000);
  }
}
