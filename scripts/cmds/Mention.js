module.exports = {
  config: {
    name: "mention",
    version: "1.0.2",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    shortDescription: "Mention all members with names",
    longDescription: "Mentions all group members one by one and shows their real names",
    category: "group",
    guide: {
      en: "mention"
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const threadID = event.threadID;

      // Get group info
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.userInfo;

      if (!members || members.length === 0) {
        return api.sendMessage("❌ No group members found.", threadID);
      }

      let mentions = [];
      let message = "📣 Group Members List:\n\n";

      for (let i = 0; i < members.length; i++) {
        const user = members[i];
        const name = user.name || "Unknown User";

        message += `${i + 1}. ${name}\n`;
        mentions.push({
          tag: name,
          id: user.id
        });
      }

      api.sendMessage(
        {
          body: message,
          mentions: mentions
        },
        threadID
      );

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ Failed to fetch and mention group members.", event.threadID);
    }
  }
};
