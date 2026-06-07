const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
    config: {
        name: "admin",
        version: "2.0",
        author: "Rasel Mahmud",
        countDown: 5,
        role: 2,
        description: {
            vi: "Thêm, xóa, sửa quyền admin",
            en: "👑 Add, remove, edit admin role"
        },
        category: "box chat",
        guide: {
            en: "   {pn} add <uid | @tag | reply> : 👑 Add admin\n" +
                 "   {pn} remove <uid | @tag | reply> : ❌ Remove admin\n" +
                 "   {pn} list : 📜 Show admin list"
        }
    },

    langs: {
        en: {
            added: "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n✅ 𝐀𝐃𝐌𝐈𝐍 𝐀𝐃𝐃𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘\n╚═════════════════╝\n\n👑 𝗡𝗲𝘄 𝗔𝗱𝗺𝗶𝗻(𝘀): %1\n\n%2",
            alreadyAdmin: "\n⚠️ 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗔𝗱𝗺𝗶𝗻(𝘀): %1\n\n%2",
            missingIdAdd: "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n❌ 𝗘𝗥𝗥𝗢𝗥\n╚═════════════════╝\n\n⚠️ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗺𝗲𝗻𝘁𝗶𝗼𝗻, 𝗿𝗲𝗽𝗹𝘆 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗨𝗜𝗗 𝘁𝗼 𝗮𝗱𝗱 𝗮𝗱𝗺𝗶𝗻",
            removed: "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n✅ 𝐀𝐃𝐌𝐈𝐍 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘\n╚═════════════════╝\n\n❌ 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 𝗔𝗱𝗺𝗶𝗻(𝘀): %1\n\n%2",
            notAdmin: "\n⚠️ 𝗡𝗼𝘁 𝗔𝗱𝗺𝗶𝗻(𝘀): %1\n\n%2",
            missingIdRemove: "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n❌ 𝗘𝗥𝗥𝗢𝗥\n╚═════════════════╝\n\n⚠️ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗺𝗲𝗻𝘁𝗶𝗼𝗻, 𝗿𝗲𝗽𝗹𝘆 𝗼𝗿 𝗲𝗻𝘁𝗲𝗿 𝗨𝗜𝗗 𝘁𝗼 𝗿𝗲𝗺𝗼𝘃𝗲 𝗮𝗱𝗺𝗶𝗻",
            listAdmin: "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n👑 𝐀𝐃𝐌𝐈𝐍 𝐇𝐈𝐄𝐑𝐀𝐑𝐂𝐇𝐘\n╚═════════════════╝\n\n%1\n\n╔═════════════════════╗\n║➤『 一 ᎡᎪᏚᎬᏞ ཐི༏ཋྀ࿐ 💎✨』☜ヅ\n╚═════════════════════╝"
        }
    },

    onStart: async function ({ message, args, usersData, event, getLang, api }) {
        const command = args[0]?.toLowerCase();
        const MAIN_ADMIN = "61567031991761";

        // নাম পাওয়ার ফাংশন - একাধিক সোর্স থেকে ট্রাই করবে
        const getName = async (uid) => {
            try {
                // ১ম চেষ্টা: usersData থেকে
                const name = await usersData.getName(uid);
                if (name && name !== "null" && name !== "undefined" && name.trim() !== "") {
                    return name;
                }
            } catch {}

            try {
                // ২য় চেষ্টা: Facebook API থেকে
                const userInfo = await api.getUserInfo(uid);
                const fbName = userInfo[uid]?.name;
                if (fbName && fbName !== "null" && fbName !== "undefined") {
                    // নাম পেলে usersData-এই সেভ করে দিন
                    try { await usersData.set(uid, { name: fbName }); } catch {}
                    return fbName;
                }
            } catch {}

            // ৩য় চেষ্টা: threadMembers থেকে সার্চ
            try {
                const threadInfo = await api.getThreadInfo(event.threadID);
                const member = threadInfo.userInfo.find(m => m.id === uid);
                if (member?.name && member.name !== "null") {
                    try { await usersData.set(uid, { name: member.name }); } catch {}
                    return member.name;
                }
            } catch {}

            // সব ব্যর্থ হলে
            return "𝐔𝐧𝐤𝐧𝐨𝐰𝐧 𝐔𝐬𝐞𝐫";
        };

        switch (command) {
            case "add":
            case "-a": {
                let uids = [];
                
                if (event.messageReply) {
                    uids.push(event.messageReply.senderID);
                }
                else if (Object.keys(event.mentions).length > 0) {
                    uids = Object.keys(event.mentions);
                }
                else if (args[1]) {
                    uids = args.slice(1).filter(arg => !isNaN(arg));
                }
                else {
                    return message.reply(getLang("missingIdAdd"));
                }

                if (uids.length === 0) {
                    return message.reply(getLang("missingIdAdd"));
                }

                const notAdminIds = [];
                const adminIds = [];
                
                for (const uid of uids) {
                    if (config.adminBot.includes(uid))
                        adminIds.push(uid);
                    else
                        notAdminIds.push(uid);
                }

                config.adminBot.push(...notAdminIds);
                
                // সব নাম একসাথে আনা
                const getNames = await Promise.all(uids.map(async uid => {
                    const name = await getName(uid);
                    return { uid, name };
                }));
                
                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                let msg = "";
                if (notAdminIds.length > 0) {
                    const newAdmins = getNames
                        .filter(u => notAdminIds.includes(u.uid))
                        .map(u => {
                            const rank = u.uid === MAIN_ADMIN ? "♛ 𝐊𝐈𝐍𝐆" : "♜ 𝐋𝐎𝐑𝐃";
                            return `▸ ${rank} ➤ ${u.name}\n  └─ 🆔 ${u.uid}`;
                        })
                        .join("\n\n");
                    msg += getLang("added", notAdminIds.length, newAdmins);
                }
                if (adminIds.length > 0) {
                    const existingAdmins = getNames
                        .filter(u => adminIds.includes(u.uid))
                        .map(u => {
                            const rank = u.uid === MAIN_ADMIN ? "♛ 𝐊𝐈𝐍𝐆" : "♜ 𝐋𝐎𝐑𝐃";
                            return `▸ ${rank} ➤ ${u.name}\n  └─ 🆔 ${u.uid}`;
                        })
                        .join("\n\n");
                    msg += getLang("alreadyAdmin", adminIds.length, existingAdmins);
                }
                
                return message.reply(msg);
            }

            case "remove":
            case "-r": {
                let uids = [];
                
                if (event.messageReply) {
                    uids.push(event.messageReply.senderID);
                }
                else if (Object.keys(event.mentions).length > 0) {
                    uids = Object.keys(event.mentions);
                }
                else if (args[1]) {
                    uids = args.slice(1).filter(arg => !isNaN(arg));
                }
                else {
                    return message.reply(getLang("missingIdRemove"));
                }

                if (uids.length === 0) {
                    return message.reply(getLang("missingIdRemove"));
                }

                if (uids.includes(MAIN_ADMIN)) {
                    return message.reply("╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n🚫 𝐀𝐂𝐂𝐄𝐒𝐒 𝐃𝐄𝐍𝐈𝐄𝐃\n╚═════════════════╝\n\n♛ 𝐓𝐇𝐄 𝐊𝐈𝐍𝐆 𝐂𝐀𝐍𝐍𝐎𝐓 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃! 👑");
                }

                const notAdminIds = [];
                const adminIds = [];
                
                for (const uid of uids) {
                    if (config.adminBot.includes(uid))
                        adminIds.push(uid);
                    else
                        notAdminIds.push(uid);
                }

                for (const uid of adminIds)
                    config.adminBot.splice(config.adminBot.indexOf(uid), 1);

                const getNames = await Promise.all(uids.map(async uid => {
                    const name = await getName(uid);
                    return { uid, name };
                }));
                
                writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                let msg = "";
                if (adminIds.length > 0) {
                    const removedAdmins = getNames
                        .filter(u => adminIds.includes(u.uid))
                        .map(u => `▸ ❌ ➤ ${u.name}\n  └─ 🆔 ${u.uid}`)
                        .join("\n\n");
                    msg += getLang("removed", adminIds.length, removedAdmins);
                }
                if (notAdminIds.length > 0) {
                    const nonAdmins = getNames
                        .filter(u => notAdminIds.includes(u.uid))
                        .map(u => `▸ ⚠️ ➤ ${u.name}\n  └─ 🆔 ${u.uid}`)
                        .join("\n\n");
                    msg += getLang("notAdmin", notAdminIds.length, nonAdmins);
                }

                return message.reply(msg);
            }

            case "list":
            case "-l": {
                if (config.adminBot.length === 0) {
                    return message.reply("╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n📜 𝐀𝐃𝐌𝐈𝐍 𝐇𝐈𝐄𝐑𝐀𝐑𝐂𝐇𝐘\n╚═════════════════╝\n\n⚠️ 𝗡𝗼 𝗮𝗱𝗺𝗶𝗻𝘀 𝗳𝗼𝘂𝗻𝗱!\n\n╔═════════════════════╗\n║➤『 一 ᎡᎪᏚᎬᏞ ཐི༏ཋྀ࿐ 💎✨』☜ヅ\n╚═════════════════════╝");
                }

                // নাম লোডিং মেসেজ
                const loadingMsg = await api.sendMessage("⏳ 𝐋𝐨𝐚𝐝𝐢𝐧𝐠 𝐚𝐝𝐦𝐢𝐧 𝐥𝐢𝐬𝐭...", event.threadID);

                const getNames = await Promise.all(
                    config.adminBot.map(async uid => {
                        const name = await getName(uid);
                        return { uid, name };
                    })
                );

                // লোডিং মেসেজ ডিলিট
                try { await api.unsendMessage(loadingMsg.messageID); } catch {}

                const mainAdmin = getNames.find(u => u.uid === MAIN_ADMIN);
                const otherAdmins = getNames.filter(u => u.uid !== MAIN_ADMIN);

                let adminList = "";

                if (mainAdmin) {
                    adminList += `┌───── 𝐊𝐈𝐍𝐆 ────┐\n`;
                    adminList += `│  ♛   一 ${mainAdmin.name}\n`;
                    adminList += `│  └─ 🆔 ${mainAdmin.uid}\n`;
                    adminList += `└─────────────────┘`;
                }

                if (otherAdmins.length > 0) {
                    adminList += `\n\n┌──── 𝐋𝐎𝐑𝐃𝐒 ────┐`;
                    otherAdmins.forEach((u, i) => {
                        adminList += `\n│\n│  ${i + 1}. ♜ ${u.name}\n│  └─ 🆔 ${u.uid}`;
                    });
                    adminList += `\n└─────────────────────┘`;
                }

                return message.reply(getLang("listAdmin", adminList));
            }

            default:
                return message.reply(
                    "╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n👑 𝐀𝐃𝐌𝐈𝐍 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒\n╚═════════════════╝\n\n" +
                    "📌 /admin add <mention/reply/uid>\n" +
                    "📌 /admin remove <mention/reply/uid>\n" +
                    "📌 /admin list\n\n" +
                    "╔═════════════════════╗\n║➤『 一 ᎡᎪᏚᎬᏞ ཐི༏ཋྀ࿐ 💎✨』☜ヅ\n╚═════════════════════╝"
                );
        }
    }
};
