import {paintPaper,printFont} from './paper-decoration.mjs';
import {printLayout} from './engine.mjs';

export async function createPrintBlob(state) {
  if(state.stage!=='complete') throw new Error('请先完成印刷。');
  await document.fonts.ready;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;
  const ctx=canvas.getContext('2d');if(!ctx) throw new Error('浏览器不支持图片绘制。');
  const css=getComputedStyle(document.documentElement);
  const color=name=>({'--line':'#b49860','--ink':'#332c20','--muted':'#84734f','--primary':'#984b32'}[name]||css.getPropertyValue(name).trim());
  paintPaper(ctx);
  ctx.strokeStyle=color('--line');ctx.lineWidth=2;ctx.strokeRect(95,95,1010,1410);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=color('--muted');ctx.font='28px "Source Han Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('字 有 新 生',600,170);
  ctx.beginPath();ctx.moveTo(260,240);ctx.lineTo(940,240);ctx.stroke();
  ctx.fillStyle=color('--ink');
  for(const glyph of printLayout(state)){
    if(!glyph.char)continue;
    ctx.font=`${glyph.size}px ${printFont}`;
    ctx.fillText(glyph.char,glyph.x,glyph.y);
  }
  ctx.strokeStyle=color('--primary');ctx.lineWidth=3;ctx.strokeRect(552,1170,96,100);
  ctx.fillStyle=color('--primary');ctx.font='28px "Source Han Serif SC", SimSun, serif';
  ctx.fillText('数字',600,1202);ctx.fillText('纪念',600,1242);
  ctx.fillStyle=color('--muted');ctx.font='24px "Source Han Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('这一张，由你排印',600,1350);
  ctx.font='18px "Source Han Sans SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('木活字工艺数字体验 · 当代字形与版式再设计',600,1407);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('图片生成失败。')),'image/png'));
  return {blob,filename:'字有新生-创作印张.png'};
}

export async function savePrint(state) {
  const {blob,filename}=await createPrintBlob(state);
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
