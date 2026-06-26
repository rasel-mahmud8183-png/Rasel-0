const axios = require('axios');
const BOT_NICKNAME = "➤『 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 💎✨』☜ヅ";

// TikTok ভিডিও ফাংশন (আপডেটেড API সহ)
async function getTikTokVideo() {
  try {
    console.log('🔄 Fetching TikTok video from new API...');
    
    const apiUrl = `https://lyric-search-neon.vercel.app/kshitiz?keyword=anime%20phonk%20edit`;
    console.log('🎬 Calling TikTok API:', apiUrl);
    
    const response = await axios.get(apiUrl, {
      timeout: 15000
    });
    console.log('📊 API Response Status:', response.status);
    
    const videos = response.data;
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      console.log('❌ No videos found in API response');
      return null;
    }
    
    console.log(`✅ Found ${videos.length} videos`);
    const randomIndex = Math.floor(Math.random() * videos.length);
    const selectedVideo = videos[randomIndex];
    
    console.log('🎥 Selected Video:', {
      title: selectedVideo.title,
      url: selectedVideo.videoUrl ? 'URL exists' : 'No URL'
    });
    
    return {
      url: selectedVideo.videoUrl,
      title: selectedVideo.title || 'Anime Phonk Edit',
      videoId: selectedVideo.id || randomIndex,
      author: selectedVideo.author?.unique_id || 'Unknown'
    };
    
  } catch (error) {
    console.error('❌ TikTok API Error:', error.message);
    
    try {
      console.log('🔄 Trying backup search...');
      const fallbackResponse = await axios.get('https://lyric-search-neon.vercel.app/kshitiz?keyword=phonk%20edit', {
        timeout: 15000
      });
      const fallbackVideos = fallbackResponse.data;
      
      if (fallbackVideos && Array.isArray(fallbackVideos) && fallbackVideos.length > 0) {
        const randomVideo = fallbackVideos[Math.floor(Math.random() * fallbackVideos.length)];
        console.log('✅ Backup video found');
        return {
          url: randomVideo.videoUrl,
          title: randomVideo.title || 'Phonk Edit (Backup)',
          author: randomVideo.author?.unique_id || 'Unknown'
        };
      }
    } catch (fallbackError) {
      console.error('❌ Fallback API Error:', fallbackError.message);
    }
    
    return null;
  }
}

async function getStreamFromURL(url) {
  try {
    console.log('📥 Downloading video from:', url);
    const response = await axios.get(url, { 
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log('✅ Video stream downloaded successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Stream Download Error:', error.message);
    return null;
  }
}

async function setBotNickname(api, threadID) {
  try {
    const botUserID = api.getCurrentUserID();
    await api.changeNickname(BOT_NICKNAME, threadID, botUserID);
    console.log(`✅ Nickname set to "${BOT_NICKNAME}" in group: ${threadID}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to set nickname in group ${threadID}:`, error.message);
    return false;
  }
}

module.exports = {
  config: {
    name: "pending",
    aliases: ["pend", "approve", "groupreq", "pa"],
    version: "6.1",
    author: "Rasel Mahmud",
    countDown: 3,
    role: 2,
    description: {
      en: "View and approve/decline pending group invitations with auto video & nickname"
    },
    category: "owner",
    guide: {
      en: `{pn} - View pending groups\n{pn} approve [numbers] - Approve specific groups\n{pn} decline [numbers] - Decline specific groups\n{pn} all - Approve all pending groups\n{pn} help - Show help`
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, messageID, senderID, body } = event;
    
    if (String(senderID) !== String(Reply.author)) {
      return api.sendMessage("⚠️ You are not authorized to use this reply.", threadID, messageID);
    }
    
    const { pending } = Reply;
    const input = body.trim();
    
    if (Reply.type === 'approve') {
      const numbers = input.split(/\s+/)
        .map(num => parseInt(num))
        .filter(num => !isNaN(num) && num > 0 && num <= pending.length);
      
      if (numbers.length === 0) {
        return api.sendMessage("❌ Please provide valid numbers to approve.\nExample: 1 3 5", threadID, messageID);
      }
      
      let approvedCount = 0;
      let videoSentCount = 0;
      let results = [];
      
      for (const num of numbers) {
        const groupIndex = num - 1;
        const group = pending[groupIndex];
        
        try {
          console.log(`\n🚀 Processing group ${num}: ${group.name} (${group.threadID})`);
          
          await setBotNickname(api, group.threadID);
          
          const tiktokVideo = await getTikTokVideo();
          let videoStream = null;
          if (tiktokVideo && tiktokVideo.url) {
            videoStream = await getStreamFromURL(tiktokVideo.url);
          }
          
          const messageBody = `╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n🎉 Thank you for inviting me to: ${group.name}!\n📌 Prefix: ${global.GoatBot.config.prefix}\n📜 Use ${global.GoatBot.config.prefix}help for commands\n👑 Owner: Rasel Mahmud\n🔗 Facebook: https://www.facebook.com/mi.ujika.byanda\n╚══════════════════╝` + 
            (videoStream ? '\n\n🎬 **Enjoy this anime phonk edit!**' : '');
          
          if (videoStream) {
            await api.sendMessage({
              body: messageBody,
              attachment: videoStream
            }, group.threadID);
            videoSentCount++;
            console.log(`✅ Video sent to ${group.name}`);
          } else {
            await api.sendMessage({
              body: messageBody
            }, group.threadID);
            console.log(`✅ Message sent to ${group.name} (no video)`);
          }
          
          approvedCount++;
          results.push(`✅ ${group.name}`);
          
        } catch (error) {
          console.error(`❌ Error with group ${group.name}:`, error.message);
          results.push(`❌ ${group.name} (Error: ${error.message})`);
        }
      }
      
      const resultMessage = `📋 **Approval Results:**\n\n${results.join('\n')}\n\n✅ Approved: ${approvedCount} groups\n🎬 Videos sent: ${videoSentCount}`;
      return api.sendMessage(resultMessage, threadID, messageID);
    }
    
    if (Reply.type === 'decline') {
      const numbers = input.split(/\s+/)
        .map(num => parseInt(num))
        .filter(num => !isNaN(num) && num > 0 && num <= pending.length);
      
      if (numbers.length === 0) {
        return api.sendMessage("❌ Please provide valid numbers to decline.", threadID, messageID);
      }
      
      let declinedCount = 0;
      for (const num of numbers) {
        const groupIndex = num - 1;
        const group = pending[groupIndex];
        
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);
          declinedCount++;
          console.log(`✅ Declined: ${group.name}`);
        } catch (error) {
          console.error(`❌ Error declining ${group.name}:`, error.message);
        }
      }
      
      return api.sendMessage(`❌ Successfully declined ${declinedCount} group(s)!`, threadID, messageID);
    }
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const command = args[0] ? args[0].toLowerCase() : 'list';

    if (command === 'help') {
      const helpMessage = `╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 - PENDING SYSTEM v6.1 ❱════╗

📋 **COMMANDS:**
• ${global.GoatBot.config.prefix}pending - View pending groups
• ${global.GoatBot.config.prefix}pending approve 1 2 3 - Approve groups
• ${global.GoatBot.config.prefix}pending decline 4 5 - Decline groups
• ${global.GoatBot.config.prefix}pending all - Approve all
• ${global.GoatBot.config.prefix}pa - Short form (alias)

📝 **USAGE:**
1. First use: ${global.GoatBot.config.prefix}pending
2. Then reply with numbers: 1 3 5
3. Or use quick commands directly

⚡ **FEATURES:**
• Auto-sends anime video on approval
• Auto-sets nickname: "${BOT_NICKNAME}"
• Works with ${global.GoatBot.config.prefix}pa shortcut

╚═══════════════════════════════╝`;
      return api.sendMessage(helpMessage, threadID, messageID);
    }

    if (command === 'all') {
      try {
        const pendingList = await api.getThreadList(100, null, ["PENDING"]);
        const pendingGroups = pendingList.filter(t => t.isGroup);
        
        if (pendingGroups.length === 0) {
          return api.sendMessage("📭 No pending groups to approve!", threadID, messageID);
        }
        
        let approvedCount = 0;
        let videoSentCount = 0;
        
        for (const group of pendingGroups) {
          try {
            await setBotNickname(api, group.threadID);
            const tiktokVideo = await getTikTokVideo();
            
            let videoStream = null;
            if (tiktokVideo && tiktokVideo.url) {
              videoStream = await getStreamFromURL(tiktokVideo.url);
            }
            
            const messageBody = `╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n🎉 Thank you for inviting me!\n📌 Prefix: ${global.GoatBot.config.prefix}\n📜 Use ${global.GoatBot.config.prefix}help\n👑 Owner: Rasel Mahmud\n🔗 Facebook: https://www.facebook.com/mi.ujika.byanda\n╚══════════════════╝`;
            
            if (videoStream) {
              await api.sendMessage({
                body: messageBody + '\n\n🎬 **Enjoy this anime phonk edit!**',
                attachment: videoStream
              }, group.threadID);
              videoSentCount++;
            } else {
              await api.sendMessage({ body: messageBody }, group.threadID);
            }
            
            approvedCount++;
          } catch (error) {
            console.error(`Error with ${group.name}:`, error.message);
          }
        }
        
        const result = `✅ Approved ALL ${approvedCount} groups!\n🎬 Videos sent: ${videoSentCount}`;
        return api.sendMessage(result, threadID, messageID);
        
      } catch (error) {
        return api.sendMessage("❌ Error: " + error.message, threadID, messageID);
      }
    }

    if (command === 'approve' || command === 'decline') {
      const numbers = args.slice(1).map(num => parseInt(num)).filter(num => !isNaN(num) && num > 0);
      
      if (numbers.length === 0) {
        return api.sendMessage(`❌ Please provide group numbers to ${command}.\nExample: ${global.GoatBot.config.prefix}pending ${command} 1 3 5`, threadID, messageID);
      }
      
      try {
        const pendingList = await api.getThreadList(100, null, ["PENDING"]);
        const pendingGroups = pendingList.filter(t => t.isGroup);
        
        if (pendingGroups.length === 0) {
          return api.sendMessage("📭 No pending groups!", threadID, messageID);
        }
        
        let count = 0;
        let videoCount = 0;
        
        for (const num of numbers) {
          if (num > 0 && num <= pendingGroups.length) {
            const group = pendingGroups[num - 1];
            
            try {
              if (command === 'approve') {
                await setBotNickname(api, group.threadID);
                const tiktokVideo = await getTikTokVideo();
                
                let videoStream = null;
                if (tiktokVideo && tiktokVideo.url) {
                  videoStream = await getStreamFromURL(tiktokVideo.url);
                }
                
                const messageBody = `╔════❰ 𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ❱════╗\n🎉 Thank you for inviting me!\n📌 Prefix: ${global.GoatBot.config.prefix}\n📜 Use ${global.GoatBot.config.prefix}help\n👑 Owner: Rasel Mahmud\n🔗 Facebook: https://www.facebook.com/mi.ujika.byanda\n╚══════════════════╝`;
                
                if (videoStream) {
                  await api.sendMessage({
                    body: messageBody + '\n\n🎬 **Enjoy this edit!**',
                    attachment: videoStream
                  }, group.threadID);
                  videoCount++;
                } else {
                  await api.sendMessage({ body: messageBody }, group.threadID);
                }
              } else {
                await api.removeUserFromGroup(api.getCurrentUserID(), group.threadID);
              }
              
              count++;
            } catch (error) {
              console.error(`Error with group ${num}:`, error.message);
            }
          }
        }
        
        const result = command === 'approve' 
          ? `✅ Approved ${count} group(s)! ${videoCount > 0 ? `(${videoCount} videos)` : ''}`
          : `❌ Declined ${count} group(s)!`;
        
        return api.sendMessage(result, threadID, messageID);
        
      } catch (error) {
        return api.sendMessage("❌ Error: " + error.message, threadID, messageID);
      }
    }

    try {
      console.log('🔄 Fetching pending groups...');
      
      const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      const pending = await api.getThreadList(100, null, ["PENDING"]) || [];
      
      const allThreads = [...spam, ...pending];
      const pendingGroups = allThreads.filter(group => group.isSubscribed && group.isGroup);
      
      if (pendingGroups.length === 0) {
        return api.sendMessage("📭 No pending group invitations!", threadID, messageID);
      }
      
      let listMessage = `╔════❰ ⏳𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢 ⏳❱════╗\n\n`;
      listMessage += `📋 Total Pending Groups: ${pendingGroups.length}\n\n`;
      
      pendingGroups.forEach((group, index) => {
        listMessage += `${index + 1}. ${group.name || 'Unknown Group'}\n`;
        listMessage += `   👥 Members: ${group.participantIDs?.length || 'N/A'}\n`;
        listMessage += `   🆔 ID: ${group.threadID}\n\n`;
      });
      
      listMessage += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      listMessage += `📌 **QUICK COMMANDS:**\n`;
      listMessage += `• ${global.GoatBot.config.prefix}pa approve 1 2 3\n`;
      listMessage += `• ${global.GoatBot.config.prefix}pa decline 4 5\n`;
      listMessage += `• ${global.GoatBot.config.prefix}pa all\n\n`;
      listMessage += `📝 **OR REPLY with numbers:**\n`;
      listMessage += `Example: 1 3 5\n`;
      listMessage += `╚═════════════════════╝`;
      
      const sentMsg = await api.sendMessage(listMessage, threadID);
      
      global.GoatBot.onReply.set(sentMsg.messageID, {
        commandName: "pending",
        messageID: sentMsg.messageID,
        author: senderID,
        pending: pendingGroups,
        type: 'approve'
      });
      
      console.log(`✅ Reply handler set for message ID: ${sentMsg.messageID}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      return api.sendMessage(`❌ Error fetching list: ${error.message}`, threadID, messageID);
    }
  }
};
