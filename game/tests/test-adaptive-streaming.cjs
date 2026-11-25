const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/streaming-policy.js');
test('disconnect reduces budget and reconnect allows gradual recovery', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const nav = {onLine:true};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:nav});
  try {
    const g=policy.createGovernor({maxTiles:200,minTiles:80});
    assert.equal(g.tileBudget(),320);
    nav.onLine=false;
    assert.equal(g.observe(16,16).changed,true);
    assert.equal(g.tileBudget(),200);
    nav.onLine=true;
    for(let i=2;i<250;i++)g.observe(16,i*16);
    assert.ok(g.tileBudget()>200);
    assert.equal(g.snapshot().maxTiles,320);
  } finally {
    if(original)Object.defineProperty(globalThis,'navigator',original);
    else delete globalThis.navigator;
  }
});
test('long rendering stalls contribute to budget reduction',()=>{
  const g=policy.createGovernor({maxTiles:200,minTiles:80,preferOnline:false});
  for(let i=1;i<=30;i++)g.observe(250,i*250);
  assert.ok(g.tileBudget()<200);
  assert.equal(g.snapshot().validFrames,30);
});
