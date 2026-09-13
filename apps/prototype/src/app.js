import './style.css';
import { World } from './world.js';
import { PARCELS, BUILDINGS, initialState, restoreState, transition, progressAt, STORAGE_KEY } from './state.mjs';

const app=document.querySelector('#app'),modal=document.querySelector('#modal'),announcer=document.querySelector('#announcer');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const world=new World();
let state;
try{state=restoreState(localStorage.getItem(STORAGE_KEY));}catch{state=initialState();}
state.stage='title';
let buildFrame=0,toastTimer=0,renderToken=0,busy=false,explore=false,shareUrl=null;
const fmt=n=>n.toLocaleString('en-US');
const parcel=()=>PARCELS.find(p=>p.id===state.parcelId);
const building=()=>BUILDINGS.find(b=>b.id===state.buildingId);
const svgPaths={
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 back:'<path d="m14 6-6 6 6 6"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.4"/>',
 person:'<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a7 7 0 0 1 14 0v3Z"/>',
 area:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"/>',
 layers:'<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 rotate:'<path d="M4 10a8 8 0 0 1 14-4l2 2m0-5v5h-5M20 14a8 8 0 0 1-14 4l-2-2m0 5v-5h5"/>',
 expand:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5"/>',
 share:'<path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 11 3 3 5-5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'
};
const icon=(name,cls='icon')=>'<svg class="'+cls+'" viewBox="0 0 24 24" aria-hidden="true">'+svgPaths[name]+'</svg>';
const button=(label,action,classes='primary',ico='arrow',extra='')=>'<button type="button" class="'+classes+'" data-action="'+action+'" '+extra+'><span>'+label+'</span>'+(ico?icon(ico):'')+'</button>';
function announce(text){clearTimeout(toastTimer);announcer.textContent=text;announcer.classList.add('visible');toastTimer=setTimeout(()=>announcer.classList.remove('visible'),3500);}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{announce('このブラウザでは進行状況を保存できません。');}}
function dispatch(action,payload){state=transition(state,action,payload);save();render();}
function header(){
 const active={land:0,catalog:1,building:2,complete:3}[state.stage]??-1;
 const steps=['土地を選ぶ','建物を選ぶ','建設する','完成'];
 return '<header class="app-header"><button class="brand" data-action="home" aria-label="Mars Builder タイトルへ"><span class="brand-symbol" aria-hidden="true">M</span>MARS BUILDER</button>'+
 (active<0?'':'<ol class="steps" aria-label="体験のステップ">'+steps.map((label,i)=>'<li class="'+(i===active?'active':i<active?'done':'')+'" '+(i===active?'aria-current="step"':'')+'><b>'+(i<active?'✓':String(i+1).padStart(2,'0'))+'</b>'+label+'</li>').join('')+'</ol>')+
 '<div class="header-meta">'+(active<0?'<span class="connection">MARS COLONY NETWORK</span><span class="micro">2036 / 体験版</span>':'<span class="credits">'+icon('layers')+fmt(state.credits)+' <small>MCR</small></span>')+'</div></header>';
}
function titleView(){
 return '<main class="page title-page">'+
 '<button class="text-button intro-skip" data-action="skip">演出をスキップ '+icon('arrow')+'</button>'+
 '<div class="title-copy"><p class="eyebrow">A NEW HOME AWAITS / 2036</p><h1><span>MARS</span><span>BUILDER</span></h1><p class="title-tagline">Design life on Mars.</p>'+
 '<p class="title-description">赤い星に、あなたの居場所を。<br>小さな一歩から、新しい暮らしがはじまる。</p>'+
 '<div class="title-actions">'+button(state.owned?'つづきから体験する':'火星で、はじめる','start','primary','arrow','id="start-button"')+(state.owned?button('新しくはじめる','reset','text-button',null):'')+'</div></div>'+
 '<div class="scene-canvas title-planet" id="world-host" aria-label="回転できる火星の3Dビュー"><div class="scene-hint">'+icon('rotate')+'ドラッグで火星を回す</div></div>'+
 '<footer class="title-foot"><span class="coordinates"><span>18.5° N / 77.7° E</span><span class="scroll-line"></span><span>JEZERO REGION</span></span><span>IMAGINE. BUILD. BELONG.</span></footer></main>';
}
function landView(){
 const p=parcel();
 return '<main class="page land-page"><section class="land-main" aria-label="火星の土地マップ"><div class="map-heading"><p class="eyebrow">01 / FIND YOUR PLACE</p><h1>土地を選ぶ</h1><p>あなたの暮らしは、どこからはじまる？</p></div>'+
 '<div class="map-compass" aria-hidden="true">N<svg viewBox="0 0 20 32"><path d="m10 1 7 25-7-6-7 6Z" fill="#ead8c3"/><path d="M10 1v19l7 6Z" fill="#8d6c56"/></svg></div>'+
 '<div class="map-area"><svg class="parcel-polygons" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+PARCELS.map(p=>'<polygon class="'+(p.id===state.parcelId?'selected':'')+'" points="'+p.polygon+'"/>').join('')+'</svg>'+
 PARCELS.map(p=>'<button type="button" data-action="parcel" data-id="'+p.id+'" class="parcel-marker '+(p.id===state.parcelId?'selected':'')+'" style="left:'+p.map[0]+'%;top:'+p.map[1]+'%" aria-label="'+p.name+'、'+p.area+'平方メートル、'+p.price+'MCR" aria-pressed="'+(p.id===state.parcelId)+'">'+(p.id===state.parcelId?icon('pin'):'')+'<strong>'+p.id+'</strong><small>'+p.area+' m²</small></button>').join('')+'</div>'+
 '<div class="map-caption"><span><i class="available-dot"></i>3つの区画から選択</span><span>JEZERO / MARS</span></div></section>'+
 '<aside class="land-panel" aria-label="選択した土地"><div class="panel-top"><span class="panel-label">SELECTED LAND</span><span class="tag">'+icon('pin')+p.tag+'</span></div><h2>'+p.name+'</h2><p class="japanese">'+p.japanese+'</p><p class="description">'+p.description+'</p>'+
 '<div class="spec-grid"><div><small>区画</small><strong>'+p.id+'</strong></div><div><small>土地の広さ</small><strong>'+p.area+' <small>m²</small></strong></div></div>'+
 '<div class="panel-actions"><div class="price-row"><small>土地の価格</small><strong>'+fmt(p.price)+'<small>MCR</small></strong></div>'+button('この土地を購入','buy','primary','arrow','id="buy-button"')+'<p class="demo-note">体験用クレジットを使用します</p></div></aside></main>';
}
function modelIllustration(id){
 return '<img class="model-illustration" src="'+BUILDINGS.find(model=>model.id===id).poster+'" alt="" loading="eager">';
}
function dimensions(b){
 const d=b.dimensionsMeters;
 return '<span>幅 <b>'+d.width.toFixed(1)+'</b> m</span><span>奥行 <b>'+d.depth.toFixed(1)+'</b> m</span><span>高さ <b>'+d.height.toFixed(1)+'</b> m</span>';
}
function catalogView(){
 const b=building(),p=parcel();
 return '<main class="page catalog-page"><div class="catalog-heading"><div><p class="eyebrow">02 / MAKE IT YOURS</p><h1>建物を選ぶ</h1></div><div class="owned-label">'+icon('pin')+'<span>'+p.name+' / </span><strong>'+p.id+'</strong></div></div>'+
 '<section class="model-stage" aria-label="選択した建物の3Dプレビュー"><button type="button" class="model-badge rotation-toggle" data-action="rotation" aria-pressed="'+world.autoRotateEnabled+'">自動回転中</button><span class="model-index">0'+(BUILDINGS.indexOf(b)+1)+' / 03</span><div class="scene-canvas" id="world-host"><div class="scene-hint">'+icon('rotate')+'ドラッグで建物を回す</div></div><span class="model-stage-title">'+b.name+'</span></section>'+
 '<section class="catalog-details"><p class="category">'+b.category+' / DESIGNED FOR MARS</p><h2>'+b.name+'</h2><h3>'+b.japanese+'</h3><p class="description">'+b.description+'</p><div class="building-specs model-dimensions" aria-label="設備を含むモデルの外形寸法">'+dimensions(b)+'</div><p class="dimension-note">モデルの外形寸法 / 設備を含む目安</p>'+
 '<div class="model-picker" role="group" aria-label="建物カタログ">'+BUILDINGS.map(m=>'<button type="button" class="model-option '+(b.id===m.id?'selected':'')+'" data-action="model" data-id="'+m.id+'" aria-pressed="'+(m.id===b.id)+'" aria-label="'+m.nameJa+'を選択">'+(m.id===b.id?icon('check','check'):'')+modelIllustration(m.id)+'<strong>'+m.nameJa+'</strong><small>'+m.category+'</small></button>').join('')+'</div>'+
 '<div class="resource-line"><span>'+icon('layers')+'レゴリスの積層建築</span><span>'+icon('clock')+'建設体験 <b>約14秒</b></span></div>'+button('この建物を建てる','build','primary','arrow','id="build-button"')+'<p class="demo-note">選んだ建物を、火星の土でかたちに。</p></section></main>';
}
function buildingView(){
 const b=building();
 return '<main class="page building-page"><section class="construction-stage" aria-label="3Dプリントの建設アニメーション"><div class="construction-meta"><i></i>LIVE FROM MARS / '+state.parcelId+'</div><div class="scene-canvas" id="world-host"><div class="scene-hint">'+icon('rotate')+'ドラッグで建設を見わたす</div></div></section>'+
 '<section class="building-details"><p class="eyebrow">03 / A PLACE IS BORN</p><h1>BUILDING<br> NOW<span style="color:var(--accent)">.</span></h1><p>あなたの居場所を建設中。<br>火星の土が、暮らしのかたちになっていく。</p>'+
 '<div class="progress-panel"><div class="progress-label"><span id="build-phase">レゴリスを準備中</span><strong><span id="progress-number">0</span><small>%</small></strong></div><div class="progress-track" role="progressbar" aria-label="建設の進捗" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="progress-fill"></div></div>'+
 '<ol class="build-checklist"><li data-phase="0">'+icon('check')+'レゴリスを充填</li><li data-phase="1">'+icon('layers')+'建物を3Dプリント</li><li data-phase="2">'+icon('sun')+'暮らしの準備</li></ol></div><p class="build-caption">約14秒の建設体験です</p><div class="build-name"><strong>'+b.name+'</strong><span>'+parcel().id+'</span></div></section></main>';
}
function completeView(){
 const b=building(),p=parcel();
 return '<main class="page complete-page '+(explore?'explore-mode':'')+'"><section class="colony-stage" aria-label="完成した'+b.nameJa+'"><div class="scene-canvas" id="world-host"><div class="scene-hint">'+icon('rotate')+'ドラッグで建物を回す</div></div></section>'+
 '<section class="complete-details"><div class="success-icon">'+icon('check')+'</div><p class="eyebrow">04 / WELCOME HOME</p><h1>あなたの'+(b.isHome?'お家':'居場所')+'が<br>できました。</h1><p>火星に、あなただけの場所がひとつ。<br>ここから、新しい日常がはじまります。</p>'+
 '<div class="completion-card"><h2>'+b.name+'</h2><p>'+b.nameJa+' / '+p.id+' / MARS, 2036</p><div class="building-specs model-dimensions">'+dimensions(b)+'</div></div>'+
 '<div class="complete-actions">'+button('ぐるっと見てみる','explore','primary','expand')+button('この場所をシェア','share','secondary','share')+'</div>'+button('もう一度、はじめから','reset','text-button',null)+'</section>'+
 '<button class="round-button close-explore" data-action="explore-close" aria-label="建物の全画面表示を閉じる">'+icon('close')+'</button><div class="explore-caption"><h2>'+b.name+'</h2><p>'+p.name+' / MY MARS, 2036</p></div></main>';
}
function render(){
  const token=++renderToken;cancelAnimationFrame(buildFrame);explore=false;
  const views={title:titleView,land:landView,catalog:catalogView,building:buildingView,complete:completeView};
  app.innerHTML=header()+views[state.stage]();
  document.body.dataset.stage=state.stage;window.scrollTo(0,0);
  const host=document.querySelector('#world-host'),mode={title:'planet',catalog:'model',building:'printing',complete:'home'}[state.stage];
  if(host&&mode){world.attach(host,mode,state.buildingId,state.parcelId);}
  if(state.stage==='building'){
    const update=()=>{
      if(token!==renderToken)return;
      const p=progressAt(state,Date.now()),percent=Math.floor(p*100);
      document.querySelector('#progress-number').textContent=String(percent);
      document.querySelector('#progress-fill').style.width=percent+'%';
      document.querySelector('.progress-track').setAttribute('aria-valuenow',String(percent));
      const phase=p<.14?0:p<.87?1:2;
      document.querySelector('#build-phase').textContent=['レゴリスを準備中','3Dプリント中','完成までもう少し'][phase];
      document.querySelectorAll('[data-phase]').forEach((el,i)=>{el.classList.toggle('done',i<phase);el.classList.toggle('active',i===phase);});
      world.setProgress(p);
      if(p>=1){dispatch('complete');announce('あなたの'+(building().isHome?'お家':'居場所')+'が完成しました。');return;}
      buildFrame=requestAnimationFrame(update);
    };buildFrame=requestAnimationFrame(update);
  }
}
function openDialog(content){
 modal.innerHTML='<button class="close-modal" data-action="close" aria-label="閉じる">'+icon('close')+'</button>'+content;
 modal.showModal();
}
function purchaseDialog(){
 const p=parcel();
 openDialog('<p class="eyebrow">YOUR FIRST STEP</p><h2>この場所から、<br>はじめませんか。</h2><p>'+p.name+' / 区画 '+p.id+'<br>'+p.area+' m² の土地を購入します。</p><div class="dialog-details"><span>体験用クレジット</span><strong>'+fmt(p.price)+' MCR</strong></div><p style="margin-bottom:20px">実際のお支払いは発生しません。<br>購入後の残高：'+fmt(state.credits-p.price)+' MCR</p>'+button('購入して建物を選ぶ','purchase','primary','arrow','id="confirm-purchase"')+button('土地選びに戻る','close','text-button',null));
}
function resetDialog(){
 openDialog('<p class="eyebrow">A NEW BEGINNING</p><h2>もう一度、はじめますか。</h2><p>今の体験をリセットして、土地選びからやり直します。体験用クレジットも5,000 MCRに戻ります。</p><div style="margin-top:24px">'+button('新しくはじめる','confirm-reset','primary','arrow')+button('今の体験に戻る','close','text-button',null)+'</div>');
}
async function makeShareCard(){
 const b=building(),p=parcel(),canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const c=canvas.getContext('2d');c.fillStyle='#121616';c.fillRect(0,0,1080,1350);
 const shot=world.snapshot(),im=new Image();im.src=shot||b.poster;await im.decode();
 const scale=Math.min(1080/im.width,810/im.height);c.drawImage(im,(1080-im.width*scale)/2,170,im.width*scale,im.height*scale);
 c.fillStyle='#ed8956';c.font='bold 22px Arial';c.fillText('MARS BUILDER / 2036',64,90);
 c.fillStyle='#f7f1e9';c.font='bold 65px Arial';c.fillText('I BUILT THIS',64,990);c.fillText('ON MARS.',64,1067);
 c.font='26px Arial';c.fillText(b.name,66,1140);c.fillStyle='#bab8b3';c.font='20px Arial';c.fillText(p.name+' / '+p.id+' / MY NEW HOME',66,1183);
 c.strokeStyle='#524339';c.beginPath();c.moveTo(64,1230);c.lineTo(1016,1230);c.stroke();
 c.fillStyle='#ed8956';c.font='22px Arial';c.fillText('Design life on Mars.',64,1282);c.fillStyle='#bab8b3';c.font='18px Arial';c.fillText('#BuildMars',892,1282);
 return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
}
async function shareDialog(){
 if(busy)return;busy=true;
 try{
 const blob=await makeShareCard();if(!blob)throw new Error('card');
 if(shareUrl)URL.revokeObjectURL(shareUrl);shareUrl=URL.createObjectURL(blob);
 openDialog('<p class="eyebrow">SHARE YOUR MARS</p><h2>火星につくった、私の場所。</h2><img class="share-image" src="'+shareUrl+'" alt="完成した建物のシェアカード"><p style="margin-bottom:16px">カードを保存して、あなたの火星をシェア。</p>'+button('画像を保存','download-card','primary','download'));
 }catch{announce('画像を作れませんでした。もう一度お試しください。');}finally{busy=false;}
}
async function handleAction(event){
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action;
 if(action==='close'){modal.close();return;}
 if(action==='home'){if(state.stage==='building'){announce('建設中です。完成までもう少しお待ちください。');return;}dispatch('title');return;}
 if(action==='skip'){document.querySelector('.title-page')?.classList.add('skip-motion');target.remove();return;}
 if(action==='start'){
   if(busy)return;busy=true;target.disabled=true;document.querySelector('.title-page')?.classList.add('departing');
   setTimeout(()=>{busy=false;dispatch('start');},reduced?0:680);return;
 }
 if(action==='parcel'){dispatch('selectParcel',target.dataset.id);return;}
 if(action==='buy'){purchaseDialog();return;}
 if(action==='purchase'){target.disabled=true;modal.close();dispatch('purchase');announce(parcel().name+'の土地を購入しました。');return;}
 if(action==='model'){dispatch('selectBuilding',target.dataset.id);return;}
 if(action==='rotation'){world.setAutoRotate(!world.autoRotateEnabled);return;}
 if(action==='build'){dispatch('build');return;}
 if(action==='reset'){resetDialog();return;}
 if(action==='confirm-reset'){modal.close();dispatch('reset');announce('新しい火星の暮らしを、はじめましょう。');return;}
 if(action==='explore'||action==='explore-close'){
   explore=action==='explore';document.querySelector('.complete-page')?.classList.toggle('explore-mode',explore);
   requestAnimationFrame(()=>world.resize());if(explore)document.querySelector('.close-explore')?.focus();return;
 }
 if(action==='share'){await shareDialog();return;}
 if(action==='download-card'){
  const a=document.createElement('a');a.href=shareUrl;a.download='my-mars-'+state.buildingId+'-'+state.parcelId+'.png';a.click();announce('シェアカードを保存しました。');return;
 }
}
app.addEventListener('click',handleAction);modal.addEventListener('click',handleAction);
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&explore){explore=false;document.querySelector('.complete-page')?.classList.remove('explore-mode');world.resize();}});
// Development-only review routes let designers inspect each screen without changing saved progress.
if(import.meta.env.DEV){
 const preview=new URLSearchParams(location.search).get('preview');
 if(['land','catalog','building','complete'].includes(preview)){
  state=transition(initialState(),'start');
  if(preview!=='land')state=transition(state,'purchase');
  const previewModel=new URLSearchParams(location.search).get('model');
  if(BUILDINGS.some(model=>model.id===previewModel))state=transition(state,'selectBuilding',previewModel);
  if(['building','complete'].includes(preview))state=transition(state,'build',Date.now()-5000);
  if(preview==='complete')state=transition(state,'complete');
 }
 window.marsPreview={world,getState:()=>({...state})};
}
render();
world.preload();
