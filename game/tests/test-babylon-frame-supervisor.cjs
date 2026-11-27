const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const unit=import(pathToFileURL(path.resolve(__dirname,'../babylon-preview/frame-supervisor.mjs')).href);

test('transient renderer faults do not escape the render loop and recover',async()=>{
 const {createFrameSupervisor}=await unit;
 let calls=0,frames=0,recovered=0;
 const errors=[];
 const supervisor=createFrameSupervisor({
  render(){if(++calls===1)throw Error('GPU transient fault');},
  onFrame(){frames++;},
  onError(state){errors.push(state);},
  onRecovered(){recovered++;}
 });
 assert.equal(supervisor.tick(),false);
 assert.equal(supervisor.state.failureCount,1);
 assert.match(errors[0].message,/GPU transient fault/);
 assert.equal(supervisor.tick(),true);
 assert.equal(supervisor.state.failureCount,0);
 assert.equal(frames,1);
 assert.equal(recovered,1);
 assert.equal(supervisor.tick(),true);
 assert.equal(recovered,1);
});

test('persistent renderer faults have a bounded exponential frame cooldown',async()=>{
 const {createFrameSupervisor}=await unit;
 let calls=0;
 const supervisor=createFrameSupervisor({render(){calls++;throw Error('driver down');},maxBackoffFrames:4});
 for(let i=0;i<12;i++)assert.equal(supervisor.tick(),false);
 assert.equal(calls,5);
 assert.equal(supervisor.state.failureCount,5);
 assert.ok(supervisor.state.retryFrames<=4);
});

test('invalid callbacks and budgets are rejected',async()=>{
 const {createFrameSupervisor}=await unit;
 assert.throws(()=>createFrameSupervisor({render:null}),/render/);
 assert.throws(()=>createFrameSupervisor({render() {},maxBackoffFrames:0}),/backoff/);
 assert.throws(()=>createFrameSupervisor({render() {},onError:5}),/onError/);
});

test('the actual preview routes rendering through the supervisor',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../babylon-preview/main.js'),'utf8');
 assert.match(source,/createFrameSupervisor/);
 assert.match(source,/runRenderLoop\(\(\)=>renderSupervisor\.tick\(\)\)/);
});
