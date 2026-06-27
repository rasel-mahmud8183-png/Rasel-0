module.exports = {
  config: {
    name: "spam",
    aliases: ["sp"],
    version: "1.0",
    author: "Rasel Mahmud",
    countDown: 10,
    role: 0,
    shortDescription: "Vertical chain spam",
    longDescription: "Send many chain emojis vertically",
    category: "fun",
    guide: {
      en: "{pn} <count>\n" +
           "Example:\n" +
           "{pn} 100\n" +
           "{pn} 200"
    }
  },

  onStart: async function ({ message, args }) {
    let count = parseInt(args[0]);

    // ডিফল্ট ভ্যালু
    if (!count || isNaN(count) || count < 1) {
      count = 200; // ডিফল্ট ২০০ লাইন
    }

    // ম্যাক্স লিমিট
    if (count > 1000) {
      return message.reply("❌ Maximum 1000 lines allowed.");
    }

    // লম্বালম্বি স্প্যাম জেনারেট করুন (প্রতি লাইনে ১টা করে ⛓️)
    let spamText = "";
    for (let i = 0; i < count; i++) {
      spamText += "⛓️\n";
    }

    // একটাই মেসেজ হিসেবে পাঠানো
    await message.reply(spamText);
  }
};
