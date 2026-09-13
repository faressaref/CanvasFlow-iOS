import fs from "node:fs";

const file = "public/index.html";
let s = fs.readFileSync(file, "utf8");

const replacements = [
  ["split(/s+/)", "split(/\\s+/)"],
  ["replace(/r/g, '')", "replace(/\\r/g, '')"],
  ["const paragraphs = raw.split('');", "const paragraphs = raw.split(/\\n{2,}/);"],
  ["^#{1,3}s+", "^#{1,3}\\s+"],
  ["^[-*]s+", "^[-*]\\s+"],
  ["gemini-2.5-flash", "gemini-3.6-flash"],
  ["localStorage.getItem(\"canvasflow-ai-endpoint\") || \"\"", "localStorage.getItem(\"canvasflow-ai-endpoint\") || \"/api/study\""]
];

for (const [from, to] of replacements) s = s.split(from).join(to);

const marker = ".ai-result {";
if (s.includes(marker) && !s.includes(".ai-result{direction:rtl")) {
  const start = s.indexOf(marker);
  const end = s.indexOf("}", start);
  if (end !== -1) {
    s = s.slice(0, end) + "; direction:rtl; text-align:right; word-break:normal; overflow-wrap:break-word; unicode-bidi:plaintext" + s.slice(end);
  }
}

// Students never need to paste a Gemini key. The backend keeps the secret server-side.
if (!s.includes("#aiKey{display:none")) {
  s = s.replace(".ai-result.empty {", "#aiKey{display:none !important;}\n    .ai-result.empty {");
}

fs.writeFileSync(file, s, "utf8");
console.log("CanvasFlow: AI endpoint, model and study-note rendering normalized.");
