export const PARCELS = [
  { id: 'A-01', name: 'VALLEY VIEW', japanese: '谷を見わたす場所', area: 180, price: 980, tag: '静かな谷', description: '朝の光が差し込む、小さな谷のそば。落ち着いた毎日を始めたいあなたへ。', location: '18.4° N / 77.6° E', map: [29, 34], polygon: '14,28 31,19 43,29 39,44 21,48 11,39' },
  { id: 'A-02', name: 'HORIZON HILL', japanese: '地平線を眺める丘', area: 320, price: 1600, tag: '見晴らしのよい丘', description: '赤い大地と、どこまでも続く空。みんなが集まる場所をつくれる、広々とした区画。', location: '18.6° N / 77.8° E', map: [67, 34], polygon: '51,24 69,18 86,28 85,42 65,48 48,39' },
  { id: 'A-03', name: 'CRATER SIDE', japanese: 'クレーターのほとり', area: 240, price: 1200, tag: 'クレーターを望む', description: '悠久のクレーターを望む、ひらけた土地。火星らしい眺めと、あたたかな暮らしを。', location: '18.5° N / 77.7° E', map: [46, 68], polygon: '29,58 47,49 65,61 65,78 47,87 25,76' }
];
export const BUILDINGS = [
 { id: 'home', name: 'HOME POD', japanese: '自分だけの、火星の家。', category: '暮らす', people: 4, area: 28, regolith: 11.2, hours: 22, description: '丸い窓の向こうに、まだ誰も知らない朝。小さくても、必要なものがそろった住まい。', model: '/models/home.glb' },
 { id: 'dining', name: 'DINING POD', japanese: 'みんなで囲む、火星の食卓。', category: '集まる', people: 12, area: 45, regolith: 18.4, hours: 31, description: '今日あったことを、持ち寄って。大きなアーチ窓と丸いテーブルが、人と人をつなぐ場所。', model: '/models/dining.glb' },
 { id: 'green', name: 'GREEN DOME', japanese: '赤い星に、緑のある日常。', category: '育てる', people: 8, area: 50, regolith: 9.6, hours: 26, description: '土に触れて、芽吹きを待つ。透明なドームに守られた緑が、火星の暮らしに彩りを。', model: '/models/green.glb' }
];
export const STORAGE_KEY = 'mars-builder-journey-v1';
export const BUILD_DURATION = 14000;
export function initialState() { return { version: 1, stage: 'title', parcelId: 'A-03', buildingId: 'dining', credits: 5000, owned: null, startedAt: null, completedAt: null }; }
export function restoreState(raw) {
 try {
  const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!s || s.version !== 1 || !['title','land','catalog','building','complete'].includes(s.stage)) return initialState();
  if (!PARCELS.some(p=>p.id===s.parcelId) || !BUILDINGS.some(b=>b.id===s.buildingId)) return initialState();
  if (!Number.isFinite(s.credits) || s.credits<0 || s.credits>5000) return initialState();
  if (s.owned !== null && s.owned !== s.parcelId) return initialState();
  if (['catalog','building','complete'].includes(s.stage) && !s.owned) return initialState();
  const expectedCredits = s.owned ? 5000-PARCELS.find(p=>p.id===s.owned).price : 5000;
  if (s.credits !== expectedCredits) return initialState();
  if (['building','complete'].includes(s.stage) && (!Number.isFinite(s.startedAt) || s.startedAt < 0 || s.startedAt>Date.now()+60000)) return initialState();
  return { ...initialState(), stage:s.stage, parcelId:s.parcelId, buildingId:s.buildingId, credits:s.credits, owned:s.owned, startedAt:s.startedAt, completedAt:Number.isFinite(s.completedAt)?s.completedAt:null };
 } catch { return initialState(); }
}
export function transition(state, action, payload) {
 const s = { ...state };
 switch(action) {
  case 'start': s.stage = s.owned ? (s.completedAt ? 'complete' : s.startedAt ? 'building' : 'catalog') : 'land'; break;
  case 'selectParcel': if (s.stage==='land' && !s.owned && PARCELS.some(p=>p.id===payload)) s.parcelId=payload; break;
  case 'purchase': {
   const parcel=PARCELS.find(p=>p.id===s.parcelId);
   if (s.stage!=='land' || s.owned || s.credits<parcel.price) break;
   s.credits-=parcel.price; s.owned=parcel.id; s.stage='catalog'; break;
  }
  case 'selectBuilding': if(s.stage==='catalog' && BUILDINGS.some(b=>b.id===payload)) s.buildingId=payload; break;
  case 'build': if(s.stage==='catalog' && s.owned){s.stage='building';s.startedAt=payload??Date.now();} break;
  case 'complete': if(s.stage==='building'){s.stage='complete';s.completedAt=payload??Date.now();} break;
  case 'title': s.stage='title'; break;
  case 'reset': return initialState();
 }
 return s;
}
export function progressAt(s, now) { return s.startedAt===null ? 0 : Math.min(1,Math.max(0,(now-s.startedAt)/BUILD_DURATION)); }
