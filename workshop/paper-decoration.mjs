export const printFont = 'STXingkai, "华文行楷", STKaiti, KaiTi, serif';
export const paperColor = '#ead8ad';
export function paperLines() {
  let seed=173;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:3400},()=>{
    const x=random()*1200,y=random()*1600;
    return [x,y,x+2+random()*14,y+(random()-.5)*5];
  });
}
export const cornerPath='M0 110V0H110 M13 84V13H84 M26 59V26H59 M0 40H40V0 M46 69C14 67 24 32 46 45C69 60 81 23 58 22C39 22 34 47 55 53 M69 46C67 14 32 24 45 46';
export function paperSvg() {
  const fibers=paperLines().map(l=>`M${l[0].toFixed(1)} ${l[1].toFixed(1)}l${(l[2]-l[0]).toFixed(1)} ${(l[3]-l[1]).toFixed(1)}`).join('');
  return `<rect width="1200" height="1600" fill="${paperColor}"/><path d="${fibers}" stroke="#826738" stroke-opacity=".12" stroke-width="1"/><g stroke="#ad8844" stroke-width="3" fill="none" opacity=".8">${['translate(70 70)','translate(1130 70) scale(-1 1)','translate(70 1530) scale(1 -1)','translate(1130 1530) scale(-1 -1)'].map(t=>`<path d="${cornerPath}" transform="${t}"/>`).join('')}</g>`;
}
export function paintPaper(ctx) {
  ctx.fillStyle=paperColor;ctx.fillRect(0,0,1200,1600);
  ctx.strokeStyle='#826738';ctx.globalAlpha=.12;ctx.lineWidth=1;ctx.beginPath();
  for(const [x,y,x2,y2] of paperLines()){ctx.moveTo(x,y);ctx.lineTo(x2,y2);}ctx.stroke();ctx.globalAlpha=.8;
  ctx.strokeStyle='#ad8844';ctx.lineWidth=3;
  for(const [x,y,sx,sy] of [[70,70,1,1],[1130,70,-1,1],[70,1530,1,-1],[1130,1530,-1,-1]]){ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.stroke(new Path2D(cornerPath));ctx.restore();}
  ctx.globalAlpha=1;
}
