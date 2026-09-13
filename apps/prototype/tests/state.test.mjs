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
