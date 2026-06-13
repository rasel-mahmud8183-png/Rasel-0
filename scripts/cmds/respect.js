module.exports = {
  config: {
    name: "respect",
    version: "5.0",
    author: "Rasel Mahmud",
    role: 2,
    shortDescription: "Add or remove group admin (single or multiple users)",
    longDescription: "Usage: /respect [reply/mention/uid] - Add admin\n/respect remove [reply/mention/uid] - Remove admin",
    category: "group",
    guide: "{pn} (@user / uid / reply) - add admin\n{pn} remove (@user / uid / reply) - remove admin"
  },

  onStart: async function({ api, event }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const { messageReply, mentions, body } = event;

    if (!event.isGroup) {
      return api.sendMessage("❌ | This command only works in groups.", threadID, event.messageID);
    }

    // চেক করা: বট অ্যাডমিন কিনা
    const threadInfo = await api.getThreadInfo(threadID);
    const botID = api.getCurrentUserID();
    const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id == botID);
    
    if (!isBotAdmin) {
      return api.sendMessage("❌ | I must be a group admin first to add/remove admins!", threadID, event.messageID);
    }

    // কমান্ড পার্স করা (add বা remove)
    let isRemove = false;
    let args = body.split(" ");
    
    if (args[0].toLowerCase() === "respect" && args[1] && args[1].toLowerCase() === "remove") {
      isRemove = true;
    }

    // টার্গেট আইডি কালেক্ট করা
    let targetIDs = [];
    let targetNames = {};

    // ========== 1. রিপ্লে করে বলা হলে ==========
    if (messageReply && messageReply.senderID) {
      const uid = messageReply.senderID;
      targetIDs.push(uid);
      try {
        const userInfo = await api.getUserInfo(parseInt(uid));
        targetNames[uid] = userInfo[uid]?.name || "User";
      } catch(e) {
        targetNames[uid] = "User";
      }
    }
    
    // ========== 2. মেনশন @ করে বলা হলে ==========
    if (Object.keys(mentions).length > 0) {
      for (const [uid, name] of Object.entries(mentions)) {
        if (!targetIDs.includes(uid)) {
          targetIDs.push(uid);
          targetNames[uid] = name;
        }
      }
    }
    
    // ========== 3. UID সরাসরি দেওয়া হলে ==========
    const uidMatches = body.match(/\d+/g);
    if (uidMatches && !messageReply && Object.keys(mentions).length === 0) {
      for (const uid of uidMatches) {
        if (uid !== api.getCurrentUserID() && !targetIDs.includes(uid)) {
          targetIDs.push(uid);
          try {
            const userInfo = await api.getUserInfo(parseInt(uid));
            targetNames[uid] = userInfo[uid]?.name || "User";
          } catch(e) {
            targetNames[uid] = "User";
          }
        }
      }
    }
    
    // ========== 4. কিছুই না দিলে (নিজেকে) ==========
    if (targetIDs.length === 0) {
      targetIDs.push(senderID);
      try {
        const userInfo = await api.getUserInfo(parseInt(senderID));
        targetNames[senderID] = userInfo[senderID]?.name || "You";
      } catch(e) {
        targetNames[senderID] = "You";
      }
    }

    // ভ্যালিড ইউজার চেক করা (যারা গ্রুপে আছে)
    const validUsers = [];
    const invalidUsers = [];
    
    for (const uid of targetIDs) {
      try {
        const userInfo = await api.getUserInfo(parseInt(uid));
        if (userInfo[uid]) {
          validUsers.push(uid);
        } else {
          invalidUsers.push(uid);
        }
      } catch(e) {
        invalidUsers.push(uid);
      }
    }

    // প্রমোটরের নাম পাওয়া (স্টাইলিশ)
    let promoterName = "Admin";
    try {
      const promoterInfo = await api.getUserInfo(parseInt(senderID));
      const rawName = promoterInfo[senderID]?.name || "Admin";
      promoterName = makeStylish(rawName);
    } catch(e) {}

    // রেজাল্ট ট্র্যাকিং
    let successList = [];
    let alreadyAdminList = [];
    let failedList = [];

    // শুধু ভ্যালিড ইউজারদের জন্য কাজ করা
    for (const targetID of validUsers) {
      try {
        const isAlreadyAdmin = threadInfo.adminIDs.some(admin => admin.id == targetID);
        
        if (isRemove) {
          if (!isAlreadyAdmin) {
            alreadyAdminList.push(targetNames[targetID] || "User");
            continue;
          }
          await api.changeAdminStatus(threadID, targetID, false);
          successList.push(targetNames[targetID] || "User");
        } else {
          if (isAlreadyAdmin) {
            alreadyAdminList.push(targetNames[targetID] || "User");
            continue;
          }
          await api.changeAdminStatus(threadID, targetID, true);
          successList.push(targetNames[targetID] || "User");
        }
      } catch (err) {
        console.error("Respect Error:", err);
        failedList.push(targetNames[targetID] || "User");
      }
    }

    // অবৈধ ইউজার তালিকা
    if (invalidUsers.length > 0) {
      for (const uid of invalidUsers) {
        failedList.push(`Invalid UID (${uid})`);
      }
    }

    // ========== রেসপন্স জেনারেট করা ==========
    let responseMessage = "";
    
    if (isRemove) {
      responseMessage = `🗑️ 𝗥𝗘𝗦𝗣𝗘𝗖𝗧 𝗥𝗘𝗠𝗢𝗩𝗘\n\n`;
      
      if (successList.length > 0) {
        for (const name of successList) {
          responseMessage += `✅ Removed admin: ${name}\n`;
        }
        responseMessage += `\n`;
      }
    } else {
      responseMessage = `🫡 𝗥𝗘𝗦𝗣𝗘𝗖𝗧\n\n🎉 𝗖𝗢𝗡𝗚𝗥𝗔𝗧𝗨𝗟𝗔𝗧𝗜𝗢𝗡𝗦 🎉\n\n`;
      
      if (successList.length > 0) {
        for (const name of successList) {
          responseMessage += `🎉 ${name} now a group admin!\n`;
        }
        responseMessage += `\n`;
      }
    }
    
    // ইতিমধ্যে অ্যাডমিন তালিকা
    if (alreadyAdminList.length > 0) {
      for (const name of alreadyAdminList) {
        if (isRemove) {
          responseMessage += `⚠️ Not admin: ${name}\n`;
        } else {
          responseMessage += `⚠️ Already admin: ${name}\n`;
        }
      }
      responseMessage += `\n`;
    }
    
    // ব্যর্থ তালিকা
    if (failedList.length > 0) {
      for (const name of failedList) {
        responseMessage += `❌ Failed: ${name}\n`;
      }
      responseMessage += `\n`;
    }
    
    if (successList.length === 0 && alreadyAdminList.length === 0 && failedList.length === 0) {
      responseMessage += `No valid user found!\n\n`;
    }
    
    responseMessage += `─ ─ ⋯ 👑 ⋯ ─ ─\n`;
    responseMessage += `📌 ${isRemove ? "Removed by" : "Promoted by"}: ${promoterName}`;
    
    api.sendMessage(responseMessage, threadID, event.messageID);
  }
};

// স্টাইলিশ নাম বানানোর ফাংশন
function makeStylish(name) {
  const stylishMap = {
    'A': 'Ꭺ', 'B': 'Ᏼ', 'C': 'Ꮯ', 'D': 'Ꭰ', 'E': 'Ꭼ', 'F': 'ᖴ', 'G': 'Ꮐ', 'H': 'Ꮋ',
    'I': 'Ꭵ', 'J': 'Ꭻ', 'K': 'Ꮶ', 'L': 'Ꮮ', 'M': 'Ꮇ', 'N': 'Ꮑ', 'O': 'Ꮎ', 'P': 'Ꮲ',
    'Q': 'Ꮔ', 'R': 'Ꭱ', 'S': 'Ꮪ', 'T': 'Ꭲ', 'U': 'Ꮜ', 'V': 'Ꮙ', 'W': 'Ꮃ', 'X': 'Ꮍ',
    'Y': 'Ꭹ', 'Z': 'Ꮓ',
    'a': 'Ꭺ', 'b': 'Ᏼ', 'c': 'Ꮯ', 'd': 'Ꭰ', 'e': 'Ꭼ', 'f': 'ᖴ', 'g': 'Ꮐ', 'h': 'Ꮋ',
    'i': 'Ꭵ', 'j': 'Ꭻ', 'k': 'Ꮶ', 'l': 'Ꮮ', 'm': 'Ꮇ', 'n': 'Ꮑ', 'o': 'Ꮎ', 'p': 'Ꮲ',
    'q': 'Ꮔ', 'r': 'Ꭱ', 's': 'Ꮪ', 't': 'Ꭲ', 'u': 'Ꮜ', 'v': 'Ꮙ', 'w': 'Ꮃ', 'x': 'Ꮍ',
    'y': 'Ꭹ', 'z': 'Ꮓ'
  };
  
  let stylishName = "";
  for (let char of name) {
    if (stylishMap[char]) {
      stylishName += stylishMap[char];
    } else if (char === ' ') {
      stylishName += ' ';
    } else {
      stylishName += char;
    }
  }
  return stylishName;
}
