'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const D=require('../src/director.js');
test('cinematic presets are immutable and map to supported climates',()=>{
 assert.equal(D.pickLook('golden').title,'Golden Hour Riverfront');
 assert.equal(D.pickLook('invalid'),D.LOOKS.natural);
 assert.ok(Object.isFrozen(D.LOOKS));
 for(const key of Object.keys(D.LOOKS)){let v=D.pickLook(key);assert.ok(v.time>=0&&v.time<=24);assert.ok(['clear','rain','mist'].includes(v.weather));}
});
test('device budget limits effects on phones',()=>{assert.ok(D.pickQuality('lite').particles<D.pickQuality('balanced').particles);assert.ok(D.pickQuality('balanced').particles<D.pickQuality('cinematic').particles);assert.equal(D.pickQuality('bogus'),D.QUALITY.balanced);});
test('malformed and hostile VFX save data rejected',()=>{const s=D.cleanSettings({look:'<script>',quality:'giga',strength:Infinity,grain:'x',showStats:0});assert.equal(s.look,'natural');assert.equal(s.quality,'balanced');assert.equal(s.strength,.72);assert.equal(s.showStats,false);});
test('VFX settings preserve valid user controls',()=>{const s=D.cleanSettings({look:'blue',quality:'lite',strength:-3,grain:true,showStats:true});assert.equal(s.strength,0);assert.equal(s.look,'blue');assert.equal(s.quality,'lite');assert.equal(s.grain,true);assert.equal(s.showStats,true);});
test('2D fallback canvas has no required DOM canvas',()=>{assert.equal(D.draw2D(null,{look:'lantern'},0),0);});
test('quality profiles expose sane budgets for mobile GPU',()=>{for(const q of Object.values(D.QUALITY)){assert.ok(q.particles>=12&&q.particles<=130);assert.ok(q.pixelRatio<=1.5);assert.ok(q.maxFPS<=45);}});
