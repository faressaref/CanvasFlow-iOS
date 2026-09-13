const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite"
];
const MAX_IMAGES = Number(process.env.MAX_IMAGES || 12);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 3);

const systemInstruction = `You are CanvasFlow Study Tutor, a personal tutor. The user is studying from photographed textbook pages. Read all supplied pages carefully, preserve their order and meaning, never invent unsupported facts, explain in clear Egyptian Arabic when possible while preserving important English/scientific terms, and make study material structured, exam-oriented, practical, visually scannable, and comfortable to read.

CRITICAL OUTPUT FORMATTING RULES:
- Output plain readable text only. Do NOT use LaTeX, TeX, math delimiters, dollar signs for formatting, backslashes for formatting, or Markdown code fences.
- Never output raw commands such as \\rightarrow, \\rightarrow, \\text{}, \\frac{}, \\$ or similar markup. Replace arrows with the normal Unicode arrow → and write equations in ordinary readable text when needed.
- Do not put asterisks around words. Do not output Markdown heading markers like # or ##.
- Use normal headings, short paragraphs, bullets using • or numbered lists.
- Keep Arabic sentences as normal continuous words; never put one character or one word on a separate line unless the source itself requires it.
- For summaries, organize the material like a clean study sheet: title, sections, key points, examples, and exam tips. Use simple visual markers such as 📘, 💡, 🎯, ⚠️, and ✅ sparingly.
- Preserve important English/scientific terminology exactly where useful, but keep surrounding Arabic natural.
- If an image is unreadable, say which page/area is unclear. Do not invent missing content.
- Do not expose hidden reasoning.`;

function parseDataUrl(dataUrl) {
  const match = /^data:(image\\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data URL.");
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Each image must be ${MAX_IMAGE_MB}MB or smaller.`);
  return { mimeType: match[1].toLowerCase(), data: match[2] };
}

function promptForMode(mode) {
  const prompts = {
    summary: "Create a complete study summary with a clear title, section headings, short paragraphs, bullets, definitions, examples, and key relationships. Make it look like a polished study handout.",
    explain: "Teach the lesson like a private tutor. Start with the big idea, then explain each section simply with examples and common confusions.",
    important: "Extract exam-critical material under clear headings: MUST UNDERSTAND, MUST MEMORIZE, COMMON MISTAKES, IMPORTANT TERMS, and HIGH-YIELD FACTS. Write these as normal readable headings, not Markdown.",
    quiz: "Create a realistic teacher-style exam with multiple choice, true/false, and short-answer questions, followed by a clear answer key.",
    flashcards: "Create active-recall flashcards with focused questions and concise answers, prioritizing high-value facts and concepts.",
    recall: "Start active recall by returning ONE question at a time, starting easy and increasing difficulty. Do not reveal the answer until the student answers.",
    mindmap: "Turn the lesson into a clean hierarchical text mind map using normal arrows like → and bullets. Do not use Markdown or LaTeX markup.",
    studyplan: "Create a practical study plan for this exact lesson with study blocks, active recall, spaced review, and a final self-test."
  };
  return prompts[mode] || prompts.summary;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504]);

async function callGemini(model, input, apiKey) {
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta/interactions";
  let lastStatus = 500;
  let lastMessage = "Gemini request failed.";

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model,
        input,
        system_instruction: systemInstruction,
        generation_config: {
          thinking_level: "medium",
          thinking_summaries: "none"
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    lastStatus = response.status;
    lastMessage = data?.error?.message || `Gemini API request failed (${response.status}).`;

    if (response.ok) return { data, model };

    if (!TRANSIENT.has(response.status)) {
      const err = new Error(lastMessage);
      err.status = response.status;
      throw err;
    }

    if (attempt < 2) {
      const delay = 900 * (2 ** attempt) + Math.floor(Math.random() * 500);
      await sleep(delay);
    }
  }

  const err = new Error(lastMessage);
  err.status = lastStatus;
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
    return res.status(200).json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY), api: "interactions", model: PRIMARY_MODEL, fallbacks: FALLBACK_MODELS });
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

    const input = [{ type: "text", text: promptForMode(mode) + "\n\nAdditional student notes:\n" + (lesson || "(none)") + "\n\nFirst inspect every supplied page, then perform the task. Return only clean readable study material. No LaTeX, no dollar-sign formatting, no raw backslash commands, no Markdown syntax." }];

    for (const dataUrl of images) {
      const img = parseDataUrl(dataUrl);
      input.push({ type: "image", data: img.data, mime_type: img.mimeType, resolution: "high" });
    }

    let result = null;
    let lastError = null;
    for (const model of [PRIMARY_MODEL, ...FALLBACK_MODELS]) {
      try {
        result = await callGemini(model, input, apiKey);
        break;
      } catch (error) {
        lastError = error;
        if (!TRANSIENT.has(error?.status)) throw error;
      }
    }

    if (!result) {
      const err = lastError || new Error("All Gemini models are temporarily unavailable.");
      err.status = 503;
      throw err;
    }

    const outputText = result.data?.output_text ||
      result.data?.steps?.flatMap(step => step?.content || [])?.filter(part => part?.type === "text")?.map(part => part.text || "")?.join("\n")?.trim() ||
      "The AI returned no text.";

    return res.status(200).json({ ok: true, mode, model: result.model, output_text: outputText });
  } catch (error) {
    console.error(error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({ error: error?.message || "AI request failed." });
  }
}
