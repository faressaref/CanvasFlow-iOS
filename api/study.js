const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash"];
const MAX_IMAGES = Number(process.env.MAX_IMAGES || 12);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 3);

const systemInstruction = `You are CanvasFlow Study Tutor, a personal tutor. The user is studying from photographed textbook pages. Read all supplied pages carefully, preserve their order and meaning, never invent unsupported facts, explain in clear Egyptian Arabic when possible while preserving important English/scientific terms, and make study material structured, exam-oriented, and practical. If an image is unreadable, say which page/area is unclear. Do not expose hidden reasoning.`;

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data URL.");
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Each image must be ${MAX_IMAGE_MB}MB or smaller.`);
  return { mimeType: match[1].toLowerCase(), data: match[2] };
}

function promptForMode(mode) {
  const prompts = {
    summary: "Create a complete study summary with clear headings, subheadings, bullet points, definitions, examples, and key relationships.",
    explain: "Teach the lesson like a private tutor. Start with the big idea, then explain each section simply with examples and common confusions.",
    important: "Extract exam-critical material under MUST UNDERSTAND, MUST MEMORIZE, COMMON MISTAKES, IMPORTANT TERMS, and HIGH-YIELD FACTS.",
    quiz: "Create a realistic teacher-style exam with multiple choice, true/false, and short-answer questions, followed by an answer key.",
    flashcards: "Create active-recall flashcards with focused questions and concise answers, prioritizing high-value facts and concepts.",
    recall: "Start active recall by returning ONE question at a time, starting easy and increasing difficulty. Do not reveal the answer until the student answers.",
    mindmap: "Turn the lesson into a hierarchical text mind map: central topic -> main branches -> sub-branches -> key facts.",
    studyplan: "Create a practical study plan for this exact lesson with study blocks, active recall, spaced review, and a final self-test."
  };
  return prompts[mode] || prompts.summary;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function callGemini(model, requestBody, apiKey) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let lastResponse;

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody)
    });
    lastResponse = response;
    const data = await response.json().catch(() => ({}));

    if (response.ok) return { data, model };

    // Retry only transient capacity/rate/server errors, using exponential backoff + jitter.
    if (![408, 429, 500, 502, 503, 504].includes(response.status)) {
      const err = new Error(data?.error?.message || `Gemini API request failed (${response.status}).`);
      err.status = response.status;
      throw err;
    }

    if (attempt < 3) await sleep(1200 * (2 ** attempt) + Math.floor(Math.random() * 700));
  }

  const data = await lastResponse.json().catch(() => ({}));
  const err = new Error(data?.error?.message || `Gemini API request failed (${lastResponse.status}).`);
  err.status = lastResponse.status;
  throw err;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY), model: PRIMARY_MODEL });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI is not configured. Add GEMINI_API_KEY to Vercel Environment Variables." });

    const { mode = "summary", lesson = "", images = [] } = req.body || {};
    if (!lesson && (!Array.isArray(images) || images.length === 0)) return res.status(400).json({ error: "Send at least one lesson image or text." });
    if (!Array.isArray(images)) return res.status(400).json({ error: "images must be an array." });
    if (images.length > MAX_IMAGES) return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images per request.` });

    const parts = [{ text: promptForMode(mode) + "\n\nAdditional student notes:\n" + (lesson || "(none)") + "\n\nFirst inspect every supplied page, then perform the task." }];
    for (const dataUrl of images) {
      const img = parseDataUrl(dataUrl);
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }

    const requestBody = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }]
    };

    let result;
    let lastError;
    for (const model of [PRIMARY_MODEL, ...FALLBACK_MODELS]) {
      try {
        result = await callGemini(model, requestBody, apiKey);
        break;
      } catch (error) {
        lastError = error;
        if (![408, 429, 500, 502, 503, 504].includes(error?.status)) throw error;
      }
    }

    if (!result) throw lastError || new Error("All Gemini models are temporarily unavailable.");

    const outputText = result.data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("\n").trim() || "The AI returned no text.";
    return res.status(200).json({ ok: true, mode, model: result.model, output_text: outputText });
  } catch (error) {
    console.error(error);
    const status = Number.isInteger(error?.status) ? error.status : (/quota|rate|resource exhausted/i.test(error?.message || "") ? 429 : 500);
    return res.status(status).json({ error: error?.message || "AI request failed." });
  }
}
