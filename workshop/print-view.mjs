import {paperSvg,printFont} from './paper-decoration.mjs';
import {printLayout} from './engine.mjs';
export const escapeText=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function renderPrintSvg(state) {
  const glyphs=printLayout(state,{preview:true});
  const words=glyphs.filter(g=>g.char).map(g=>`<text x="${g.x}" y="${g.y}" font-size="${g.size}" text-anchor="middle" dominant-baseline="central">${escapeText(g.char)}</text>`).join('');
  const label=glyphs.map(g=>g.char||'·').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" class="print-art" role="img" aria-label="正字印张预览：${escapeText(label)}">${paperSvg()}<rect x="95" y="95" width="1010" height="1410" fill="none" stroke="#b49860" stroke-width="2"/><g fill="#84734f" font-family="'Source Han Sans SC','Microsoft YaHei',sans-serif" text-anchor="middle"><text x="600" y="180" font-size="28">字 有 新 生</text><text x="600" y="1358" font-size="24">这一张，由你排印</text><text x="600" y="1413" font-size="18">木活字工艺数字体验 · 当代字形与版式再设计</text></g><path d="M260 240H940" stroke="#b49860" stroke-width="2"/><g fill="#332c20" font-family="${escapeText(printFont)}">${words}</g><g fill="#984b32" stroke="none" font-family="SimSun,serif" text-anchor="middle" font-size="28"><rect x="552" y="1170" width="96" height="100" fill="none" stroke="#984b32" stroke-width="3"/><text x="600" y="1212">数字</text><text x="600" y="1252">纪念</text></g></svg>`;
}
