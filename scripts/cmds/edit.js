/**
 * @file edit.js
 * @description Smart Image Generator & Auto-Reply Merger for Goat-Bot
 * @credits Rasel Mahmud
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// এডিট এবং মার্জ এপিআই-এর জন্য ডাইনামিক সোর্স লিংক
const apiUrl = "https://raw.githubusercontent.com/Saim-x69x/sakura/main/ApiUrl.json";

const GEN_API = "https://images2gpt.com";
const MAX_POLLS = 45;
const POLL_INTERVAL = 2000;

let cachedAuth = { token: null, uses: 0, max: 9 };
// সেশন ট্র্যাকার গ্লোবাল অবজেক্ট
global.activeEditSessions = global.activeEditSessions || {};

// গিটহাব থেকে এডিট বা মার্জ করার সঠিক এপিআই এন্ডপয়েন্ট তুলে আনার ফাংশন
async function getApis() {
  try {
    const res = await axios.get(apiUrl);
    return {
      editApi: res.data.apiv3
    };
  } catch (err) {
    // ফ্যালব্যাক এন্ডপয়েন্ট (যদি কোনো কারণে গিটহাব রেসপন্স না করে)
    return { editApi: "https://free-api.saim-x.workers.dev/v3/edit" };
  }
}

async function urlToBase64(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data).toString("base64");
}

async function getGenToken(headers) {
  if (cachedAuth.token && cachedAuth.uses < cachedAuth.max) {
    cachedAuth.uses++;
    return cachedAuth.token;
  }
  const email = `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@1secmail.com`;
  const password = "Gen" + Math.random().toString(36).slice(2, 10) + "!1";
  const signup = await axios.post(`${GEN_API}/api/auth/signup`, { email, password }, { headers });
  if (!signup.data.ok) throw new Error(signup.data.error || "signup failed");
  cachedAuth = { token: signup.data.token, uses: 1, max: 9 };
  return cachedAuth.token;
}

// শুধু নতুন ছবি জেনারেট করার জন্য মূল ফাংশন
async function generateImage(prompt) {
  const headers = {
    "Content-Type": "application/json",
    Origin: GEN_API,
    Referer: `${GEN_API}/`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  let token = await getGenToken(headers);
  let authHeaders = { ...headers, Authorization: `Bearer ${token}` };

  const payload = { prompt: prompt, aspect_ratio: "1:1", resolution: "1K" };

  let submit;
  try {
    submit = await axios.post(`${GEN_API}/api/generate`, payload, { headers: authHeaders });
  } catch (e) {
    cachedAuth = { token: null, uses: 0, max: 9 };
    token = await getGenToken(headers);
    authHeaders = { ...headers, Authorization: `Bearer ${token}` };
    submit = await axios.post(`${GEN_API}/api/generate`, payload, { headers: authHeaders });
  }
  
  if (!submit.data.ok) throw new Error(submit.data.error || "submit failed");
  const taskId = submit.data.taskId;
  const startTime = Date.now();

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 1500 : POLL_INTERVAL));
    const { data } = await axios.get(
      `${GEN_API}/api/status?taskId=${encodeURIComponent(taskId)}`,
      { headers: authHeaders }
    );
    if (data.state === "success") {
      const time = Math.round((Date.now() - startTime) / 1000);
      return { url: data.resultUrls[0], time };
    }
    if (data.state === "fail") throw new Error(data.failMsg || "generation failed");
  }
  throw new Error("Timeout - generation took too long");
}

// এডিট এবং দুই বা ততোধিক ইমেজ মার্জ করার ফাংশন
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

async function downloadAndSaveImage(url, imgPath) {
  const response = await axios.get(url, {
    responseType: "stream",
    headers: { Referer: `${GEN_API}/` },
    timeout: 30000
  });
  const writer = fs.createWriteStream(imgPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
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
    version: "5.0",
    author: "Rasel Mahmud",
    countDown: 5,
    role: 0,
    shortDescription: "Edit, generate or auto-merge images smoothly",
    longDescription: "Image adjustment handler with clean custom formatting and personalized styling.",
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

        // FIXED: টাইটেল মিস্টেক সম্পূর্ণ মুক্ত
        const boxMessage = createBox("𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Images adjusted & merged successfully": "" }, time);

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

        // FIXED: টাইটেল মিস্টেক সম্পূর্ণ মুক্ত
        const boxMessage = createBox("𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Target images merged": "" }, time);
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
    const imgPath = path.join(__dirname, "cache", `${Date.now()}_output.jpg`);

    try {
      if (isEditMode) {
        const { data: imageBuffer, time } = await editOrMergeImage([initialImgUrl], `Edit the given image based on this description:\n${prompt}`);
        await fs.ensureDir(path.dirname(imgPath));
        await fs.writeFile(imgPath, Buffer.from(imageBuffer));
        await api.unsendMessage(processingMsg.messageID);
        
        // FIXED: টাইটেল মিস্টেক সম্পূর্ণ মুক্ত
        const boxMessage = createBox("𝐇𝐞𝐈𝐢•𝗟𝗨𝗠𝗢", { "✅ Image edited successfully": "", "Prompt": prompt }, time);
        await api.sendMessage({
          body: boxMessage,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) {
            global.activeEditSessions[info.messageID] = initialImgUrl; 
          }
        }, event.messageID);

      } else {
        const result = await generateImage(prompt);
        await fs.ensureDir(path.dirname(imgPath));
        await downloadAndSaveImage(result.url, imgPath);
        await api.unsendMessage(processingMsg.messageID);
        
        // FIXED: টাইটেল মিস্টেক সম্পূর্ণ মুক্ত
        const boxMessage = createBox("𝐇\u0065\u0049\u0069•𝗟𝗨𝗠𝗢", { "✅ New image generated": "", "Prompt": prompt }, result.time);
        await api.sendMessage({
          body: boxMessage,
          attachment: fs.createReadStream(imgPath)
        }, event.threadID, (err, info) => {
          if (!err && info && info.messageID) {
            global.activeEditSessions[info.messageID] = result.url;
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
