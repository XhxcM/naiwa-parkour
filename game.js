'use strict';
const game = new Runner();
const canvas = document.querySelector('#scene');
const world = new ForestWorld(canvas);
const panel = document.querySelector('#panel');
const start = document.querySelector('#start');
const pause = document.querySelector('#pause');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const score = document.querySelector('#score');
const detail = document.querySelector('#detail');
const notice = document.querySelector('#notice');
let width=0,height=0,last=0,paused=false;
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;world.resize(width,height);}
new ResizeObserver(resize).observe(canvas);
function draw(){world.render(game,paused);}
function showOver(){panel.hidden=false;pause.hidden=true;title.textContent='跑得不错！';description.textContent=`这次穿过了 ${Math.floor(game.distance)} 米森林`;start.innerHTML='再跑一次 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7Z"/></svg>';detail.textContent=game.reason;notice.textContent='';}
function begin(){if(paused){paused=false;panel.hidden=true;pause.hidden=false;return;}game.start();panel.hidden=true;pause.hidden=false;notice.textContent='';last=performance.now();}
function pauseGame(){if(game.state!=='running'||paused)return;paused=true;panel.hidden=false;title.textContent='歇一小会';description.textContent='森林在等你，准备好了就继续';start.textContent='继续奔跑';detail.textContent='';pause.hidden=true;}
start.addEventListener('click',begin);pause.addEventListener('click',pauseGame);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});window.addEventListener('blur',pauseGame);
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space','Escape'].includes(e.code)){e.preventDefault();if(e.code==='Escape'){pauseGame();return;}if(e.repeat||paused||game.state!=='running')return;if(e.code==='ArrowLeft')game.move(-1);if(e.code==='ArrowRight')game.move(1);if(e.code==='ArrowUp'||e.code==='Space')game.jump();}});
let gesture=null;
canvas.addEventListener('pointerdown',e=>{if(e.isPrimary){gesture={x:e.clientX,y:e.clientY,id:e.pointerId,done:false};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(!gesture||gesture.id!==e.pointerId||gesture.done||paused)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.max(Math.abs(dx),Math.abs(dy))<26)return;gesture.done=true;if(Math.abs(dx)>Math.abs(dy))game.move(Math.sign(dx));else if(dy<0)game.jump();});
const release=()=>gesture=null;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
function frame(now){const delta=last?(now-last)/1000:0;last=now;const old=game.state;if(!paused)game.tick(delta);if(old==='running'&&game.state==='over')showOver();score.textContent=String(Math.floor(game.distance)).padStart(3,'0');draw(now);requestAnimationFrame(frame);}
resize();requestAnimationFrame(frame);
