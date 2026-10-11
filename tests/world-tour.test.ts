import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {worldPacks} from '../src/domain/world-packs.ts';
import {TourAuthority,defaultTourTiming} from '../src/server/tour-authority.ts';

test('World Tour has forty distinct four-choice questions with evidence and estimated progression',()=>{
 assert.equal(worldPacks.length,4);const qs=worldPacks.flatMap(p=>p.questions);assert.equal(qs.length,40);assert.equal(new Set(qs.map(q=>q.id)).size,40);
 qs.forEach((q,i)=>{assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.evidence.length);assert.ok(q.explanation);assert.ok(q.prompt.length<=105);if(i)assert.ok(q.difficulty>=qs[i-1].difficulty);});
});
test('fifteen-second windows plus sixty-second breaks total exactly fifteen minutes',()=>{
 assert.equal(defaultTourTiming.answerMs,15000);assert.equal(defaultTourTiming.breakMs*4,240000);assert.equal(40*(defaultTourTiming.answerMs+defaultTourTiming.revealMs)+4*defaultTourTiming.breakMs,900000);
});
test('full four-pack lifecycle, break guards, persistent explanations and restart replay',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tour-'));let now=1000;const file=join(dir,'tour.json');let a=new TourAuthority(file,()=>now);a.start('tour',42,{answerMs:100,revealMs:10,breakMs:50});
 try{
  for(let pack=0;pack<4;pack++){
   for(let question=0;question<10;question++){
    const global=pack*10+question;now=1000+pack*1150+question*110;
    a.answer({turn:global,choice:worldPacks[pack].questions[question].answer,revision:global+1,attemptId:`a${global}`});
    const open=a.snapshot();assert.equal(open.activeTurn,global);assert.equal(open.result,null);assert.ok(!JSON.stringify(open.question).includes('explanation'));assert.ok(!('answer' in open.question!));
    now+=100;const reveal=a.snapshot();assert.equal(reveal.result?.answer,worldPacks[pack].questions[question].answer);assert.equal(reveal.history.length,global+1);
   }
   now=1000+pack*1150+1100;const intermission=a.snapshot();assert.equal(intermission.phase,'break');assert.equal(intermission.question,null);assert.equal(intermission.tour.completedPacks.length,pack+1);assert.throws(()=>a.answer({turn:pack*10+9,choice:0,revision:99,attemptId:'bad-break'}),/closed/);
   assert.equal(intermission.tour.resultsAvailable,pack===3);
   a=new TourAuthority(file,()=>now);assert.equal(a.snapshot().phase,'break');assert.equal(a.snapshot().history.length,(pack+1)*10);
  }
  now=5600;const end=a.snapshot();assert.equal(end.phase,'finished');assert.equal(end.tour.totalCorrect,40);assert.equal(end.tour.bestSingleRaceScore,Math.max(...end.tour.completedPacks.map(p=>p.progress)));assert.equal(end.tour.qualificationStatus,'not-calibrated');
  const replay=a.replay();assert.equal(replay.packs.length,4);const restored=new TourAuthority(file,()=>now);assert.equal(restored.replay().resultHash,replay.resultHash);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('answer positions do not follow a repeating four-question cycle',()=>{
 const keys=worldPacks.flatMap(p=>p.questions.map(q=>q.answer));
 assert.ok(keys.slice(-12).some((answer,i,tail)=>answer!==tail[i%4]),'Repeating answer-key cycle');
 const correct=worldPacks.flatMap(p=>p.questions).map(q=>q.choices[q.answer]);
 assert.equal(correct[0],'Six');assert.equal(correct[29],'8×');assert.equal(correct[33],'⅓');assert.equal(correct[39],'3/16');
});
test('tour HTTP defaults, late reconnect and break snapshots keep future answers sealed',async()=>{
 const {createApp}=await import('../src/server/http.ts');const dir=mkdtempSync(join(tmpdir(),'tour-http-'));let now=1000;
 const server=createApp({dataDir:dir,format:'tour',clock:()=>now});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`;
 try{const start=await fetch(base+'/api/start',{method:'POST'});const cookie=start.headers.get('set-cookie')!.split(';')[0];let view=await start.json();assert.equal(view.tour.totalQuestions,40);assert.equal(view.timing.answerMs,15000);assert.equal(view.tour.durationMs,900000);assert.equal(view.history.length,0);
 now=166000;view=await(await fetch(base+'/api/state',{headers:{cookie}})).json();assert.equal(view.phase,'break');assert.equal(view.question,null);assert.equal(view.history.length,10);assert.ok(!JSON.stringify(view).includes('RNA uses which base'));
 now=226000;view=await(await fetch(base+'/api/state',{headers:{cookie}})).json();assert.equal(view.activeTurn,10);assert.equal(view.tour.packIndex,1);assert.equal(view.own.correct,0);assert.equal(view.own.item,null);
 now=841000;view=await(await fetch(base+'/api/state',{headers:{cookie}})).json();assert.equal(view.phase,'break');assert.equal(view.tour.resultsAvailable,true);assert.equal(view.history.length,40);const replay=await fetch(base+'/api/replay',{headers:{cookie}});assert.equal(replay.status,200);
 }finally{await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true});}
});
test('receipts remain idempotent across commercial and later-pack boundaries',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tour-retry-'));let now=1000;const a=new TourAuthority(join(dir,'t.json'),()=>now);a.start('r',1,{answerMs:100,revealMs:10,breakMs:50});
 const command={turn:0,choice:0,revision:1,attemptId:'durable-first'};
 try{const receipt=a.answer(command);now=2100;assert.deepEqual(a.answer(command),receipt);now=2150;assert.deepEqual(a.answer(command),receipt);assert.throws(()=>a.answer({...command,attemptId:'new-late'}),/closed/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('stale break snapshots never rewind a later track or the final state',async()=>{
 const {shouldApplySnapshot}=await import('../src/web/client-state.ts');
 const intermission={id:'tour',version:11,activeTurn:9,phase:'break' as const};
 const next={id:'tour',version:12,activeTurn:10,phase:'answer' as const};
 assert.equal(shouldApplySnapshot(intermission,next,0,0),true);assert.equal(shouldApplySnapshot(next,intermission,0,0),false);
 const fourth={id:'tour',version:44,activeTurn:39,phase:'break' as const};const final={...fourth,phase:'finished' as const};
 assert.equal(shouldApplySnapshot(fourth,final,0,0),true);assert.equal(shouldApplySnapshot(final,fourth,0,0),false);
});
test('persisted tours reject a changed question-bank fingerprint instead of silently regrading',async()=>{
 const {readFileSync,writeFileSync}=await import('node:fs');const dir=mkdtempSync(join(tmpdir(),'tour-version-'));const file=join(dir,'t.json');
 try{const a=new TourAuthority(file,()=>1000);a.start('r',1);const manifest=JSON.parse(readFileSync(file,'utf8'));manifest.contentHashes=['tampered'];writeFileSync(file,JSON.stringify(manifest));assert.throws(()=>new TourAuthority(file,()=>1000),/content version/);}finally{rmSync(dir,{recursive:true,force:true});}
});
