import fs from "node:fs";
const file="public/index.html";
let s=fs.readFileSync(file,"utf8");
if(s.includes("id=\"canvasflow-pastel-ai-renderer\"")){process.exit(0);}
const injected=`
<script id="canvasflow-pastel-ai-renderer">
function cleanAIText(text){
  return String(text||"").replace(/\\x60{3}(?:text|markdown)?/gi,"").replace(/\\*\\*/g,"").replace(/\\$+/g,"").replace(/\\\\(rightarrow|leftarrow|Rightarrow|Leftarrow)/g,"→").replace(/\\\\(text|frac|mathbf|mathrm)\\{([^}]*)\\}/g,"$2").replace(/^#{1,3}\\s*/gm,"").replace(/^[-*]\\s+/gm,"• ").replace(/\\r/g,"").replace(/\\n{3,}/g,"\\n\\n").trim();
}
function addStudyTextToBoard(text){
  const raw=cleanAIText(text), blocks=raw.split(/\\n{2,}/).map(x=>x.trim()).filter(Boolean);
  const W=900,pad=34,gap=16,dpr=Math.max(1,window.devicePixelRatio||1);
  // CanvasFlow original UI palette: violet accent, dark text, soft gray surfaces.
  const colors=[
    {bg:'#ffffff',edge:'#dfe4ea',accent:'#5b63ff',title:'#18202a'},
    {bg:'#f7f8fa',edge:'#e1e5eb',accent:'#7c5cff',title:'#18202a'},
    {bg:'#f4f6f8',edge:'#dfe4ea',accent:'#5b63ff',title:'#18202a'},
    {bg:'#ffffff',edge:'#e1e5eb',accent:'#7c5cff',title:'#18202a'}
  ];
  const bodyFont='17px Arial,"Noto Sans Arabic",sans-serif',headingFont='700 21px Arial,"Noto Sans Arabic",sans-serif',titleFont='700 29px Arial,"Noto Sans Arabic",sans-serif',smallFont='15px Arial,"Noto Sans Arabic",sans-serif';
  const measure=document.createElement('canvas').getContext('2d');
  function wrap(t,max,font){measure.font=font;const words=String(t).trim().split(/\\s+/).filter(Boolean);if(!words.length)return [''];const out=[];let line='';for(const word of words){const c=line?line+' '+word:word;if(measure.measureText(c).width>max&&line){out.push(line);line=word}else line=c}if(line)out.push(line);return out}
  const sections=[];let current=null;
  const isHeading=line=>/^(📘|💡|🎯|⚠️|✅|📚|📝|🔑|📌|🧠|🔹|[0-9]+[.)]|الفصل|الوحدة|الدرس|أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|ملاحظات|مهم|أمثلة|مثال|الهيكل|ملخص|الخلاصة)/i.test(line)||(line.length<70&&!/[.!؟:]$/.test(line));
  for(const block of blocks){const lines=block.split(/\\n+/).map(x=>x.trim()).filter(Boolean);if(!lines.length)continue;let heading=null;if(isHeading(lines[0]))heading=lines.shift();if(!current||heading){current={heading:heading||'',lines:[],color:sections.length%colors.length};sections.push(current)}current.lines.push(...lines)}
  if(!sections.length)sections.push({heading:'المذكرة',lines:[raw],color:0});
  const data=sections.map(sec=>{const col=colors[sec.color],content=[];if(sec.heading)content.push({h:1,lines:wrap(sec.heading.replace(/^[-*]\\s+/,''),W-pad*2-34,headingFont)});for(const line of sec.lines)content.push({h:0,lines:wrap(line.replace(/^[-*]\\s+/,'• '),W-pad*2-28,bodyFont)});const h=24+content.reduce((n,r)=>n+r.lines.length*(r.h?28:25)+6,0)+14;return{col,content,h:Math.max(76,h)}});
  const headerH=92,H=Math.min(5200,Math.max(340,headerH+30+data.reduce((n,x)=>n+x.h+gap,0)+28));
  const c=document.createElement('canvas');c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.textBaseline='top';ctx.direction='rtl';
  ctx.fillStyle='#f4f6f8';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#dfe4ea';ctx.lineWidth=1.5;ctx.strokeRect(1,1,W-2,H-2);
  ctx.fillStyle='#ffffff';ctx.fillRect(1,1,W-2,headerH);ctx.fillStyle='#18202a';ctx.font=titleFont;ctx.textAlign='right';ctx.fillText('✦ CanvasFlow — مذكرة شرح الدرس',W-pad,22);ctx.font=smallFont;ctx.fillStyle='#697383';ctx.fillText('ملخص منظم • نقاط مهمة • أمثلة ومراجعة سريعة',W-pad,59);
  let y=headerH+24;data.forEach(item=>{const{col,content,h}=item,x=pad,r=18;ctx.fillStyle=col.bg;ctx.strokeStyle=col.edge;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(W-pad-r,y);ctx.quadraticCurveTo(W-pad,y,W-pad,y+r);ctx.lineTo(W-pad,y+h-r);ctx.quadraticCurveTo(W-pad,y+h,W-pad-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=col.accent;ctx.beginPath();ctx.arc(W-pad-18,y+22,8,0,Math.PI*2);ctx.fill();let yy=y+15;content.forEach(row=>{ctx.font=row.h?headingFont:bodyFont;ctx.fillStyle=row.h?col.title:'#39424e';ctx.textAlign='right';ctx.direction='rtl';row.lines.forEach(line=>{ctx.fillText(line,W-pad-34,yy);yy+=row.h?28:25});yy+=6});y+=h+gap});
  const fy=H-32;ctx.fillStyle='#eef1f5';ctx.fillRect(pad,fy,W-pad*2,20);ctx.fillStyle='#5b63ff';ctx.font='700 15px Arial,"Noto Sans Arabic",sans-serif';ctx.textAlign='center';ctx.fillText('الممارسة المستمرة هي مفتاح الإتقان',W/2,fy+2);
  const src=c.toDataURL('image/png'),left=Math.max(90,canvas.getCenter().left-W/2),top=Math.max(80,canvas.getCenter().top-Math.min(350,H/2));fabric.Image.fromURL(src,img=>{img.set({left,top,objectRole:'studyNote',selectable:true,evented:true,cornerStyle:'circle',transparentCorners:false});canvas.add(img);canvas.setActiveObject(img);canvas.requestRenderAll();scheduleSave(true);aiStatus.textContent='المذكرة اتحطت على البورد ✓';aiPanel.classList.remove('open');if(aiToggle)aiToggle.classList.remove('active')},{crossOrigin:'anonymous'});
}
</script>`;
s=s.replace('</body>',injected+'\n</body>');fs.writeFileSync(file,s,'utf8');console.log('CanvasFlow: AI study renderer now uses the original UI palette.');
