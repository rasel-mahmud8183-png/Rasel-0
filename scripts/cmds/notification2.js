const { getStreamsFromAttachment } = global.utils;

module.exports = {
    config: {
        name: "notification2",
        aliases: ["notify2", "noti2", "announce", "broadcast"],
        version: "3.2",
        author: "Rasel Mahmud",
        countDown: 5,
        role: 2,
        description: "Send stylish notification to all/specific groups with media support",
        category: "owner",
        envConfig: {
            delayPerGroup: 250,
            adminID: "61567031991761", // আপনার UID
            adminGroupID: "23969001856034196" // আপনার নির্দিষ্ট গ্রুপ আইডি
        }
    },

    langs: {
        en: {
            missingMessage: "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n⚠️ Please enter the message you want to send\n\n╚═══════════════════╝",
            autoReplyMessage: "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n📌 Thanks for your reply! Admin Rasel Mahmud will be notified.\n\n╚═══════════════════╝",
            sentNotification: "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n✅ Sent notification to %1 groups\n\n╚═══════════════════╝",
            errorNotification: "❌ Failed to send to %1 groups",
            specificThread: "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n✅ Sent notification to specific thread: %1\n\n╚═══════════════════╝"
        }
    },

    onStart: async function ({ message, api, event, args, envCommands, threadsData, getLang }) {
        const { senderID, threadID, messageReply, attachments: eventAttachments } = event;
        
        // কনফিগারেশন থেকে ভ্যালু নিন
        const adminID = envCommands[this.config.name].adminID;
        const adminGroupID = envCommands[this.config.name].adminGroupID;
        
        // চেক করুন নির্দিষ্ট থ্রেড আইডি দেওয়া আছে কিনা
        let targetThreadID = null;
        let messageContent = args.join(" ");
        
        // কমান্ড প্যাটার্ন: notification2 [threadID] <message>
        if (args.length > 0 && /^\d+$/.test(args[0])) {
            targetThreadID = args[0];
            messageContent = args.slice(1).join(" ");
        }

        // মেসেজ এবং এটাচমেন্ট সংগ্রহ
        let notificationText = messageContent;
        let allAttachments = [];

        // যদি রিপ্লাই করা হয়, রিপ্লাই করা মেসেজের সবকিছু নিন
        if (messageReply) {
            if (!notificationText && messageReply.body) {
                notificationText = messageReply.body;
            }
            if (messageReply.attachments && messageReply.attachments.length > 0) {
                allAttachments = [...allAttachments, ...messageReply.attachments];
            }
        }

        // বর্তমান মেসেজের এটাচমেন্ট যোগ করুন
        if (eventAttachments && eventAttachments.length > 0) {
            allAttachments = [...allAttachments, ...eventAttachments];
        }

        // ভ্যালিডেশন
        if (!notificationText && allAttachments.length === 0) {
            return message.reply(getLang("missingMessage"));
        }

        const senderName = "Rasel Mahmud";

        // টাইমস্ট্যাম্প
        const timestamp = new Date().toLocaleString("en-US", { 
            timeZone: "Asia/Dhaka",
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        // নোটিফিকেশন বডি তৈরি
        let notificationBody = 
            "╔═══❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═══╗\n\n" +
            "📢 𝐍𝐎𝐓𝐈𝐂𝐄 𝐅𝐑𝐎𝐌 𝐀𝐃𝐌𝐈𝐍 📢\n" +
            "───────────────────────\n" +
            "👤 Admin: " + senderName + "\n" +
            "⏰ Time: " + timestamp + "\n";

        if (allAttachments.length > 0) {
            notificationBody += "📎 Attachments: " + allAttachments.length + "\n";
        }

        notificationBody += 
            "───────────────────────\n\n" +
            "📝 𝐌𝐞𝐬𝐬𝐚𝐠𝐞:\n" +
            "═══════════════════\n" +
            (notificationText || (allAttachments.length > 0 ? "[Media only]" : "")) + "\n" +
            "═══════════════════\n\n" +
            "💌 Sent with love by 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢\n" +
            "╚═══════════════════╝\n\n" +
            "❰ " + senderName + " ❱\n" +
            "Reply this message to respond to admin";

        // মেনশন তৈরি
        const mentions = [{
            tag: "❰ " + senderName + " ❱",
            id: adminID
        }];

        try {
            // এটাচমেন্ট প্রসেস
            let attachmentStreams = [];
            if (allAttachments.length > 0) {
                attachmentStreams = await getStreamsFromAttachment(allAttachments);
            }

            // নির্দিষ্ট থ্রেড আইডি দেওয়া থাকলে শুধু ওইটাতে পাঠান
            if (targetThreadID) {
                try {
                    const sentMsg = await api.sendMessage({
                        body: notificationBody,
                        mentions: mentions,
                        attachment: attachmentStreams
                    }, targetThreadID);

                    // ট্র্যাকার সেটআপ
                    global.GoatBot.onReply.set(sentMsg.messageID, {
                        commandName: this.config.name,
                        type: "notification_reply",
                        adminID: adminID,
                        adminGroupID: adminGroupID,
                        senderID: senderID,
                        threadID: targetThreadID,
                        notificationText: notificationText,
                        timestamp: timestamp
                    });

                    return message.reply(getLang("specificThread", targetThreadID));
                } catch (e) {
                    console.error("Failed to send to specific thread:", e);
                    return message.reply("❌ Failed to send to specified thread. Make sure the thread ID is correct.");
                }
            }

            // সব গ্রুপে পাঠান (ডিফল্ট)
            const allThreads = (await threadsData.getAll()).filter(t => t.isGroup);
            const sentThreads = [];

            for (const thread of allThreads) {
                try {
                    const sentMsg = await api.sendMessage({
                        body: notificationBody,
                        mentions: mentions,
                        attachment: attachmentStreams
                    }, thread.threadID);

                    sentThreads.push({
                        threadID: thread.threadID,
                        messageID: sentMsg.messageID,
                        threadName: thread.threadName || "Unknown"
                    });

                    // ট্র্যাকার সেটআপ
                    global.GoatBot.onReply.set(sentMsg.messageID, {
                        commandName: this.config.name,
                        type: "notification_reply",
                        adminID: adminID,
                        adminGroupID: adminGroupID,
                        senderID: senderID,
                        threadID: thread.threadID,
                        threadName: thread.threadName,
                        notificationText: notificationText,
                        timestamp: timestamp
                    });

                } catch (e) {
                    console.error(`Failed to send to thread ${thread.threadID}:`, e);
                }

                // ডিলে
                await new Promise(resolve => setTimeout(resolve, envCommands[this.config.name].delayPerGroup));
            }

            return message.reply(getLang("sentNotification", sentThreads.length));
        }
        catch (err) {
            console.error("❌ ERROR:", err);
            return message.reply("❌ Failed to send notification. Please try again.");
        }
    },

    onReply: async function ({ event, api, Reply, args, usersData }) {
        if (!Reply || Reply.type !== "notification_reply") return;

        const { adminID, adminGroupID, threadID: originalThreadID, threadName, notificationText } = Reply;
        const { messageReply, attachments: eventAttachments, threadID, senderID } = event;

        // রিপ্লাই কন্টেন্ট
        let replyContent = args.join(" ");
        let allAttachments = [];

        // যদি রিপ্লাই করা মেসেজ থেকে কন্টেন্ট নিতে হয়
        if (messageReply) {
            if (!replyContent && messageReply.body) {
                replyContent = messageReply.body;
            }
            if (messageReply.attachments && messageReply.attachments.length > 0) {
                allAttachments = [...allAttachments, ...messageReply.attachments];
            }
        }

        // বর্তমান মেসেজের এটাচমেন্ট যোগ করুন
        if (eventAttachments && eventAttachments.length > 0) {
            allAttachments = [...allAttachments, ...eventAttachments];
        }

        if (!replyContent && allAttachments.length === 0) {
            return api.sendMessage(
                "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n⚠️ Please enter your reply or attach media\n\n╚═══════════════════╝",
                threadID
            );
        }

        // টাইমস্ট্যাম্প
        const timestamp = new Date().toLocaleString("en-US", { 
            timeZone: "Asia/Dhaka",
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        // যে রিপ্লাই দিচ্ছে তার তথ্য
        const responderName = await usersData.getName(senderID);

        try {
            // এটাচমেন্ট প্রসেস
            let attachmentStreams = [];
            if (allAttachments.length > 0) {
                attachmentStreams = await getStreamsFromAttachment(allAttachments);
            }

            // গ্রুপ থেকে রিপ্লাই (ইউজার থেকে অ্যাডমিনের গ্রুপে)
            if (threadID !== adminGroupID) {
                // অ্যাডমিনের গ্রুপে ফরোয়ার্ড করুন
                let forwardMessage = 
                    "╔═══❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═══╗\n\n" +
                    "📩 𝐑𝐄𝐏𝐋𝐘 𝐅𝐑𝐎𝐌 𝐆𝐑𝐎𝐔𝐏 📩\n" +
                    "───────────────────────\n" +
                    "👤 Name: " + responderName + "\n" +
                    "🆔 User ID: " + senderID + "\n" +
                    "👥 Group: " + (threadName || "Unknown") + "\n" +
                    "🆔 Group ID: " + threadID + "\n" +
                    "⏰ Time: " + timestamp + "\n";

                if (allAttachments.length > 0) {
                    forwardMessage += "📎 Attachments: " + allAttachments.length + "\n";
                }

                forwardMessage += 
                    "───────────────────────\n\n" +
                    "📝 𝐑𝐞𝐩𝐥𝐲 𝐭𝐨 𝐧𝐨𝐭𝐢𝐟𝐢𝐜𝐚𝐭𝐢𝐨𝐧:\n" +
                    "═══════════════════\n" +
                    replyContent + "\n" +
                    "═══════════════════\n\n" +
                    "❰ " + responderName + " ❱\n" +
                    "Reply this message to respond to " + responderName + "\n" +
                    "╚═══════════════════╝";

                // মেনশন তৈরি
                const mentions = [{
                    tag: "❰ " + responderName + " ❱",
                    id: senderID
                }];

                // অ্যাডমিনের গ্রুপে পাঠান
                const sentToAdminGroup = await api.sendMessage({
                    body: forwardMessage,
                    mentions: mentions,
                    attachment: attachmentStreams
                }, adminGroupID);

                // ট্র্যাকার সেটআপ (অ্যাডমিনের রিপ্লাইয়ের জন্য)
                global.GoatBot.onReply.set(sentToAdminGroup.messageID, {
                    commandName: Reply.commandName,
                    type: "admin_reply_to_user",
                    adminID: adminID,
                    adminGroupID: adminGroupID,
                    userID: senderID,
                    userName: responderName,
                    userThreadID: threadID,
                    threadName: threadName,
                    timestamp: timestamp
                });

                // ইউজারকে কনফার্মেশন
                let confirmMsg = 
                    "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n" +
                    "✅ Reply sent to admin group\n\n" +
                    "👤 To: Admin Rasel Mahmud\n";

                if (allAttachments.length > 0) {
                    confirmMsg += "📎 Attachments: " + allAttachments.length + "\n";
                }

                confirmMsg += 
                    "\n📝 Your reply:\n" +
                    "═══════════════\n" +
                    replyContent.substring(0, 100) + (replyContent.length > 100 ? "..." : "") + "\n" +
                    "═══════════════\n\n" +
                    "╚═══════════════════╝";

                return api.sendMessage(confirmMsg, threadID);
            }
            else {
                // অ্যাডমিনের গ্রুপ থেকে রিপ্লাই (অ্যাডমিন থেকে ইউজারে)
                const { userID, userName, userThreadID, threadName: originalGroupName } = Reply;

                let adminReplyMessage = 
                    "╔═══❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═══╗\n\n" +
                    "📨 𝐀𝐃𝐌𝐈𝐍 𝐑𝐄𝐏𝐋𝐘 📨\n" +
                    "───────────────────────\n" +
                    "👤 Admin: " + responderName + "\n" +
                    "⏰ Time: " + timestamp + "\n";

                if (allAttachments.length > 0) {
                    adminReplyMessage += "📎 Attachments: " + allAttachments.length + "\n";
                }

                adminReplyMessage += 
                    "───────────────────────\n\n" +
                    "📝 𝐑𝐞𝐩𝐥𝐲 𝐭𝐨 𝐲𝐨𝐮𝐫 𝐪𝐮𝐞𝐫𝐲:\n" +
                    "═══════════════════\n" +
                    replyContent + "\n" +
                    "═══════════════════\n\n" +
                    "❰ " + responderName + " ❱\n" +
                    "Reply this message to respond to admin\n" +
                    "╚═══════════════════╝";

                // মেনশন তৈরি
                const mentions = [{
                    tag: "❰ " + responderName + " ❱",
                    id: adminID
                }];

                // ইউজারকে রিপ্লাই পাঠান
                const sentToUser = await api.sendMessage({
                    body: adminReplyMessage,
                    mentions: mentions,
                    attachment: attachmentStreams
                }, userThreadID);

                // ট্র্যাকার সেটআপ
                global.GoatBot.onReply.set(sentToUser.messageID, {
                    commandName: Reply.commandName,
                    type: "notification_reply",
                    adminID: adminID,
                    adminGroupID: adminGroupID,
                    senderID: senderID,
                    threadID: userThreadID,
                    threadName: originalGroupName,
                    timestamp: timestamp
                });

                // অ্যাডমিনকে কনফার্মেশন
                let confirmMsg = 
                    "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n" +
                    "✅ Reply sent to user\n\n" +
                    "👤 To: " + userName + "\n" +
                    "👥 Group: " + (originalGroupName || "Unknown") + "\n";

                if (allAttachments.length > 0) {
                    confirmMsg += "📎 Attachments: " + allAttachments.length + "\n";
                }

                confirmMsg += 
                    "\n📝 Your reply:\n" +
                    "═══════════════\n" +
                    replyContent.substring(0, 100) + (replyContent.length > 100 ? "..." : "") + "\n" +
                    "═══════════════\n\n" +
                    "╚═══════════════════╝";

                return api.sendMessage(confirmMsg, threadID);
            }
        }
        catch (err) {
            console.error("Reply Error:", err);
            return api.sendMessage(
                "╔═════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱═════╗\n\n❌ Failed to send reply\n\n╚═══════════════════╝",
                threadID
            );
        }
    }
};
