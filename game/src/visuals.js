/* Procedurally illustrated minigame backgrounds. Deterministic rendering, no external textures. */
(function(root){'use strict';
 const W=960,H=320;
 const path=(c,p,fill,stroke)=>{c.beginPath();p(c);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
 const ellipse=(c,x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=col;c.fill();};
 const sky=(c,a,b)=>{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,0,W,H);};
 const hill=(c,y,color,phase,amp=25)=>{path(c,cc=>{cc.moveTo(0,H);cc.lineTo(0,y);for(let x=0;x<=W;x+=10)cc.lineTo(x,y+Math.sin(x/110+phase)*amp+Math.cos(x/43+phase)*7);cc.lineTo(W,H);cc.closePath()},color);};
 const pine=(c,x,base,scale,leaf='#163d35')=>{c.fillStyle='#5a4436';c.fillRect(x-2*scale,base-32*scale,4*scale,32*scale);for(let i=0;i<3;i++){path(c,cc=>{cc.moveTo(x,base-(104-i*25)*scale);cc.lineTo(x-(25-i*3)*scale,base-(35-i*9)*scale);cc.lineTo(x+(25-i*3)*scale,base-(35-i*9)*scale);cc.closePath()},leaf);}};
 const text=(c,value,x,y,size=20,color='#ffecd4',align='center')=>{c.save();c.textAlign=align;c.font=`700 ${size}px system-ui`;c.shadowColor='#09231a';c.shadowBlur=6;c.fillStyle=color;c.fillText(value,x,y);c.restore();};
 function animal(c,x,y,kind,t){const move=Math.sin(t/300)*2;c.save();c.translate(x,y+move);
   const rabbit=kind.includes('Rabbit'),bird=kind.includes('Turkey');
   ellipse(c,0,0,rabbit?25:bird?38:54,rabbit?14:bird?24:28,'#8d6245');
   ellipse(c,rabbit?20:bird?33:48,-13,rabbit?12:bird?12:16,rabbit?12:bird?15:18,'#a97c55');
   if(rabbit){ellipse(c,16,-31,5,24,'#c9a076');ellipse(c,29,-31,5,21,'#b08360');}
   else if(bird){for(let i=0;i<8;i++){let a=-Math.PI+Math.PI*i/7;ellipse(c,-31+Math.cos(a)*19,-6+Math.sin(a)*28,7,19,['#b77946','#9f7343','#b59462'][i%3]);}}
   else {for(const sx of [-35,-16,24,45]){c.strokeStyle='#674a33';c.lineWidth=8;c.beginPath();c.moveTo(sx,11);c.lineTo(sx-4,48);c.stroke();}c.strokeStyle='#b99265';c.lineWidth=5;c.beginPath();c.moveTo(56,-27);c.lineTo(65,-45);c.lineTo(74,-51);c.moveTo(65,-45);c.lineTo(62,-58);c.stroke();}
   ellipse(c,(rabbit?29:bird?41:57),-18,3.5,3.5,'#16251d');c.restore();
 }
 function hunt(c,t,state){sky(c,'#203953','#d4a67d');ellipse(c,770,74,45,45,'#ffde91');hill(c,171,'#647d6c',.3,35);hill(c,213,'#3d6b58',2.1,24);hill(c,273,'#244e3e',1.1,19);for(let i=0;i<27;i++){let x=(i*107)%W+((i*73)%29);pine(c,x,272,0.5+(i%4)*.3,i%2?'#183c34':'#214c3e');}
   c.fillStyle='#6c6046';c.fillRect(0,276,W,44);for(let i=0;i<50;i++)ellipse(c,(i*79)%W,277+(i%4)*5,6,8,i%2?'#c5a665':'#829455');
   const x=((state.target??.52)*.72+.14)*W;animal(c,x,248,state.kind||'Deer',t);
   // Reticle tracks pointer input rather than implying a successful hunting result.
   const aim=state.aim??.5;let cx=(aim*.72+.14)*W;c.strokeStyle='#f7edc1';c.lineWidth=2;c.beginPath();c.arc(cx,250,19,0,Math.PI*2);c.moveTo(cx-29,250);c.lineTo(cx-10,250);c.moveTo(cx+10,250);c.lineTo(cx+29,250);c.stroke();
   text(c,'WOODLAND TRAIL',27,35,17,'#fff0ba','left');text(c,'Virtual wildlife · non-graphic target game',27,62,12,'#f8ddad','left');
 }
 function fish(c,t,state){sky(c,'#152f54','#cc9b73');ellipse(c,720,68,48,48,'#ffd49b');hill(c,165,'#4a6c6a',1.7,16);hill(c,186,'#254d5b',3,14);
   c.fillStyle='#286779';c.fillRect(0,180,W,140);const water=c.createLinearGradient(0,180,0,320);water.addColorStop(0,'#4a9b9a');water.addColorStop(1,'#153f5a');c.fillStyle=water;c.fillRect(0,180,W,140);
   for(let j=0;j<28;j++){const y=187+j*5;let shift=Math.sin(t/700+j)*28;c.globalAlpha=.12+(j%4)*.04;c.strokeStyle=j%2?'#dbf4df':'#84bfba';c.lineWidth=1.6;c.beginPath();for(let i=0;i<16;i++){let x=i*70+shift+j*19;c.moveTo(x,y);c.lineTo(x+38,y+Math.sin(i+j+t/850)*3);}c.stroke();}c.globalAlpha=1;
   for(let i=0;i<11;i++){const x=i%2?28+i*9:870+i*7;path(c,cc=>{cc.moveTo(x,320);cc.quadraticCurveTo(x-16,238,x+Math.sin(i)*15,167)},null,'#83a977');}
   const bx=470+Math.sin(t/730)*11,by=217+Math.sin(t/230)*5+(state.biting?16:0);
   c.strokeStyle='#eac98e';c.lineWidth=2;c.beginPath();c.moveTo(760,63);c.lineTo(bx,by);c.stroke();
   ellipse(c,bx,by,11,11,'#fff2d7');c.fillStyle='#e67561';c.fillRect(bx-9,by-8,18,8);
   if(state.biting){for(let i=0;i<3;i++){c.strokeStyle='#fff4bb';c.beginPath();c.arc(bx,by,19+i*9,0,Math.PI*2);c.stroke();}}
   path(c,cc=>{cc.moveTo(748,318);cc.lineTo(775,60);cc.lineTo(780,62);cc.lineTo(764,320)},'#896e45');
   text(c,'OHIO RIVER BACKWATER',30,38,18,'#ffefd1','left');text(c,state.biting?'BITE! REEL NOW!':'Cast · Wait · Reel',30,65,15,state.biting?'#f9ee80':'#d7e9d7','left');
 }
 function cook(c,t,state){sky(c,'#211c2e','#80624e');ellipse(c,803,58,31,31,'#ffe1a5');hill(c,197,'#4a584e',.2,30);hill(c,232,'#21392f',2.7,20);
   for(let i=0;i<20;i++)pine(c,((i*179)%W),278,.5+(i%3)*.4,'#1b3930');
   c.fillStyle='#695443';c.fillRect(0,277,W,43);c.fillStyle='#2e211c';ellipse(c,481,272,151,27,'#171614');
   const stoveX=480;
   for(let i=0;i<9;i++){const x=stoveX+(i-4)*11,wig=Math.sin(t/180+i*3)*8;c.beginPath();c.moveTo(x-10,281);c.quadraticCurveTo(x+wig-10,239-(i%3)*18,x+wig,220-(i%4)*15);c.quadraticCurveTo(x+wig+14,249,x+10,281);c.closePath();c.fillStyle=i%2?'#ffb048':'#ed643d';c.fill();}
   c.fillStyle='#141a21';c.beginPath();c.ellipse(480,230,123,41,0,0,Math.PI*2);c.fill();c.fillRect(363,230,234,25);
   c.fillStyle='#485360';c.beginPath();c.ellipse(480,229,113,28,0,0,Math.PI*2);c.fill();
   c.fillStyle='#c19a63';c.beginPath();c.ellipse(480,228,103,20,0,0,Math.PI*2);c.fill();
   for(let i=0;i<6;i++){let bx=418+i*22,by=223+Math.sin(t/350+i)*5;ellipse(c,bx,by,9,4,i%2?'#e7c46d':'#b3bc71');}
   c.strokeStyle='#c6dcd9';c.lineWidth=4;for(let i=0;i<5;i++){const x=416+i*32;c.globalAlpha=.3+.2*Math.sin(t/360+i);c.beginPath();c.moveTo(x,192);c.bezierCurveTo(x-20,170,x+24,143,x,115);c.stroke();}c.globalAlpha=1;
   for(let i=0;i<18;i++){const x=(i*389+37)%W,y=85+(i*41)%180;ellipse(c,x+Math.sin(t/1300+i)*6,y+Math.cos(t/900+i)*4,2,2,'#f6d98b');}
   text(c,'RIVERSIDE CAMPFIRE KITCHEN',25,38,18,'#fff0c4','left');text(c,'Harvest · Catch · Cook · Share',25,65,14,'#f0d5ae','left');
 }
 root.ValleyVisuals={render(canvas,kind,time,state={}){if(!canvas)return;const c=canvas.getContext('2d');if(!c)return;c.save();c.clearRect(0,0,W,H);if(kind==='hunt')hunt(c,time,state);else if(kind==='fish')fish(c,time,state);else cook(c,time,state);c.restore();}};
})(typeof globalThis==='object'?globalThis:this);
