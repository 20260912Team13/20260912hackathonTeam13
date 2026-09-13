import catalog from './catalog.json' with { type: 'json' };

export const PARCELS = [
  { id: 'A-01', name: 'VALLEY VIEW', japanese: '谷を見わたす場所', area: 180, price: 980, tag: '静かな谷', description: '朝の光が差し込む、小さな谷のそば。落ち着いた毎日を始めたいあなたへ。', location: '18.4° N / 77.6° E', map: [29, 34], polygon: '14,28 31,19 43,29 39,44 21,48 11,39' },
  { id: 'A-02', name: 'HORIZON HILL', japanese: '地平線を眺める丘', area: 320, price: 1600, tag: '見晴らしのよい丘', description: '赤い大地と、どこまでも続く空。みんなが集まる場所をつくれる、広々とした区画。', location: '18.6° N / 77.8° E', map: [67, 34], polygon: '51,24 69,18 86,28 85,42 65,48 48,39' },
  { id: 'A-03', name: 'CRATER SIDE', japanese: 'クレーターのほとり', area: 240, price: 1200, tag: 'クレーターを望む', description: '悠久のクレーターを望む、ひらけた土地。火星らしい眺めと、あたたかな暮らしを。', location: '18.5° N / 77.7° E', map: [46, 68], polygon: '29,58 47,49 65,61 65,78 47,87 25,76' }
];
const stories = {
 '01-mars-commons': { category: '集まる', japanese: '火星で、同じ食卓を囲む。', description: '大きなアーチの向こうに、あたたかな灯り。ドームと温室がつながる、みんなの居場所。', isHome: false },
 '02-greenhouse-home': { category: '暮らす', japanese: '緑と暮らす、赤い星のわが家。', description: '丸い住まいに、自分だけの小さな温室。芽吹きを眺めながら、新しい日常を育てよう。', isHome: true },
 '03-terrace-habitat': { category: 'くつろぐ', japanese: '空に近い、テラスのある暮らし。', description: 'なめらかな段差と、外の景色を切り取る丸窓。屋上の緑に囲まれて、火星の時間をゆっくりと。', isHome: true }
};
export const BUILDINGS = catalog.models.map(model => ({
 ...model, ...stories[model.id],
 model: '/buildings/' + model.model,
 poster: '/buildings/' + model.poster
}));
const legacyBuildings = { home:'02-greenhouse-home', dining:'01-mars-commons', green:'03-terrace-habitat' };
export const STORAGE_KEY = 'mars-builder-journey-v1';
export const BUILD_DURATION = 14000;
export function initialState() { return { version: 2, stage: 'title', parcelId: 'A-03', buildingId: '02-greenhouse-home', credits: 5000, owned: null, startedAt: null, completedAt: null }; }
export function restoreState(raw) {
 try {
  const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!s || ![1,2].includes(s.version) || !['title','land','catalog','building','complete'].includes(s.stage)) return initialState();
  const buildingId = s.version===1 ? (legacyBuildings[s.buildingId] ?? s.buildingId) : s.buildingId;
  if (!PARCELS.some(p=>p.id===s.parcelId) || !BUILDINGS.some(b=>b.id===buildingId)) return initialState();
  if (!Number.isFinite(s.credits) || s.credits<0 || s.credits>5000) return initialState();
  if (s.owned !== null && s.owned !== s.parcelId) return initialState();
  if (['catalog','building','complete'].includes(s.stage) && !s.owned) return initialState();
  const expectedCredits = s.owned ? 5000-PARCELS.find(p=>p.id===s.owned).price : 5000;
  if (s.credits !== expectedCredits) return initialState();
  if (['building','complete'].includes(s.stage) && (!Number.isFinite(s.startedAt) || s.startedAt < 0 || s.startedAt>Date.now()+60000)) return initialState();
  return { ...initialState(), stage:s.stage, parcelId:s.parcelId, buildingId, credits:s.credits, owned:s.owned, startedAt:s.startedAt, completedAt:Number.isFinite(s.completedAt)?s.completedAt:null };
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
