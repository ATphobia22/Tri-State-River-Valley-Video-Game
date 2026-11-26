const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/local-ai.js'),P=require('../src/streaming-policy.js');
function fixture(capacity=1024){
 const budget=P.createWorkloadBudget({capacityBytes:capacity,graphicsReserveBytes:200});
 const workers=[],states=[];
 let timers=new Map(),next=0;
 const ai=L.create({budget,modelBytes:400,getGraphicsBytes:()=>300,workerFactory:()=>{
  const w={messages:[],dead:false,postMessage(m){this.messages.push(m)},terminate(){this.dead=true}};workers.push(w);return w;
 },onChange:s=>states.push(s),setTimer:f=>{timers.set(++next,f);return next},clearTimer:id=>timers.delete(id)});
 return {ai,budget,workers,states,timers};
}
test('no worker is created until a user request; reserve before sending one bounded request',()=>{
 const f=fixture();assert.equal(f.workers.length,0);
 assert.equal(f.ai.start({question:'Where is the river?',context:'Riverfront landmark',device:'webgpu'}),true);
 assert.equal(f.budget.snapshot().computeBytes,400);assert.equal(f.workers.length,1);
 assert.equal(f.ai.start({question:'again'}),false);
 const m=f.workers[0].messages[0];assert.equal(m.device,'webgpu');assert.equal(m.question,'Where is the river?');assert.ok(m.context.length<=700);
 f.workers[0].onmessage({data:{kind:'result',text:'Visit the riverfront.'}});
 assert.equal(f.ai.snapshot().phase,'ready');assert.equal(f.ai.snapshot().text,'Visit the riverfront.');
 assert.equal(f.workers[0].dead,true);assert.equal(f.budget.snapshot().computeBytes,0);
});
test('memory pressure rejects the request before creating a worker',()=>{
 const f=fixture(600);assert.equal(f.ai.start({question:'hello'}),false);
 assert.equal(f.workers.length,0);assert.equal(f.ai.snapshot().phase,'blocked');assert.equal(f.budget.snapshot().computeBytes,0);
});
test('cancel terminates before release and ignores stale results',()=>{
 const f=fixture();f.ai.start({question:'first'});const w=f.workers[0],late=w.onmessage;
 assert.equal(f.ai.cancel(),true);assert.equal(w.dead,true);assert.equal(f.budget.snapshot().computeBytes,0);
 f.ai.start({question:'second'});late({data:{kind:'result',text:'stale'}});
 assert.equal(f.ai.snapshot().phase,'loading');assert.notEqual(f.ai.snapshot().text,'stale');
 f.workers[1].onerror({preventDefault(){}});assert.equal(f.ai.snapshot().phase,'fallback');assert.equal(f.budget.snapshot().computeBytes,0);
});
test('timeout frees the worker and returns deterministic fallback',()=>{
 const f=fixture();f.ai.start({question:'Where is the farm?',context:'Explore the farm.'});
 [...f.timers.values()][0]();assert.equal(f.workers[0].dead,true);assert.equal(f.budget.snapshot().computeBytes,0);
 assert.equal(f.ai.snapshot().phase,'fallback');assert.ok(f.ai.snapshot().text.length>0);
});
test('input is bounded and invalid backend names are rejected',()=>{
 const f=fixture();assert.equal(f.ai.start({question:'  '}),false);
 assert.equal(f.ai.start({question:'hello',device:'unknown'}),false);
 assert.equal(f.ai.start({question:'a'.repeat(1000),context:'b'.repeat(1000),device:'wasm'}),true);
 assert.equal(f.workers[0].messages[0].question.length,256);assert.equal(f.workers[0].messages[0].context.length,700);
});

test('hosted UI requires explicit consent before creating an inference worker',()=>{
 const fs=require('node:fs'),root=__dirname+'/../';
 const game=fs.readFileSync(root+'src/game.js','utf8'),html=fs.readFileSync(root+'index.html','utf8');
 assert.ok(html.includes('id="localGuideConsent"'));
 assert.ok(html.indexOf('src/local-ai.js')<html.indexOf('src/game.js'));
 assert.ok(game.includes('if(!consent.checked)'));
 assert.ok(game.includes('computeBusy:hybridBudget.snapshot().activeJobs>0'));
 assert.ok(game.includes('if(memory.overBudget)localGuide?.cancel()'));
 assert.ok(game.includes('status.textContent=s.text'));
});

test('worker construction failure releases its reservation and retains deterministic fallback',()=>{
 const budget=P.createWorkloadBudget({capacityBytes:1024,graphicsReserveBytes:200});
 const ai=L.create({budget,modelBytes:400,getGraphicsBytes:()=>300,workerFactory:()=>{throw Error('worker blocked');}});
 assert.equal(ai.start({question:'Hello',context:'Test scene'}),false);
 assert.equal(budget.snapshot().activeJobs,0);
 assert.equal(ai.snapshot().phase,'fallback');
 assert.ok(ai.snapshot().text.includes('Test scene'));
});
