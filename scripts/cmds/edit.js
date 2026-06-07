/**
 * @file edit.js
 * @description Smart Image Generator & Auto-Reply Merger for Goat-Bot (Fast NeoKEX API Integrated)
 * @credits Rasel Mahmud
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// এডিট এবং মার্জ এপিআই-এর জন্য ডাইনামিক সোর্স লিংক
const apiUrl = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";

// CHANGED: আপনার দেওয়া নতুন এবং ফাস্ট জেনারেটর এপিআই এন্ডপয়েন্ট
const GEN_API = "https://neokex-img-api.vercel.app/generate";

// সেশন ট্র্যাকার গ্লোবাল অবজেক্ট
global.activeEditSessions = global.activeEditSessions || {};

// গিটহাব থেকে এডিট বা মার্জ করার এপিআই এন্ডপয়েন্ট তুলে আনার ফাংশন
async function getApis() {
  try {
    const res = await axios.get(apiUrl);
    return { editApi: res.data.apiv3 };
  } catch (err) {
    return { editApi: "https://free-api.saim-x.workers.dev/v3/edit" };
  }
}

async function urlToBase64(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data).toString("base64");
}

// CHANGED: নতুন এপিআই অনুযায়ী সরাসরি স্ট্রিম হিসেবে ইমেজ জেনারেট করার ফাংশন
async function generateImageStream(prompt) {
  const fullApiUrl = `${GEN_API}?prompt=${encodeURIComponent(prompt.trim())}&model=gpt1.5`;
  const response = await axios.get(fullApiUrl, {
    responseType: 'stream',
    timeout: 60000 
  });
  if (response.status !== 200) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.data;
}

// এডিট এবং দুই বা ততোধিক ইমেজ মার্জ করার ফাংশন (আগের মেকানিজম বহাল রাখা হয়েছে)
async function editOrMergeImage(imagesArray, prompt) {
  const { editApi } = await getApis();
  const base64Images = await Promise.all(imagesArray.map(url => urlToBase64(url)));

  const payload = {
    prompt: prompt,
    images: base64Images,
    format: "jpg"
  };
  
  const startTime = Date.now();
  const res = await axios.post(editApi, payload, {
    responseType: "arraybuffer",
    timeout: 180000
  });
  const time = Math.round((Date.now() - startTime) / 1000);
  return { data: res.data, time };
}

function createBox(title, content, time = null) {
  const topBorder = "╔═════❰ " + title + " ❱═════╗";
  const bottomBorder = "╚═══════════════════╝";
  let body = "";
  if (typeof content === 'object') {
    for (const [key, value] of Object.entries(content)) {
      body += value === "" ? `${key}\n` : `${key}: ${value}\n`;
    }
  } else {
    body = content;
  }
  if (time !== null) body += `⏱️ Time: ${time}s`;
  return `${topBorder}\n${body.trim()}\n${bottomBorder}`;
}

function getAttachmentUrl(messageReply) {
  if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) return null;
  const att = messageReply.attachments[0];
  return att.type === "photo" ? att.url : null;
}

module.exports = {
  config: {
    name: "edit",
    version: "5.5",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    shortDescription: "Edit, generate or auto-merge images smoothly",
    longDescription: "Image adjustment handler with fast integrated generator API and custom styling.",
    category: "AI-IMAGE-EDIT",
    guide: "{p}edit <prompt>\n\n• Reply to bot result with another image to auto-merge without prefix!"
  },

  // ১. অন-চ্যাট ইভেন্ট লিসেনার (কোনো কমান্ড ছাড়া ফটো রিপ্লাই অটো-মার্জিং)
  onChat: async function ({ api, event, message }) {
    const repliedMessage = event.messageReply;
    if (!repliedMessage || !event.attachments || event.attachments.length === 0) return;

    const currentAttachment = event.attachments[0];
    if (currentAttachment.type === "photo" && global.activeEditSessions[repliedMessage.messageID]) {
      const previousImageUrl = global.activeEditSessions[repliedMessage.messageID];
      const newImageUrl = currentAttachment.url;
      
      const processingMsg = await message.reply("⏳ Two images detected! Seamlessly merging and adjusting them together, please wait...");
      const imgPath = path.join(__dirname, "cache", `${Date.now()}_auto_merged.jpg`);

      try {
        const defaultPrompt = "Seamlessly combine, blend, and merge these two images into a single cohesive adjusted character scene matching lighting and style perfectly.";
        const { data: imageBuffer, time } = await editOrMergeImage([previousImageUrl, newImageUrl], defaultPrompt);
        
        await fs.ensureDir(path.dirname(imgPath));
        await fs.writeFile(imgPath, Buffer.from(imageBuffer));
        await api.unsendMessage(processingMsg.messageID);

        const boxMessage = createBox("𝐇e𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Images adjusted & merged successfully": "" }, time);

        await api.sendMessage({
          body: boxMessage,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) {
            global.activeEditSessions[info.messageID] = newImageUrl;
          }
        }, event.messageID);

      } catch (error) {
        console.error("Auto Merge Failure:", error.message);
        await api.unsendMessage(processingMsg.messageID);
        message.reply(`❌ Adjust/Merge Failed: ${error.message.slice(0, 100)}`);
      } finally {
        if (fs.existsSync(imgPath)) await fs.remove(imgPath);
      }
    }
  },

  // ২. মেইন স্টার্ট ফাংশন (কমান্ড ট্রিগার)
  onStart: async function ({ api, event, args, message }) {
    const repliedMessage = event.messageReply;
    const initialImgUrl = getAttachmentUrl(repliedMessage);
    let prompt = args.join(" ").trim();

    if (initialImgUrl && repliedMessage && global.activeEditSessions[repliedMessage.messageID]) {
      const previousImageUrl = global.activeEditSessions[repliedMessage.messageID];
      const processingMsg = await message.reply("⏳ Merging current and replied image assets...");
      const imgPath = path.join(__dirname, "cache", `${Date.now()}_start_merged.jpg`);
      try {
        if (!prompt) prompt = "Merge and adjust these two images together.";
        const { data: imageBuffer, time } = await editOrMergeImage([previousImageUrl, initialImgUrl], prompt);
        await fs.ensureDir(path.dirname(imgPath));
        await fs.writeFile(imgPath, Buffer.from(imageBuffer));
        await api.unsendMessage(processingMsg.messageID);

        const boxMessage = createBox("𝐇e𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Target images merged": "" }, time);
        await api.sendMessage({ body: boxMessage, attachment: fs.createReadStream(imgPath) }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) global.activeEditSessions[info.messageID] = initialImgUrl;
        }, event.messageID);
      } catch (error) {
        await api.unsendMessage(processingMsg.messageID);
        message.reply(`❌ Failed: ${error.message.slice(0, 100)}`);
      } finally {
        if (fs.existsSync(imgPath)) await fs.remove(imgPath);
      }
      return;
    }

    if (!prompt) {
      return message.reply("❌ Please provide a prompt.\n\n💡 Reply to an image: Edit it\n💬 Just type prompt: Generate new image");
    }

    const isEditMode = initialImgUrl !== null;
    const processingMsg = await message.reply(isEditMode ? "Distributed Editing..." : "🎨 Generating image...");
    const imgPath = path.join(__dirname, "cache", `output_${Date.now()}.png`);

    try {
      if (isEditMode) {
        const { data: imageBuffer, time } = await editOrMergeImage([initialImgUrl], `Edit the given image based on this description:\n${prompt}`);
        await fs.ensureDir(path.dirname(imgPath));
        await fs.writeFile(imgPath, Buffer.from(imageBuffer));
        await api.unsendMessage(processingMsg.messageID);
        
        const boxMessage = createBox("𝐇e𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Image edited successfully": "", "Prompt": prompt }, time);
        await api.sendMessage({
          body: boxMessage,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) {
            global.activeEditSessions[info.messageID] = initialImgUrl; 
          }
        }, event.messageID);

      } else {
        // CHANGED: নতুন এপিআই দিয়ে ফাস্ট জেনারেশন মেকানিজম
        const startTime = Date.now();
        const imageStream = await generateImageStream(prompt);
        
        await fs.ensureDir(path.dirname(imgPath));
        const writer = fs.createWriteStream(imgPath);
        imageStream.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        const time = Math.round((Date.now() - startTime) / 1000);
        await api.unsendMessage(processingMsg.messageID);
        
        const boxMessage = createBox("𝐇e𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ New image generated": "", "Prompt": prompt }, time);
        await api.sendMessage({
          body: boxMessage,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) {
            // ফেসবুক ইমেজ ইউআরএল বা সেশন ট্র্যাকিং সেভ করার জন্য
            global.activeEditSessions[info.messageID] = "active_session"; 
          }
        }, event.messageID);
      }
    } catch (error) {
      console.error("Error:", error.message);
      await api.unsendMessage(processingMsg.messageID);
      message.reply(`❌ Failed: ${error.message.slice(0, 100)}`);
    } finally {
      if (fs.existsSync(imgPath)) {
        await fs.remove(imgPath);
      }
    }
  }
};
