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
  ["localStorage.getItem(\"canvasflow-ai-endpoint\") || \"\"", "localStorage.getItem(\"canvasflow-ai-endpoint\") || \"/api/study\""],
  ["localStorage.getItem(\"canvasflow-ai-endpoint\") || \"/api/study\"", "\"/api/study\""],
  ["const endpoint = aiEndpoint.value.trim() || \"/api/study\";", "const endpoint = \"/api/study\";"],
  ["method:\"POST\",\n      headers:{\"Content-Type\":\"application/json\"},", "method:\"POST\",\n      cache:\"no-store\",\n      headers:{\"Content-Type\":\"application/json\",\"Cache-Control\":\"no-cache\"},"]
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

if (!s.includes("#aiKey{display:none")) {
  s = s.replace(".ai-result.empty {", "#aiKey{display:none !important;}\n    .ai-result.empty {");
}

// TEMPORARY: unmistakable marker to test whether the installed IPA loads the latest Vercel web build.
if (!s.includes("canvasflow-version-test-marker")) {
  s = s.replace("</body>", `<div id="canvasflow-version-test-marker" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#ff2d55;color:#fff;padding:10px 14px;border-radius:12px;font:700 14px Arial,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);">WEB TEST 2026</div></body>`);
}

fs.writeFileSync(file, s, "utf8");
console.log("CanvasFlow: base AI note fixes applied.");
