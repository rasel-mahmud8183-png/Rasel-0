const axios = require("axios");

const TIKTOK_API = "https://lyric-search-neon.vercel.app/kshitiz"; // সরাসরি API

module.exports.config = {
    name: "tiksr",
    aliases: ["tiktok", "tt"],
    version: "1.0",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    description: {
        en: "Search for TikTok videos",
    },
    category: "MEDIA",
    guide: {
        en:
            "{pn} <search> - <optional: number of results | blank>" +
            "\nExample:" +
            "\n{pn} caredit - 50",
    },
};

module.exports.onStart = async function ({ api, args, event }) {
    let search = args.join(" ");
    let searchLimit = 30;

    // REACTION: Processing
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const match = search.match(/^(.+)\s*-\s*(\d+)$/);
    if (match) {
        search = match[1].trim();
        searchLimit = parseInt(match[2], 10);
    }

    try {
        // প্রথমে সার্চ API কল করুন
        const searchResponse = await axios.get(`${TIKTOK_API}?keyword=${encodeURIComponent(search)}`);
        const results = searchResponse.data;

        if (!results || results.length === 0) {
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return api.sendMessage("❌ No TikTok videos found.", event.threadID);
        }

        // লিমিট অনুযায়ী ফলাফল কমানো
        const limitedResults = results.slice(0, searchLimit);
        
        // র্যান্ডম ভিডিও সিলেক্ট করুন
        const videoData = limitedResults[Math.floor(Math.random() * limitedResults.length)];

        // ভিডিও ডাউনলোড করুন
        const stream = await axios({
            method: "get",
            url: videoData.videoUrl || videoData.video, // দুইভাবে চেক করুন
            responseType: "stream",
            timeout: 60000
        });

        let infoMessage = `╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗
✅ TikTok Video
📝 Title: ${videoData.title || "No title"}
👤 Creator: ${videoData.author?.unique_id || "Unknown"}
⏱️ Duration: ${videoData.duration || "N/A"}s
📊 Results: ${limitedResults.length} found
╚═══════════════════╝`;

        await api.sendMessage(
            { body: infoMessage, attachment: stream.data },
            event.threadID,
            event.messageID
        );

        // REACTION: Success
        api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (error) {
        console.error("TikTok Error:", error.message);
        
        // REACTION: Error
        api.setMessageReaction("❌", event.messageID, () => {}, true);

        api.sendMessage(
            `❌ Error: ${error.message.slice(0, 100)}`,
            event.threadID,
            event.messageID
        );
    }
};
