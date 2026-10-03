const assert = require('node:assert/strict');
const Runner = require('./engine');
const run = (g,seconds) => {for(let t=0;t<seconds;t+=1/120)g.tick(1/120);};
const empty = () => {const g=new Runner();g.start();g.nextRow=1e8;return g;};
let g=empty();run(g,1);assert(g.distance>9);assert.equal(g.lane,0);
g.move(-1);g.move(-1);run(g,.2);assert.equal(g.x,-1);g.move(1);g.move(1);g.move(1);run(g,.3);assert.equal(g.x,1);
g=empty();g.jump();run(g,.2);const velocity=g.vy;g.jump();assert.equal(g.vy,velocity);g.move(-1);run(g,.2);assert.equal(g.x,-1);assert(g.height>0);run(g,1);assert.equal(g.height,0);
g=empty();g.obstacles=[{z:5,lane:0,type:'log'}];run(g,1);assert.equal(g.state,'over');
g=empty();g.obstacles=[{z:5,lane:0,type:'log'}];g.jump();run(g,1);assert.equal(g.state,'running');
g=empty();g.obstacles=[{z:5,lane:0,type:'rock'}];g.jump();run(g,1);assert.equal(g.state,'over');
g.start();assert.equal(g.distance,0);assert.equal(g.x,0);assert.equal(g.obstacles.length,0);assert.equal(g.state,'running');
g=empty();g.obstacles=[{z:5,lane:0,type:'rock'}];g.move(1);run(g,1);assert.equal(g.state,'running');
g=empty();g.distance=5000;run(g,1);assert.equal(g.speed,20);
for(let seed=1;seed<=100;seed++){let n=seed;g=new Runner(()=>((n=(n*1664525+1013904223)>>>0)/2**32));g.start();g.tick(.01);const rows=Object.groupBy(g.obstacles,o=>o.z);for(const row of Object.values(rows)){assert(row.length<=2);assert.equal(new Set(row.map(o=>o.lane)).size,row.length);}}
console.log('PASS: automatic running, lane limits, airborne movement, no double jump, landing, log collision/jump, rock collision, dodge, restart, speed cap, 100 obstacle seeds.');
