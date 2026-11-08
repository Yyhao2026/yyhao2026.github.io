export const phrases = Object.freeze([
  {id:'craft',text:'一字一印匠心相传',label:'一字一印，匠心相传',note:'把匠人的耐心，排进八枚小小的字块。'},
  {id:'renewal',text:'字字成印生生不息',label:'字字成印，生生不息',note:'字可归位，版可重排。让古老技艺继续生长。'},
  {id:'connection',text:'以字為媒古藝新生',label:'以字为媒，古艺新生',note:'用今天的数字媒介，亲近传统造物智慧。'}
]);
export const getPhrase = id => phrases.find(p=>p.id===id) ?? phrases[0];
export const defaultLayout=Object.freeze({rows:4,cols:2,gap:18,fontScale:86});
export function characters(s) {return Array.from(s.draft.normalize('NFC').replace(/\s/gu,''));}
function validLayout(l){return Number.isInteger(l.rows)&&l.rows>=1&&l.rows<=8&&Number.isInteger(l.cols)&&l.cols>=1&&l.cols<=4&&Number.isFinite(l.gap)&&l.gap>=0&&l.gap<=50&&Number.isFinite(l.fontScale)&&l.fontScale>=65&&l.fontScale<=100;}
export function initialState(phraseId='craft',runId=0,edition=0) {
  return {stage:'select',phraseId,draft:getPhrase(phraseId).text,layout:{...defaultLayout},slots:Array(8).fill(null),history:[],busy:false,runId,edition};
}
export function inspect(s) {
  const chars=characters(s),total=chars.length,capacity=s.layout.rows*s.layout.cols;
  let issue='';
  if(!total)issue='请先写下想印的文字。';
  else if(total>16)issue=`当前${total}字，最多支持16字，请缩短文案。`;
  else if(chars.some(c=>!/^[\p{Script=Han}\p{Script=Latin}\p{N}\p{P}\p{M}]$/u.test(c)))issue='暂支持汉字、字母、数字和常用标点，请移除表情或其他特殊符号。';
  else if(!validLayout(s.layout))issue='版式参数无效，请调整行列或大小。';
  else if(total>capacity)issue=`版面容量为${capacity}格，当前有${total}字，请增加行数或列数。`;
  const count=s.slots.filter(id=>id!==null).length;
  const unique=new Set(s.slots.filter(id=>id!==null));
  const complete=count===total&&unique.size===total&&[...unique].every(id=>Number.isInteger(id)&&id>=0&&id<total);
  return {count,total,capacity,wrong:[],issue,valid:!issue,correct:!issue&&complete};
}
export function transition(s,e) {
  const fresh=()=>({...s,stage:'select',slots:Array(s.layout.rows*s.layout.cols).fill(null),history:[],busy:false,runId:s.runId+1});
  if(e.type==='RESET') return fresh();
  if(e.type==='EDIT'&&s.stage==='compose'&&!s.busy) return fresh();
  if(s.busy) {
    if(e.type!=='DONE'||e.runId!==s.runId) return s;
    const stages=['compose','ink','press','reveal','complete'];
    const next=stages[stages.indexOf(s.stage)+1];
    return next?{...s,stage:next,busy:false,edition:s.edition+(next==='complete'?1:0)}:s;
  }
  if(s.stage==='select'){
    if(e.type==='SET_DRAFT'&&typeof e.value==='string')return {...fresh(),draft:e.value,phraseId:'custom'};
    if(e.type==='SET_LAYOUT'){
      const layout={...s.layout,...e.layout};
      if(!validLayout(layout))return s;
      return {...fresh(),layout,slots:Array(layout.rows*layout.cols).fill(null)};
    }
    if(e.type==='PHRASE'&&phrases.some(p=>p.id===e.phraseId))return {...fresh(),draft:getPhrase(e.phraseId).text,phraseId:e.phraseId};
  }
  if(e.type==='NEXT') {
    if(s.stage==='select') return inspect(s).valid?{...s,stage:'compose'}:s;
    if(s.stage==='compose'&&!inspect(s).correct) return s;
    if(['compose','ink','press','reveal'].includes(s.stage)) return {...s,busy:true};
  }
  if(s.stage!=='compose') return s;
  const validSlot=n=>Number.isInteger(n)&&n>=0&&n<s.slots.length;
  const validGlyph=n=>Number.isInteger(n)&&n>=0&&n<characters(s).length;
  const commit=slots=>({...s,slots,history:[...s.history,s.slots.slice()]});
  if(e.type==='PLACE' && validGlyph(e.id)&&validSlot(e.slot)&&s.slots[e.slot]===null&&!s.slots.includes(e.id)){
    const slots=s.slots.slice();slots[e.slot]=e.id;return commit(slots);
  }
  if(e.type==='REMOVE' && validSlot(e.slot)&&s.slots[e.slot]!==null){const slots=s.slots.slice();slots[e.slot]=null;return commit(slots);}
  if(e.type==='CLEAR' && s.slots.some(id=>id!==null)) return commit(Array(s.slots.length).fill(null));
  if(e.type==='UNDO'&&s.history.length) return {...s,slots:s.history.at(-1).slice(),history:s.history.slice(0,-1)};
  return s;
}
export function printLayout(s,{preview=false}={}) {
  const chars=characters(s),{rows,cols,gap,fontScale}=s.layout;
  const ratio=gap/100,cell=Math.min(780/(cols+(cols-1)*ratio),730/(rows+(rows-1)*ratio));
  const step=cell*(1+ratio),width=cols*cell+(cols-1)*cell*ratio,height=rows*cell+(rows-1)*cell*ratio;
  const slots=preview&&s.stage==='select'?Array.from({length:rows*cols},(_,i)=>inspect(s).valid&&i<chars.length?i:null):s.slots;
  return slots.map((id,i)=>({slot:i,char:id===null?'':chars[id],x:600-width/2+(cols-1-Math.floor(i/rows))*step+cell/2,y:330+(730-height)/2+(i%rows)*step+cell/2,size:cell*fontScale/100}));
}
