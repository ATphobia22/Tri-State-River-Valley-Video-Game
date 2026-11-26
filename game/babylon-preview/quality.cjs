'use strict';
const SETTINGS=Object.freeze({
 low:{scale:.65,shadowMap:512,maxTiles:35,vegetation:.25,hardwareScaling:1.5},
 medium:{scale:.85,shadowMap:1024,maxTiles:70,vegetation:.5,hardwareScaling:1.2},
 high:{scale:1,shadowMap:2048,maxTiles:120,vegetation:.8,hardwareScaling:1},
 ultra:{scale:1,shadowMap:4096,maxTiles:180,vegetation:1,hardwareScaling:1},
 cinematic:{scale:1.5,shadowMap:4096,maxTiles:220,vegetation:1,hardwareScaling:.67}
});
function resolve(name){return Object.freeze({name:SETTINGS[name]?name:'medium',...(SETTINGS[name]||SETTINGS.medium)});}
module.exports={SETTINGS,resolve};
