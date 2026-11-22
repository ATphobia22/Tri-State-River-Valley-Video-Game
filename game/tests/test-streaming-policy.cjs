const test=require('node:test'),assert=require('node:assert/strict');
const POLICY=require('../src/streaming-policy.js');

test('frame budget defaults to a bounded 200-tile runtime and stable snapshots',()=>{
  const governor=POLICY.createGovernor({maxTiles:200,minTiles:80,targetFPS:30});
  assert.equal(governor.tileBudget(),200);
  assert.equal(governor.snapshot().targetFrameMs,1000/30);
  assert.equal(governor.observe(16,100).changed,false);
});

test('persistent slow foreground frames reduce terrain tile budget without thrashing',()=>{
  const g=POLICY.createGovernor({maxTiles:200,minTiles:80,targetFPS:30});
  let changed=0;
  for(let i=1;i<=130;i++)if(g.observe(55,i*55).changed)changed++;
  assert.ok(g.tileBudget()<=176&&g.tileBudget()>=80);
  assert.ok(changed>=1&&changed<6, 'governor should not rebuild quadtree each slow frame');
});

test('budget restores gradually after a sustained stable rendering period',()=>{
  const g=POLICY.createGovernor({maxTiles:200,minTiles:80,targetFPS:30});
  for(let i=1;i<=150;i++)g.observe(60,i*60);
  const slow=g.tileBudget();
  assert.ok(slow<200);
  for(let i=1;i<=600;i++)g.observe(12,10000+i*12);
  assert.ok(g.tileBudget()>slow, 'restore at low frame time');
  assert.ok(g.tileBudget()<=200);
});

test('long background-tab frames and bogus timestamps never count as performance evidence',()=>{
 const g=POLICY.createGovernor({maxTiles:200,minTiles:80,targetFPS:30});
 for(let i=1;i<=80;i++)g.observe(1000,i*1000);
 assert.equal(g.tileBudget(),200);
 assert.equal(g.observe(NaN,90000).changed,false);
 assert.equal(g.observe(-2,90001).changed,false);
});

test('lookahead is greater for driving than walking but clamped',()=>{
 assert.ok(POLICY.lookAheadDistance(230)>POLICY.lookAheadDistance(72));
 assert.equal(POLICY.lookAheadDistance(999999),POLICY.lookAheadDistance(450));
 assert.equal(POLICY.lookAheadDistance(-30),POLICY.lookAheadDistance(0));
 assert.ok(POLICY.lookAheadDistance(230)<=240);
});

test('game loads policy before runtime and includes it in offline / PWA cache',()=>{
 const fs=require('node:fs'),root=__dirname+'/../';
 const html=fs.readFileSync(root+'index.html','utf8');
 const cache=fs.readFileSync(root+'sw.js','utf8');
 const game=fs.readFileSync(root+'src/game.js','utf8');
 assert.ok(html.includes('src/streaming-policy.js'));
 assert.ok(html.indexOf('src/streaming-policy.js')<html.indexOf('src/game.js'));
 assert.ok(cache.includes('src/streaming-policy.js'));
 assert.ok(game.includes('ValleyStreamingPolicy'));
 assert.ok(game.includes('streamingGovernor.observe('));
 assert.ok(game.includes('streamingGovernor.tileBudget()'));
});
