const { getStreamsFromAttachment } = global.utils;

// 🔥 অ্যাডমিন কনফিগারেশন
const CONFIG = {
	TARGET_THREAD_ID: "23969001856034196",
	ADMIN_NAME: "Rasel Mahmud",
	BOT_NAME: "𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢",
	TIMEZONE: "Asia/Dhaka"
};

module.exports = {
	config: {
		name: "call",
		aliases: ["callad", "admin", "report", "feedback", "contact"],
		version: "13.0",
		author: CONFIG.ADMIN_NAME,
		countDown: 3,
		role: 0,
		shortDescription: {
			en: "📞 Contact Admin"
		},
		longDescription: {
			en: "Send messages, photos, videos to admin"
		},
		category: "utility",
		guide: {
			en: "{pn} <message>\n{pn} (reply to any message with media)"
		}
	},

	// ইউজার থেকে অ্যাডমিনে মেসেজ পাঠান (প্রথমবার)
	onStart: async function ({ args, message, event, usersData, threadsData, api, commandName }) {
		const { senderID, threadID, isGroup, messageReply, attachments: eventAttachments } = event;
		
		// বর্তমান মেসেজের কন্টেন্ট
		let messageContent = args.join(" ");
		
		// অ্যাটাচমেন্ট কালেকশন
		let allAttachments = [];
		
		// যদি রিপ্লাই করা হয় (প্রথমবার)
		if (messageReply) {
			// রিপ্লাই করা মেসেজের টেক্সট যোগ করুন (যদি ইউজার নিজে কিছু না লিখে থাকে)
			if (!messageContent && messageReply.body) {
				messageContent = messageReply.body;
			}
			
			// রিপ্লাই করা মেসেজের এটাচমেন্ট যোগ করুন (প্রথমবারের জন্য)
			if (messageReply.attachments && messageReply.attachments.length > 0) {
				allAttachments = [...allAttachments, ...messageReply.attachments];
			}
		}
		
		// বর্তমান মেসেজের এটাচমেন্ট যোগ করুন
		if (eventAttachments && eventAttachments.length > 0) {
			allAttachments = [...allAttachments, ...eventAttachments];
		}
		
		// ভ্যালিডেশন
		if (!messageContent && allAttachments.length === 0) {
			return message.reply(
				"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
				"⚠️ Please enter your message or attach media.\n\n" +
				"╚═══════════════════╝"
			);
		}

		// ইউজার ইনফো
		const senderName = await usersData.getName(senderID);
		const threadInfo = isGroup ? await threadsData.get(threadID) : null;
		
		// টাইমস্ট্যাম্প
		const timestamp = new Date().toLocaleString("en-US", { 
			timeZone: CONFIG.TIMEZONE,
			month: "short",
			day: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true
		});

		// ইউজারের মেসেজ ফরম্যাট
		let userMessage = 
			"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
			"👤 Name: " + senderName + "\n" +
			"🆔 User ID: " + senderID + "\n" +
			"📱 From: " + (isGroup ? "Group Chat" : "Private Chat") + "\n";

		if (isGroup) {
			userMessage += "👥 Group: " + (threadInfo?.threadName || "Unknown") + "\n";
			userMessage += "🆔 Group ID: " + threadID + "\n";
		}

		userMessage += "⏰ Time: " + timestamp + "\n";

		if (allAttachments.length > 0) {
			userMessage += "\n📎 Attachments: " + allAttachments.length + "\n";
		}

		userMessage += "\n📝 Message:\n";
		userMessage += "═══════════════════\n";
		userMessage += messageContent || (allAttachments.length > 0 ? "[Media only]" : "");
		userMessage += "\n─━─━─━─━─━─━─━─━─━─━─━─\n";
		userMessage += "╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n";
		userMessage += "Reply this message to respond\n";
		userMessage += "╚═══════════════════╝";

		try {
			// সব এটাচমেন্ট প্রসেস
			let attachmentStreams = [];
			if (allAttachments.length > 0) {
				attachmentStreams = await getStreamsFromAttachment(allAttachments);
			}

			const sentMsg = await api.sendMessage({
				body: userMessage,
				attachment: attachmentStreams
			}, CONFIG.TARGET_THREAD_ID);

			// ট্র্যাকার সেটআপ
			global.GoatBot.onReply.set(sentMsg.messageID, {
				commandName: commandName,
				type: "active_chat",
				userID: senderID,
				userName: senderName,
				userThreadID: threadID,
				isGroup: isGroup,
				groupName: threadInfo?.threadName,
				isFirstMessage: true // প্রথমবার চিহ্নিত
			});

			// কনফার্মেশন
			let confirmMsg = 
				"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
				"✅ Message sent to admin";
			
			if (allAttachments.length > 0) {
				confirmMsg += "\n📎 " + allAttachments.length + " attachment(s)";
			}
			
			confirmMsg += "\n\n⏰ Admin will reply soon\n\n" +
				"╚═══════════════════╝";
			
			return message.reply(confirmMsg);
		}
		catch (err) {
			console.error("❌ ERROR:", err);
			return message.reply(
				"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
				"❌ Failed to send message\n\n" +
				"⚠️ Please try again\n\n" +
				"╚═══════════════════╝"
			);
		}
	},

	// রিপ্লাই হ্যান্ডলার (দ্বিতীয়বার, তৃতীয়বার...)
	onReply: async function ({ event, api, Reply, args, usersData }) {
		if (!Reply || Reply.type !== "active_chat") return;

		const { messageReply, attachments: eventAttachments, threadID, senderID } = event;
		
		// দ্বিতীয়বার থেকে শুধু বর্তমান মেসেজের কন্টেন্ট
		let replyContent = args.join(" ");
		
		// শুধু বর্তমান মেসেজের এটাচমেন্ট (রিপ্লাই করা মেসেজের কিছু না)
		let currentAttachments = [];

		// দ্বিতীয়বার থেকে রিপ্লাই করা মেসেজের কিছুই নেওয়া হবে না
		// messageReply completely ignored for subsequent replies
		
		// শুধু বর্তমান মেসেজের এটাচমেন্ট
		if (eventAttachments && eventAttachments.length > 0) {
			currentAttachments = [...eventAttachments];
		}

		// ভ্যালিডেশন
		if (!replyContent && currentAttachments.length === 0) {
			return api.sendMessage(
				"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
				"⚠️ Please enter your message or attach media\n\n" +
				"╚═══════════════════╝",
				threadID
			);
		}

		// টাইমস্ট্যাম্প
		const timestamp = new Date().toLocaleString("en-US", { 
			timeZone: CONFIG.TIMEZONE,
			month: "short",
			day: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true
		});

		// যে উত্তর দিচ্ছে তার নাম
		const responderName = await usersData.getName(senderID);

		try {
			// শুধু বর্তমান এটাচমেন্ট প্রসেস
			let attachmentStreams = [];
			if (currentAttachments.length > 0) {
				attachmentStreams = await getStreamsFromAttachment(currentAttachments);
			}

			const { userID, userName, userThreadID, isGroup, groupName } = Reply;

			// কোন থ্রেড থেকে রিপ্লাই আসছে?
			if (threadID === CONFIG.TARGET_THREAD_ID) {
				// অ্যাডমিন থেকে ইউজারে রিপ্লাই
				
				let adminReply = 
					"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
					"👤 Admin: " + responderName + "\n" +
					"⏰ Time: " + timestamp + "\n";

				if (currentAttachments.length > 0) {
					adminReply += "📎 Attachments: " + currentAttachments.length + "\n";
				}

				adminReply += "─━─━─━─━─━─━─━─━─━─━─━─\n";
				adminReply += "📝 Reply:\n";
				adminReply += "❰ " + userName + " ❱\n";
				adminReply += replyContent + "\n";
				adminReply += "╚═══════════════════╝\n\n";
				adminReply += "Reply this message to respond";

				const mentions = [{
					tag: "❰ " + userName + " ❱",
					id: userID
				}];

				try {
					const sentMsg = await api.sendMessage({
						body: adminReply,
						mentions: mentions,
						attachment: attachmentStreams
					}, userThreadID);

					// নতুন ট্র্যাকার (পরবর্তী রিপ্লাইয়ের জন্য)
					global.GoatBot.onReply.set(sentMsg.messageID, {
						commandName: Reply.commandName,
						type: "active_chat",
						userID: userID,
						userName: userName,
						userThreadID: userThreadID,
						isGroup: isGroup,
						groupName: groupName
					});

					let confirmMsg = 
						"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
						"✅ Reply sent\n\n" +
						"👤 To: " + userName + "\n";
					
					if (isGroup) {
						confirmMsg += "👥 Group: " + (groupName || "Unknown") + "\n";
					}
					
					if (currentAttachments.length > 0) {
						confirmMsg += "📎 Attachments: " + currentAttachments.length + "\n";
					}
					
					confirmMsg += "\n📝 Reply:\n";
					confirmMsg += "═══════════════\n";
					confirmMsg += replyContent.substring(0, 100);
					if (replyContent.length > 100) confirmMsg += "...";
					confirmMsg += "\n═══════════════\n\n";
					confirmMsg += "╚═══════════════════╝";
					
					return api.sendMessage(confirmMsg, threadID);
				}
				catch (sendError) {
					console.error("Send Error:", sendError);
					
					let errorMsg = 
						"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
						"❌ Reply failed\n\n";
					
					if (sendError.message && sendError.message.includes("blocked")) {
						errorMsg += "🚫 User has blocked the bot";
					} 
					else if (sendError.message && sendError.message.includes("left")) {
						errorMsg += "🚪 User has left the chat";
					}
					else {
						errorMsg += "❓ Unknown error";
					}
					
					errorMsg += "\n\n╚═══════════════════╝";
					
					return api.sendMessage(errorMsg, threadID);
				}
			} 
			else {
				// ইউজার থেকে অ্যাডমিনে রিপ্লাই (দ্বিতীয়বার, তৃতীয়বার...)
				// শুধু বর্তমান মেসেজ যাবে
				
				let userReply = 
					"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
					"👤 Name: " + responderName + "\n" +
					"⏰ Time: " + timestamp + "\n";

				if (currentAttachments.length > 0) {
					userReply += "📎 Attachments: " + currentAttachments.length + "\n";
				}

				userReply += "─━─━─━─━─━─━─━─━─━─━─━─\n";
				userReply += "📝 Message:\n";
				userReply += "❰ " + CONFIG.ADMIN_NAME + " ❱\n";
				userReply += replyContent + "\n";
				userReply += "╚═══════════════════╝\n\n";
				userReply += "Reply this message to respond";

				const mentions = [{
					tag: "❰ " + CONFIG.ADMIN_NAME + " ❱",
					id: CONFIG.TARGET_THREAD_ID
				}];

				try {
					const sentMsg = await api.sendMessage({
						body: userReply,
						mentions: mentions,
						attachment: attachmentStreams
					}, CONFIG.TARGET_THREAD_ID);

					// নতুন ট্র্যাকার
					global.GoatBot.onReply.set(sentMsg.messageID, {
						commandName: Reply.commandName,
						type: "active_chat",
						userID: senderID,
						userName: responderName,
						userThreadID: threadID,
						isGroup: isGroup,
						groupName: groupName
					});

					let confirmMsg = 
						"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
						"✅ Message sent to admin\n\n" +
						"👤 To: Admin\n";
					
					if (currentAttachments.length > 0) {
						confirmMsg += "📎 Attachments: " + currentAttachments.length + "\n";
					}
					
					confirmMsg += "\n📝 Message:\n";
					confirmMsg += "═══════════════\n";
					confirmMsg += replyContent.substring(0, 100);
					if (replyContent.length > 100) confirmMsg += "...";
					confirmMsg += "\n═══════════════\n\n";
					confirmMsg += "╚═══════════════════╝";
					
					return api.sendMessage(confirmMsg, threadID);
				}
				catch (sendError) {
					console.error("Send Error:", sendError);
					
					let errorMsg = 
						"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
						"❌ Message failed\n\n";
					
					if (sendError.message && sendError.message.includes("blocked")) {
						errorMsg += "🚫 Bot may be blocked";
					} 
					else {
						errorMsg += "❓ Unknown error";
					}
					
					errorMsg += "\n\n╚═══════════════════╝";
					
					return api.sendMessage(errorMsg, threadID);
				}
			}
		}
		catch (err) {
			console.error("Process Error:", err);
			return api.sendMessage(
				"╔═════❰ " + CONFIG.BOT_NAME + " ❱═════╗\n\n" +
				"❌ Processing error\n\n" +
				"⚠️ Please try again\n\n" +
				"╚═══════════════════╝",
				threadID
			);
		}
	}
};
