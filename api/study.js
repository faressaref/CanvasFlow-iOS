const DEFAULT_MODEL = "gemini-3.7-flash";
const configuredModel = String(process.env.GEMINI_MODEL || "").trim();
const MODEL = (/^(AQ\.|AIza)/i.test(configuredModel) || !/^gemini-[a-z0-9.-]+$/i.test(configuredModel)) ? DEFAULT_MODEL : configuredModel;
const MAX_IMAGES = Number(process.env.MAX_IMAGES || 12);
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 3);

const systemInstruction = `You are CanvasFlow Study Tutor, a personal tutor. Read all supplied textbook images carefully, preserve their order and meaning, never invent unsupported facts, explain in clear Egyptian Arabic when possible while preserving important English/scientific terms, and make study material structured, exam-oriented, practical, and easy to read. Output plain readable text only. No LaTeX, no dollar-sign formatting, no raw backslash commands, and no Markdown syntax.`;

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid image data URL.");
  const bytes = Buffer.byteLength(match[2], "base64");
  if (bytes > MAX_IMAGE_MB * 1024 * 1024) throw new Error(`Each image must be ${MAX_IMAGE_MB}MB or smaller.`);
  return { mimeType: match[1].toLowerCase(), data: match[2] };
}

function promptForMode(mode) {
  const prompts = {
    summary: "Create a complete study summary with clear headings, subheadings, bullets, definitions, examples, and key relationships.",
    explain: "Teach the lesson like a private tutor. Start with the big idea, then explain each section simply with examples and common confusions.",
    important: "Extract exam-critical material under MUST UNDERSTAND, MUST MEMORIZE, COMMON MISTAKES, IMPORTANT TERMS, and HIGH-YIELD FACTS.",
    quiz: "Create a realistic teacher-style exam with multiple choice, true/false, and short-answer questions, followed by an answer key.",
    flashcards: "Create active-recall flashcards with focused questions and concise answers.",
    recall: "Ask ONE active-recall question at a time. Return the first question only and wait for the student's answer.",
    mindmap: "Turn the lesson into a hierarchical text mind map using normal arrows like → and bullets.",
    studyplan: "Create a practical study plan for this exact lesson with study blocks, active recall, spaced review, and a final self-test."
  };
  return prompts[mode] || prompts.summary;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method === "GET") return res.status(200).json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI is not configured. Add GEMINI_API_KEY to Vercel Environment Variables." });

    const { mode = "summary", lesson = "", images = [] } = req.body || {};
    if (!lesson && (!Array.isArray(images) || images.length === 0)) return res.status(400).json({ error: "Send at least one lesson image or text." });
    if (!Array.isArray(images)) return res.status(400).json({ error: "images must be an array." });
    if (images.length > MAX_IMAGES) return res.status(400).json({ error: `Maximum ${MAX_IMAGES} images per request.` });

    const parts = [{ text: promptForMode(mode) + "\n\nAdditional student notes:\n" + (lesson || "(none)") + "\n\nFirst inspect every supplied page, then perform the task. Return only clean readable study material." }];
    for (const dataUrl of images) {
      const img = parseDataUrl(dataUrl);
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }

    const requestBody = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.35 }
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const googleResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody)
    });
    const googleData = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok) {
      const err = new Error(googleData?.error?.message || `Gemini API request failed (${googleResponse.status}).`);
      err.status = googleResponse.status;
      throw err;
    }

    const outputText = googleData?.candidates?.[0]?.content?.parts?.map(part => part?.text || "").join("\n").trim();
    if (!outputText) throw new Error("The AI returned no text.");
    return res.status(200).json({ ok: true, mode, model: MODEL, output_text: outputText });
  } catch (error) {
    console.error("CanvasFlow Gemini error:", error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({ error: error?.message || "AI request failed." });
  }
}
