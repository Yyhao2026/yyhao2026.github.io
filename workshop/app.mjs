import {phrases,characters,initialState,transition,inspect} from './engine.mjs';
import {savePrint} from './export.mjs';
import {renderPrintSvg,escapeText} from './print-view.mjs';

export function mountWorkshop(root = document) {
const $=id=>root.getElementById(id);
const names=['创作','排版','上墨','刷印','揭纸','留印'];
const stages=['select','compose','ink','press','reveal','complete'];
const numerals=['第一步','第二步','第三步','第四步','第五步','第六步'];
const durations={compose:800,ink:2400,press:4000,reveal:3600};
const copy={
  select:{symbol:'創',title:'写自己的话，<br>排自己的版。',instruction:'输入文字，调整行列、大小与字距。中间是正字草稿，满意后生成字模，开始亲手排印。',primary:'生成字模，开始排印',caption:'这是你的正字草稿。字号和字距自动适配纸面，竖排从右列读起。',note:'你可以留下祝福、名字或自己的短句。古老的字模，也能承载今天的表达。'},
  compose:{symbol:'排',title:'每一枚字，<br>由你安排位置。',instruction:'选一枚字，再点一个空位。可自由调换顺序、留下空格；点击已排字块即可取回。印前请展开正字预览确认。',primary:'确认排版并固版',caption:'版面与印张互为镜像。所有字块用齐即可固版，空格位会保留。',note:'同一个字出现两次，也需要两枚独立字块。你可以自由摆放，预览和成品会采用实际排版。'},
  ink:{symbol:'墨',title:'匀一层墨，<br>让字面准备好。',instruction:'用墨刷给凸起的字面匀墨。接下来，文字会从这些反向的字面转印到纸上。',primary:'给字面上墨',caption:'先给字面上墨，再铺纸刷印。上墨和刷印，是两种不同的动作。',note:'真实工艺还包括研墨和润版等环节。本体验将它们简化，让你先看清排版与刷印的关系。'},
  press:{symbol:'印',title:'覆上纸，<br>从纸背刷出印迹。',instruction:'纸张覆盖字模后，换用刷印刷轻扫纸背。墨迹留在紧贴字模的那一面，此刻还看不到它。',primary:'覆纸并刷印',caption:'现在看到的是纸背。着墨的一面，正贴着字模。',note:'墨刷负责上墨，刷印刷负责从纸背传递接触压力。这里用简单动画呈现工艺关系。'},
  reveal:{symbol:'揭',title:'揭起纸，<br>让反字成为正字。',instruction:'先揭起纸张，再翻转展示着墨面。看看刚才的反字，如何变成一张清晰可读的印。',primary:'揭开印张',caption:'提起、揭离，再翻面。正向文字即将出现在你面前。',note:'字形与整版位置都需要镜像，才能在印张上得到正确的字序。成品从右列读起。'},
  complete:{symbol:'成',title:'这一张，<br>由你创作。',instruction:'自己的文字，自己的版式。保存这张数字纪念印张，也可以返回创作，带着现有设置继续修改。',primary:'保存印张',caption:'反字成为正字，创作成为印张。保存你亲手排出的作品吧。',note:'纸张留下文字，字块回到字盘。活字可以拆回、组合，再印出下一张。'}
};
let state=initialState(),selected=null,timer=null,exporting=false,sound=false,audio=null;
let disposed = false;
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
let customMessage='';

function tone(kind='wood') {
  if(!sound) return;
  try {
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
    audio??=new Context();audio.resume().catch(()=>{});
    const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind==='wood'?'sine':'triangle';
    osc.frequency.setValueAtTime(kind==='wood'?310:190,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(80,audio.currentTime+.09);
    gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);
    osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.13);
  } catch {sound=false;$('sound-toggle').textContent='声音不可用';$('sound-toggle').setAttribute('aria-pressed','false');}
}
function apply(event) {
  const before=state;state=transition(state,event);
  if(before===state) return;
  if(event.type==='RESET'||event.type==='EDIT') {clearTimeout(timer);timer=null;selected=null;exporting=false;}
  customMessage='';render();
}
function feedback() {
  if(customMessage)return customMessage;
  if(state.busy)return {compose:'正在校对并固定字块…',ink:'正在给字面匀墨…',press:'正在覆纸并从纸背刷印…',reveal:'正在揭纸，请看着墨面的方向…'}[state.stage];
  if(state.stage==='compose') {
    const v=inspect(state),chars=characters(state);
    if(v.correct)return `全部${v.total}枚字块已就位。请确认正字预览后固版。`;
    return selected===null?`已排 ${v.count} / ${v.total} 枚，还剩${v.total-v.count}枚。`:`已选「${chars[selected]}」，请为它选择位置。`;
  }
  return {select:inspect(state).issue||'文案与版式已就绪，可以生成字模。',ink:'字块已固定，现在可以上墨。',press:'字面已有墨色，可以覆纸刷印。',reveal:'刷印完成，揭开看看你的作品。',complete:'印张已完成，可保存为 1200 × 1600 PNG。'}[state.stage];
}
function fitWorkbench(){
  const scene=$('scene'),mobile=window.matchMedia('(max-width:719px)').matches,{rows,cols,gap,fontScale}=state.layout;
  const cell=mobile?44:50,space=Math.round(3+gap/10),w=Math.max(130,cols*cell+(cols-1)*space+40),h=Math.max(170,rows*cell+(rows-1)*space+40);
  const wide=cols>=3,sceneHeight=Math.max(mobile?396:520,h+(wide?200:140));
  scene.style.height=`${sceneHeight}px`;scene.style.setProperty('--rows',rows);scene.style.setProperty('--cols',cols);scene.style.setProperty('--grid-gap',`${space}px`);
  scene.style.setProperty('--tray-w',`${w}px`);scene.style.setProperty('--tray-h',`${h}px`);scene.style.setProperty('--face-size',`${(mobile?31:35)*fontScale/86}px`);
  scene.style.setProperty('--cover-w',`${w+8}px`);scene.style.setProperty('--cover-h',`${h+8}px`);
  const sheet=Math.min(mobile?204:230,Math.max(150,scene.clientWidth-70));scene.style.setProperty('--sheet-w',`${sheet}px`);scene.style.setProperty('--sheet-h',`${sheet*4/3}px`);
  const restX=wide?Math.max(15,scene.clientWidth/2-80):Math.min(w/2+20,scene.clientWidth/2-45);
  scene.style.setProperty('--rest-x',`${restX}px`);scene.style.setProperty('--ink-y',`${wide?h/2+10:-h/3}px`);scene.style.setProperty('--rub-x',`${wide?-restX:restX}px`);scene.style.setProperty('--rub-y',`${wide?h/2+10:h/8}px`);
  scene.style.setProperty('--sweep-top',`${-h/2+18}px`);scene.style.setProperty('--sweep-bottom',`${h/2-55}px`);scene.classList.toggle('wide-layout',wide);
}
function renderEditor(v){
  const editing=state.stage==='select';
  if($('text-input').value!==state.draft)$('text-input').value=state.draft;
  $('text-input').disabled=!editing;$('text-input').setAttribute('aria-invalid',String(Boolean(v.issue)));
  for(const [id,key] of [['rows','rows'],['cols','cols'],['font-scale','fontScale'],['letter-gap','gap']]){
    $(id).value=state.layout[key];$(id).disabled=!editing;
  }
  $('text-count').textContent=`${v.total} / 16字`;$('font-value').textContent=`${state.layout.fontScale}%`;$('gap-value').textContent=`${state.layout.gap}%`;
  $('draft-status').textContent=v.issue||`${v.capacity}格 · ${v.total}字 · ${v.capacity-v.total}格留白${editing?'':'，返回修改可调整参数'}`;
  $('draft-status').classList.toggle('invalid',Boolean(v.issue));
}
function restoreFocus(key) {
  if(!key)return;
  const el=root.querySelector(`[data-focus="${key}"]`);
  if(el&&!el.disabled)el.focus({preventScroll:true});
}
function render() {
  const proofPanel = $('proof-panel');
  const actions = $('primary').parentElement;
  const proofNote = $('proof-note');
  if (state.stage === 'complete') {
    if (actions.nextElementSibling !== proofPanel) proofPanel.before(actions);
    if (proofNote.nextElementSibling !== actions) actions.before(proofNote);
  } else {
    if (proofPanel.nextElementSibling !== actions) proofPanel.after(actions);
    if (proofNote.parentElement !== proofPanel) proofPanel.append(proofNote);
  }
  const focused=root.activeElement?.dataset.focus;
  const chars=characters(state),v=inspect(state),index=stages.indexOf(state.stage),c=copy[state.stage];
  renderEditor(v);
  $('steps').innerHTML=names.map((n,i)=>`<li class="${i<index?'done':''}" ${i===index?'aria-current="step"':''}><span class="step-no">${i<index?'✓':String(i+1).padStart(2,'0')}</span>${n}</li>`).join('');
  $('phrases').innerHTML=phrases.map((p,i)=>`<button class="phrase-option" data-phrase="${p.id}" data-focus="phrase-${p.id}" aria-pressed="${state.phraseId===p.id}" ${state.stage!=='select'?'disabled':''}><strong>${p.label.split('，').join('<br>')}</strong><small>${['匠心 · 传承','延续 · 生长','古艺 · 新生'][i]}</small></button>`).join('');
  $('glyphs').innerHTML=(v.valid?chars:[]).map((char,i)=>{
    const used=state.slots.includes(i);
    return `<button class="glyph-option ${used?'used':''}" data-glyph="${i}" data-focus="glyph-${i}" aria-label="选择${escapeText(char)}字，第${i+1}枚字模${used?'，已使用':''}" aria-pressed="${selected===i}" ${state.stage!=='compose'||state.busy||used?'disabled':''}><span class="glyph-mini" aria-hidden="true">${escapeText(char)}</span><span class="glyph-label">${escapeText(char)}${selected===i?' ·':''}</span></button>`;
  }).join('');
  $('slots').innerHTML=state.slots.map((id,i)=>`<button class="slot ${id!==null?'filled':''}" data-slot="${i}" data-focus="slot-${i}" aria-label="第${i+1}个位置${id===null?'，空位':`，${escapeText(chars[id])}字，点击取回`}" ${state.stage!=='compose'||state.busy?'disabled':''}><span class="slot-num" aria-hidden="true">${i+1}</span>${id===null?'<span class="empty-plus" aria-hidden="true">＋</span>':`<span class="type-char" aria-hidden="true">${escapeText(chars[id])}</span>`}</button>`).join('');
  $('slots').setAttribute('aria-label',`印版，${state.layout.rows}行${state.layout.cols}列；左侧列对应成品右侧列`);
  $('available-count').textContent=`${Math.max(0,v.total-v.count)} 枚`;
  $('shelf-hint').textContent=state.stage==='select'?'调整完毕后，生成对应文字的字模。':state.stage==='compose'?'字块上是反字，下方正字标签帮助识读。':'字块已成版，完成后可返回创作。';
  $('stage-index').textContent=`${numerals[index]} / ${names[index]}`;$('stage-symbol').textContent=c.symbol;$('stage-title').innerHTML=c.title;
  $('instruction').textContent=c.instruction;$('caption').textContent=c.caption;$('caption-number').textContent=String(index+1).padStart(2,'0');$('culture-note').textContent=c.note;
  $('selection-note').textContent=`本次文案：${v.valid?chars.join(''):'待完善'} · ${state.layout.rows}行${state.layout.cols}列`;
  $('proof').innerHTML=renderPrintSvg(state);
  const message=feedback();if($('feedback').textContent!==message)$('feedback').textContent=message;
  $('feedback').classList.toggle('error',Boolean(v.issue)||Boolean(customMessage&&customMessage.includes('失败')));
  $('primary').disabled=exporting||state.busy||(state.stage==='compose'&&!v.correct)||(state.stage==='select'&&!v.valid);
  $('primary').innerHTML=`${exporting?'正在生成印张…':state.busy?{compose:'正在固版…',ink:'正在上墨…',press:'正在刷印…',reveal:'正在揭纸…'}[state.stage]:c.primary}<span aria-hidden="true">${state.stage==='complete'?'↓':'→'}</span>`;
  for(const id of ['undo','clear'])$(id).hidden=state.stage!=='compose';
  $('undo').disabled=state.busy||!state.history.length;$('clear').disabled=state.busy||v.count===0;
  $('again').hidden=state.stage!=='complete';
  $('edit').hidden=state.stage!=='compose';$('edit').disabled=state.busy;
  const scene=$('scene');scene.dataset.stage=state.stage;scene.dataset.busy=String(state.busy);
  scene.classList.toggle('locked',index>=2||(state.stage==='compose'&&state.busy));
  scene.classList.toggle('inked',index>=3||(state.stage==='ink'&&state.busy));
  scene.classList.toggle('paper-covered',index>=4||(state.stage==='press'&&state.busy));
  scene.classList.toggle('print-visible',state.stage==='complete');
  scene.classList.toggle('draft-visible',state.stage==='select');
  for(const k of ['ink','press','reveal'])scene.classList.toggle(`animating-${k}`,state.stage===k&&state.busy);
  $('paper-words').innerHTML=renderPrintSvg(state);
  $('paper').setAttribute('aria-hidden','true');
  $('view-label').textContent=state.stage==='select'?'创作草稿 / 正字':state.stage==='complete'?'印张面 / 正字':index>=4?'纸背 / 印面朝下':'字模面 / 反字';
  $('plate-summary').textContent=`${state.layout.rows}行 × ${state.layout.cols}列 · ${v.total}字`;
  $('scene-state').textContent=state.busy?'工序进行中':{select:'实时版式预览',compose:`已排 ${v.count} / ${v.total} 枚`,ink:'字版已固定',press:'墨色已就位',reveal:'刷印完成，等待揭纸',complete:'一张印，亲手完成'}[state.stage];
  fitWorkbench();
  restoreFocus(focused);
}

$('phrases').addEventListener('click',e=>{const b=e.target.closest('[data-phrase]');if(b&&!b.disabled){selected=null;apply({type:'PHRASE',phraseId:b.dataset.phrase});}});
$('glyphs').addEventListener('click',e=>{const b=e.target.closest('[data-glyph]');if(!b||b.disabled)return;selected=selected===Number(b.dataset.glyph)?null:Number(b.dataset.glyph);tone();render();});
$('slots').addEventListener('click',e=>{
  const b=e.target.closest('[data-slot]');if(!b||b.disabled)return;
  const slot=Number(b.dataset.slot);
  if(state.slots[slot]!==null){apply({type:'REMOVE',slot});tone();return;}
  if(selected===null){customMessage='先在待用字模中选一枚字，再点击空位。';render();return;}
  const id=selected;selected=null;apply({type:'PLACE',id,slot});tone();
  const next=root.querySelector('[data-glyph]:not(:disabled)');if(next)next.focus({preventScroll:true});
});
$('undo').addEventListener('click',()=>{selected=null;apply({type:'UNDO'});});
$('clear').addEventListener('click',()=>{selected=null;apply({type:'CLEAR'});});
function reset(){apply({type:'RESET'});$('primary').focus({preventScroll:true});}
$('reset').addEventListener('click',reset);$('again').addEventListener('click',reset);
$('edit').addEventListener('click',()=>{apply({type:'EDIT'});$('text-input').focus({preventScroll:true});});
let composing=false;
$('text-input').addEventListener('compositionstart',()=>{composing=true;});
$('text-input').addEventListener('compositionend',()=>{composing=false;selected=null;apply({type:'SET_DRAFT',value:$('text-input').value});});
$('text-input').addEventListener('input',()=>{if(composing)return;selected=null;apply({type:'SET_DRAFT',value:$('text-input').value});});
for(const [id,key] of [['rows','rows'],['cols','cols'],['font-scale','fontScale'],['letter-gap','gap']])$(id).addEventListener('input',()=>{selected=null;apply({type:'SET_LAYOUT',layout:{[key]:Number($(id).value)}});});
$('creation-form').addEventListener('submit',e=>e.preventDefault());
window.addEventListener('resize',fitWorkbench);
$('primary').addEventListener('click',async()=>{
  if(state.stage==='complete') {
    const snapshot=state,runId=state.runId;exporting=true;customMessage='';render();
    try{await savePrint(snapshot);if(state.runId===runId)customMessage='印张已生成，已请求浏览器下载；可在下载列表中查看。';}
    catch{if(state.runId===runId)customMessage='印张生成失败，请重试。你的排版仍然保留。';}
    finally{if(!disposed&&state.runId===runId){exporting=false;render();}}return;
  }
  const stage=state.stage,runId=state.runId;apply({type:'NEXT'});
  if(!state.busy)return;
  tone('brush');clearTimeout(timer);
  timer=setTimeout(()=>{apply({type:'DONE',runId});if(state.runId===runId)$('primary').focus({preventScroll:true});},motion.matches?120:durations[stage]);
});
$('sound-toggle').addEventListener('click',()=>{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context){$('sound-toggle').textContent='声音不可用';return;}
  sound=!sound;$('sound-toggle').setAttribute('aria-pressed',String(sound));$('sound-toggle').innerHTML=`<span aria-hidden="true">♪</span> ${sound?'关闭声音':'开启声音'}`;if(sound)tone();
});
render();
return () => {
  disposed = true;
  clearTimeout(timer);
  window.removeEventListener('resize', fitWorkbench);
  if (audio) void audio.close().catch(() => {});
};
}
