import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/supervisor.graph.js";
import { addMessage } from "../utils/memory.js";
import axios from "axios";
import { exec } from "child_process";

const checkAndOpenApp = (prompt) => {
  if (!prompt) return null;
  const text = prompt.toLowerCase().trim();
  let appCommand = null;
  let appNameEn = "";
  let appNameHi = "";

  if (text.includes("notepad") && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start notepad";
    appNameEn = "Notepad";
    appNameHi = "नोटपैड";
  } else if ((text.includes("calculator") || text.includes("calc")) && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start calc";
    appNameEn = "Calculator";
    appNameHi = "कैलकुलेटर";
  } else if (text.includes("paint") && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start mspaint";
    appNameEn = "Paint";
    appNameHi = "पेंट";
  } else if (text.includes("chrome") && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start chrome";
    appNameEn = "Google Chrome";
    appNameHi = "गूगल क्रोम";
  } else if ((text.includes("cmd") || text.includes("command prompt")) && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start cmd";
    appNameEn = "Command Prompt";
    appNameHi = "कमांड प्रॉम्प्ट";
  } else if ((text.includes("explorer") || text.includes("my computer") || text.includes("this pc")) && (text.includes("open") || text.includes("kholo") || text.includes("khol") || text.includes("start") || text.includes("chalao"))) {
    appCommand = "start explorer";
    appNameEn = "File Explorer";
    appNameHi = "फ़ाइल एक्सप्लोरर";
  } else if (text.includes("lock") && (text.includes("phone") || text.includes("pc") || text.includes("laptop") || text.includes("computer") || text.includes("system") || text.includes("device") || text.includes("karo"))) {
    appCommand = "rundll32.exe user32.dll,LockWorkStation";
    appNameEn = "Device Lock";
    appNameHi = "डिवाइस लॉक";
  } else if ((text.includes("apps") || text.includes("app")) && (text.includes("all") || text.includes("sare") || text.includes("saare") || text.includes("list") || text.includes("kholo") || text.includes("open") || text.includes("show") || text.includes("dikhao"))) {
    appCommand = "explorer shell:AppsFolder";
    appNameEn = "All Apps List";
    appNameHi = "सभी ऐप्स की सूची";
  }

  if (appCommand) {
    exec(appCommand, (error) => {
      if (error) {
        console.error(`Failed to execute ${appNameEn}:`, error);
      }
    });
    
    const isHindi = /[\u0900-\u097F]/.test(prompt);
    if (isHindi) {
      if (appNameEn === "Device Lock") {
        return `मैंने आपके डिवाइस को लॉक कर दिया है।`;
      } else if (appNameEn === "All Apps List") {
        return `मैंने आपके सभी ऐप्स की सूची खोल दी है।`;
      }
      return `मैंने आपके लिए ${appNameHi} खोल दिया है।`;
    } else {
      if (appNameEn === "Device Lock") {
        return `I have locked your device.`;
      } else if (appNameEn === "All Apps List") {
        return `I have opened the list of all installed apps.`;
      }
      return `I have opened ${appNameEn} for you.`;
    }
  }
  return null;
};

export const chat = async (req, res, next) => {
  try {
    const { prompt, conversationId, agent } = req.body;

    console.log(req.body);
    console.log(req.file);

    const appResponse = checkAndOpenApp(prompt);
    if (appResponse) {
      await addMessage(conversationId, "user", prompt);
      await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "user",
        content: prompt
      });
      
      await addMessage(conversationId, "assistant", appResponse);
      await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
        conversationId,
        role: "assistant",
        content: appResponse,
        images: [],
        artifacts: []
      });
      
      return res.json({
        success: true,
        answer: appResponse,
        images: [],
        artifacts: []
      });
    }

    await addMessage(conversationId, "user", prompt);
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "user",
      content: prompt
    });

    const result = await graph.invoke({
      prompt,
      conversationId,
      userId: req.headers["x-user-id"],
      agent,
      file: req.file
    });

    console.log("after res", result);

    await addMessage(conversationId, "assistant", result.response);
    await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
      conversationId,
      role: "assistant",
      content: result.response,
      images: result.images,
      artifacts: result.artifacts || []
    });

    return res.json({
      success: true,
      answer: result.response,
      images: result.images,
      artifacts: result.artifacts || []
    });

  } catch (error) {
    next(error);
  }
};