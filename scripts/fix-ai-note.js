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

// Clean AI text before it reaches the study-sheet renderer.
const cleanFn = `function cleanAIText(text) {
  return String(text || "")
    .replace(/```(?:text|markdown)?/gi, "")
    .replace(/\\*\\*/g, "")
    .replace(/\\$+/g, "")
    .replace(/\\\\(rightarrow|leftarrow|Rightarrow|Leftarrow)/g, "→")
    .replace(/\\\\(text|frac|mathbf|mathrm)\\{([^}]*)\\}/g, "$2")
    .replace(/^#{1,3}\\s*/gm, "")
    .replace(/^[-*]\\s+/gm, "• ")
    .replace(/\\r/g, "")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}`;
s = s.replace(/function cleanAIText\\(text\\) \\{[\\s\\S]*?\\n\\}/, cleanFn);

// Replace the old plain-text board renderer with a pastel study-sheet renderer.
const studyFn = `function addStudyTextToBoard(text) {
  const raw = cleanAIText(text);
  const blocks = raw.split(/\\n{2,}/).map(x => x.trim()).filter(Boolean);
  const W = 900;
  const pad = 34;
  const gap = 16;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const colors = [
    {bg:'#eef7ff', edge:'#cfe5ff', accent:'#3979d8', title:'#174a91'},
    {bg:'#eefaf4', edge:'#cceedd', accent:'#2f9a67', title:'#176b49'},
    {bg:'#fff5e9', edge:'#ffe0b2', accent:'#e49a20', title:'#87510a'},
    {bg:'#f5efff', edge:'#e1d2ff', accent:'#8254d6', title:'#5b31a8'},
    {bg:'#fff0f5', edge:'#ffd1df', accent:'#d34d83', title:'#a82f61'},
    {bg:'#eef5ff', edge:'#cfe0ff', accent:'#4a83df', title:'#2456a0'}
  ];
  const bodyFont = '17px Arial, "Noto Sans Arabic", sans-serif';
  const headingFont = '700 21px Arial, "Noto Sans Arabic", sans-serif';
  const titleFont = '700 29px Arial, "Noto Sans Arabic", sans-serif';
  const smallFont = '15px Arial, "Noto Sans Arabic", sans-serif';
  const measure = document.createElement('canvas').getContext('2d');

  function wrap(text, maxWidth, font) {
    measure.font = font;
    const words = String(text).trim().split(/\\s+/).filter(Boolean);
    if (!words.length) return [''];
    const out=[]; let line='';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (measure.measureText(candidate).width > maxWidth && line) { out.push(line); line=word; }
      else line=candidate;
    }
    if(line) out.push(line);
    return out;
  }

  const sections=[];
  let current=null;
  const isHeading = line => /^(📘|💡|🎯|⚠️|✅|📚|📝|🔑|📌|🧠|🔹|[0-9]+[.)]|الفصل|الوحدة|الدرس|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|ملاحظات|مهم|أمثلة|مثال|الهيكل|ملخص|الخلاصة)/i.test(line) || (line.length < 70 && !/[.!؟:]$/.test(line));

  for (const block of blocks) {
    const lines = block.split(/\\n+/).map(x=>x.trim()).filter(Boolean);
    if (!lines.length) continue;
    let heading = null;
    if (isHeading(lines[0])) heading = lines.shift();
    if (!current || heading) {
      current = {heading: heading || '', lines: [], color: sections.length % colors.length};
      sections.push(current);
    }
    current.lines.push(...lines);
  }
  if (!sections.length) sections.push({heading:'المذكرة', lines:[raw], color:0});

  const sectionData = sections.map(sec => {
    const col = colors[sec.color];
    const content=[];
    if(sec.heading) content.push({type:'heading', lines:wrap(sec.heading.replace(/^[-*]\\s+/,''), W-pad*2-34, headingFont)});
    for(const line of sec.lines){
      const clean=line.replace(/^[-*]\\s+/, '• ').replace(/^\\d+[.)]\\s*/, m=>m);
      const font = /^•\\s/.test(clean) ? bodyFont : bodyFont;
      content.push({type:'body', lines:wrap(clean, W-pad*2-28, font)});
    }
    const h = 24 + content.reduce((n,r)=>n + r.lines.length*(r.type==='heading'?28:25) + 6, 0) + 14;
    return {sec,col,content,h:Math.max(76,h)};
  });

  const headerH=92;
  const H=Math.min(5200, Math.max(340, headerH + 30 + sectionData.reduce((n,x)=>n+x.h+gap,0) + 28));
  const c=document.createElement('canvas');
  c.width=W*dpr; c.height=H*dpr; c.style.width=W+'px'; c.style.height=H+'px';
  const ctx=c.getContext('2d'); ctx.scale(dpr,dpr); ctx.textBaseline='top'; ctx.direction='rtl';

  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#d8e0ea'; ctx.lineWidth=1.5; ctx.strokeRect(1,1,W-2,H-2);

  // Soft pastel title header.
  ctx.fillStyle='#eef2ff'; ctx.fillRect(1,1,W-2,headerH);
  ctx.fillStyle='#233b72'; ctx.font=titleFont; ctx.textAlign='right'; ctx.direction='rtl';
  ctx.fillText('✦ CanvasFlow — مذكرة شرح الدرس', W-pad, 22);
  ctx.font=smallFont; ctx.fillStyle='#49658f';
  ctx.fillText('ملخص منظم • نقاط مهمة • أمثلة ومراجعة سريعة', W-pad, 59);

  let y=headerH+24;
  sectionData.forEach((item,idx)=>{
    const {col,content,h}=item;
    const x=pad;
    // Rounded card.
    ctx.fillStyle=col.bg; ctx.strokeStyle=col.edge; ctx.lineWidth=1.2;
    const r=18;
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(W-pad-r,y); ctx.quadraticCurveTo(W-pad,y,W-pad,y+r);
    ctx.lineTo(W-pad,y+h-r); ctx.quadraticCurveTo(W-pad,y+h,W-pad-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill(); ctx.stroke();

    // Accent dot.
    ctx.fillStyle=col.accent; ctx.beginPath(); ctx.arc(W-pad-18,y+22,8,0,Math.PI*2); ctx.fill();
    let yy=y+15;
    content.forEach(row=>{
      const isH=row.type==='heading';
      ctx.font=isH?headingFont:bodyFont;
      ctx.fillStyle=isH?col.title:'#334155';
      ctx.textAlign='right'; ctx.direction='rtl';
      row.lines.forEach(line=>{ ctx.fillText(line,W-pad-34,yy); yy += isH?28:25; });
      yy += 6;
    });
    y += h+gap;
  });

  // Footer strip.
  const fy=H-32; ctx.fillStyle='#f1eaff'; ctx.fillRect(pad,fy,W-pad*2,20);
  ctx.fillStyle='#7547c7'; ctx.font='700 15px Arial, "Noto Sans Arabic", sans-serif'; ctx.textAlign='center';
  ctx.fillText('الممارسة المستمرة هي مفتاح الإتقان',W/2,fy+2);

  const src=c.toDataURL('image/png');
  const left=Math.max(90, canvas.getCenter().left-W/2);
  const top=Math.max(80, canvas.getCenter().top-Math.min(350,H/2));
  fabric.Image.fromURL(src,img=>{
    img.set({left,top,objectRole:'studyNote',selectable:true,evented:true,cornerStyle:'circle',transparentCorners:false});
    canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll(); scheduleSave(true);
    aiStatus.textContent='المذكرة الملونة اتحطت على البورد ✓';
    aiPanel.classList.remove('open'); if(aiToggle) aiToggle.classList.remove('active');
  },{crossOrigin:'anonymous'});
}`;
s = s.replace(/function addStudyTextToBoard\\(text\\) \\{[\\s\\S]*?\\n\\}\n\n\/\/ AI action buttons/, studyFn + "\n\n// AI action buttons");

const marker = ".ai-result {";
if (s.includes(marker) && !s.includes(".ai-result{direction:rtl")) {
  const start=s.indexOf(marker), end=s.indexOf("}",start);
  if(end!==-1) s=s.slice(0,end)+"; direction:rtl; text-align:right; word-break:normal; overflow-wrap:break-word; unicode-bidi:plaintext"+s.slice(end);
}
if (!s.includes("#aiKey{display:none")) s=s.replace(".ai-result.empty {", "#aiKey{display:none !important;}\n    .ai-result.empty {");

fs.writeFileSync(file,s,"utf8");
console.log("CanvasFlow: pastel AI study-sheet renderer installed.");
