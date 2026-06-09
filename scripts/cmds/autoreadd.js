const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "autoreadd.json");
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}));

function load() {
  return JSON.parse(fs.readFileSync(file));
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "autoreadd",
    aliases: ["antiout"],
    version: "6.0",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    shortDescription: "Auto Re-Add left users (only for self-leave, not for kick)",
    longDescription: "কেউ নিজে থেকে লিভ নিলে নাম সহ দেখাবে এবং অ্যাড করবে, কিন্তু কিক করলে অ্যাড করবে না",
    category: "system",
    guide: { en: "{pn} on / off" }
  },

  onStart: async function ({ api, event, args }) {
    const tid = event.threadID;
    const sid = event.senderID;

    const info = await api.getThreadInfo(tid);
    const isGroupAdmin = info.adminIDs.some(a => a.id == sid);
    const isBotAdmin = event.role >= 1;

    if (!isGroupAdmin && !isBotAdmin) {
      return api.sendMessage("❌ Only Group Admin can use this command!", tid);
    }

    let data = load();
    if (!args[0]) {
      return api.sendMessage("Use: autoreadd on / autoreadd off", tid);
    }

    if (args[0].toLowerCase() === "on") {
      data[tid] = true;
      save(data);
      return api.sendMessage("✅ Auto Re-Add is now ON!\n(Only for members who leave by themselves)", tid);
    }

    if (args[0].toLowerCase() === "off") {
      data[tid] = false;
      save(data);
      return api.sendMessage("❌ Auto Re-Add is now OFF!", tid);
    }
  },

  onEvent: async function ({ api, event }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const tid = event.threadID;
    const leftUser = event.logMessageData.leftParticipantFbId;
    const authorId = event.author;

    let data = load();
    const isEnabled = data[tid] !== false;
    if (!isEnabled) return;

    if (leftUser === api.getCurrentUserID()) return;

    const isSelfLeave = (authorId === leftUser);

    try {
      const userInfo = await api.getUserInfo(parseInt(leftUser));
      const userName = userInfo[leftUser]?.name || "Someone";

      if (isSelfLeave) {
        // প্রথম মেসেজ পাঠানো
        const initialMessage = await api.sendMessage(`➤ ${userName} left the group`, tid);
        
        // অ্যাড করার চেষ্টা
        try {
          await api.addUserToGroup(leftUser, tid);
          
          // সফল হলে - মেসেজ এডিট করে দেওয়া
          await api.editMessage(`✅ ${userName} added back automatically!`, initialMessage.messageID, tid);
          
        } catch (addError) {
          console.error("Auto re-add failed:", addError);
          // ব্যর্থ হলে - মেসেজ এডিট করে এরর দেখানো
          await api.editMessage(`❌ Failed to re-add ${userName} (blocked or left permanently)`, initialMessage.messageID, tid);
        }
      } else {
        // কিক হয়েছে - শুধু মেসেজ পাঠাবে
        await api.sendMessage(`➤ ${userName} kicked out from the group`, tid);
      }

    } catch (error) {
      console.error("Error:", error);
      
      if (isSelfLeave) {
        const initialMessage = await api.sendMessage(`➤ Someone left the group`, tid);
        try {
          await api.addUserToGroup(leftUser, tid);
          await api.editMessage(`✅ User added back automatically!`, initialMessage.messageID, tid);
        } catch (addError) {
          await api.editMessage(`❌ Failed to re-add user.`, initialMessage.messageID, tid);
        }
      } else {
        await api.sendMessage(`➤ Someone kicked out from the group`, tid);
      }
    }
  }
};
