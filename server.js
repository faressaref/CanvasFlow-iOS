import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_MODEL = "gemini-3.8-flash";
const configuredModel = String(process.env.GEMINI_MODEL || "").trim();
const MODEL = (/^(AQ\.|AIza)/i.test(configuredModel) || !/^gemini-[a-z0-9.-]+$/i.test(configuredModel))
  ? DEFAULT_MODEL
  : configuredModel;
const MAX_IMAGES = Number(process.env.MAX_IMAGES || 12);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 8);

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is missing.");
  console.warn("   Create a file named .env next to server.js and add:");
  console.warn("   GEMINI_API_KEY=YOUR_GEMINI_API_KEY");
}

const aiConfigured = Boolean(process.env.GEMINI_API_KEY);

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true
}));
app.use(express.json({ limit: "100mb" }));

const systemInstruction = `
You are CanvasFlow Study Tutor, a personal tutor.
The user is studying from photographed textbook pages.

Rules:
1. Read ALL supplied textbook images carefully before answering.
2. Preserve the order and meaning of the pages.
3. Never invent facts that are not supported by the supplied material.
4. Explain in clear Egyptian Arabic when possible, while preserving important English/scientific terms.
5. For study materials, be structured, exam-oriented, and practical.
6. If an image is blurry or unreadable, explicitly say which page/area is unclear.
7. Do not expose hidden reasoning. Give concise conclusions, explanations, and useful study material only.
`;

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data URL.");
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  const bytes = Buffer.byteLength(base64, "base64");
  if (bytes > MAX_IMAGE_MB * 1024 * 1024) {
    throw new Error(`Each image must be ${MAX_IMAGE_MB}MB or smaller.`);
  }
  return { mimeType, data: base64 };
}

function promptForMode(mode) {
  const prompts = {
    summary: "Create a complete study summary with clear headings, subheadings, bullet points, definitions, examples, and key relationships. Do not omit important ideas.",
    explain: "Teach the lesson like a private tutor. Start with the big idea, then explain each section simply, with examples and warnings about common confusion.",
    important: "Extract exam-critical material. Divide it into: MUST UNDERSTAND, MUST MEMORIZE, COMMON MISTAKES, IMPORTANT TERMS, and HIGH-YIELD FACTS.",
    quiz: "Create a realistic teacher-style exam from the supplied lesson. Include multiple choice, true/false, and short-answer questions. Put an answer key with brief explanations at the end.",
    flashcards: "Create active-recall flashcards. Each card should have a focused question and a concise answer. Prioritize high-value facts and concepts.",
    recall: "Start an active-recall session. Ask ONE question at a time, starting easy and increasing difficulty. Do not reveal answers until the student answers. Since this request is one API call, return the first question plus a short instruction to answer it.",
    mindmap: "Turn the lesson into a hierarchical text mind map: central topic -> main branches -> sub-branches -> key facts. Keep it easy to convert into whiteboard nodes.",
    studyplan: "Create a practical study plan for this exact lesson: study blocks, order of topics, active recall prompts, spaced review, and a final self-test."
  };
  return prompts[mode] || prompts.summary;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: MODEL
  });
});

app.post("/api/study", async (req, res) => {
  try {
    if (!aiConfigured) {
      return res.status(503).json({
        error: "AI is not configured. Add GEMINI_API_KEY to .env."
      });
    }

    const { mode = "summary", lesson = "", images = [] } = req.body || {};

    if (!lesson && (!Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ error: "Send at least one lesson image or text." });
    }

    if (images.length > MAX_IMAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images per request.` });
    }

    const contents = [{
      text:
        promptForMode(mode) +
        "\n\nAdditional student notes:\n" + (lesson || "(none)") +
        "\n\nFirst inspect every supplied page, then perform the task."
    }];

    for (const dataUrl of images) {
      const img = parseDataUrl(dataUrl);
      contents.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      });
    }

    const requestBody = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: contents }],
      generationConfig: { temperature: 0.35 }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    let googleResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (googleResponse.status === 401) {
      googleResponse = await fetch(`${apiUrl}?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
    }

    const googleData = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok) {
      const message = googleData?.error?.message || `Gemini API request failed (${googleResponse.status}).`;
      const err = new Error(message);
      err.status = googleResponse.status;
      throw err;
    }

    const text = googleData?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("\n")
      .trim() || "The AI returned no text.";
    res.json({
      ok: true,
      mode,
      model: MODEL,
      output_text: text
    });
  } catch (error) {
    console.error(error);
    const status = Number.isInteger(error?.status) ? error.status : (/quota|rate|resource exhausted/i.test(error?.message || "") ? 429 : 500);
    res.status(status).json({
      error: error?.message || "AI request failed."
    });
  }
});

// Serve the single-file frontend.
app.use(express.static(path.join(__dirname, "public")));

// Express 5: use a final middleware for SPA fallback instead of app.get("*").
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`CanvasFlow running at http://localhost:${PORT}`);
});
