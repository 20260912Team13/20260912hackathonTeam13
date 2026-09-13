import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition, restoreState, PARCELS, BUILDINGS, progressAt, BUILD_DURATION } from '../src/state.mjs';
test('all nine parcel/building combinations complete with correct balance',()=>{
 for(const p of PARCELS) for(const b of BUILDINGS){
 let s=transition(initialState(),'start');s=transition(s,'selectParcel',p.id);s=transition(s,'purchase');
 assert.equal(s.credits,5000-p.price);assert.equal(s.owned,p.id);
 s=transition(s,'selectBuilding',b.id);s=transition(s,'build',1000);s=transition(s,'complete',15000);
 assert.equal(s.stage,'complete');assert.equal(s.buildingId,b.id);assert.equal(s.parcelId,p.id);
 }
});
test('double purchase and repeated build do not charge or reset construction',()=>{
 let s=transition(transition(initialState(),'start'),'purchase'); const balance=s.credits;
 s=transition(s,'purchase');assert.equal(s.credits,balance);
 s=transition(s,'build',1000);s=transition(s,'build',9999);assert.equal(s.startedAt,1000);
});
test('invalid transitions and ids cannot bypass ownership',()=>{
 const s=initialState();assert.deepEqual(transition(s,'build'),s);assert.deepEqual(transition(s,'purchase'),s);
 const land=transition(s,'start');assert.deepEqual(transition(land,'selectParcel','invalid'),land);
});
test('persisted progress resumes and elapsed time is bounded',()=>{
 let s=transition(transition(transition(initialState(),'start'),'purchase'),'build',Date.now());
 s=restoreState(JSON.stringify(s));assert.equal(s.stage,'building');
 assert.equal(progressAt(s,s.startedAt-100),0);assert.equal(progressAt(s,s.startedAt+BUILD_DURATION/2),0.5);assert.equal(progressAt(s,s.startedAt+BUILD_DURATION*2),1);
});
test('corrupted and inconsistent storage safely resets',()=>{
 for(const raw of ['bad json','null',JSON.stringify({...initialState(),credits:-1}),JSON.stringify({...initialState(),stage:'catalog'}),JSON.stringify({...initialState(),parcelId:'<script>'})]) assert.deepEqual(restoreState(raw),initialState());
});
test('reset restores credits and selections',()=>{assert.deepEqual(transition({...initialState(),owned:'A-03',credits:3800},'reset'),initialState());});

test('existing saved journeys migrate to the supplied building catalog without charging again',()=>{
 const mapping={home:'02-greenhouse-home',dining:'01-mars-commons',green:'03-terrace-habitat'};
 for(const [oldId,newId] of Object.entries(mapping)){
  const old={version:1,stage:'building',parcelId:'A-03',buildingId:oldId,credits:3800,owned:'A-03',startedAt:Date.now()-3000,completedAt:null};
  const restored=restoreState(JSON.stringify(old));
  assert.equal(restored.version,2);assert.equal(restored.buildingId,newId);
  assert.equal(restored.credits,old.credits);assert.equal(restored.owned,old.owned);assert.equal(restored.startedAt,old.startedAt);
 }
});

test('all supplied catalog models have matching binary assets and usable image paths',async()=>{
 const {readFile}=await import('node:fs/promises');const {createHash}=await import('node:crypto');
 for(const model of BUILDINGS){
  const asset=await readFile(new URL('../public'+model.model,import.meta.url));
  assert.equal(asset.toString('ascii',0,4),'glTF');assert.equal(asset.readUInt32LE(4),2);
  assert.equal(createHash('sha256').update(asset).digest('hex'),model.sha256);
  assert.equal(asset.length,model.bytes);
  const image=await readFile(new URL('../public'+model.poster,import.meta.url));
  assert.equal(image.toString('ascii',1,4),'PNG');
  assert.ok(model.dimensionsMeters.width>0&&model.dimensionsMeters.height>0&&model.dimensionsMeters.depth>0);
 }
});
