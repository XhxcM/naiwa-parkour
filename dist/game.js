'use strict';

const game = new Runner();
const canvas = document.querySelector('#scene');
const gameRoot = document.querySelector('#game');
const world = new ForestWorld(canvas);
const menu = document.querySelector('#menu');
const play = document.querySelector('#play');
const skinPrev = document.querySelector('#skin-prev');
const skinNext = document.querySelector('#skin-next');
const skinName = document.querySelector('#skin-name');
const skinDots = document.querySelector('#skin-dots');
const panel = document.querySelector('#panel');
const start = document.querySelector('#start');
const home = document.querySelector('#home');
const pause = document.querySelector('#pause');
const title = document.querySelector('#title');
const description = document.querySelector('#description');
const score = document.querySelector('#score');
const detail = document.querySelector('#detail');
const notice = document.querySelector('#notice');

const SKINS = ['奶蛙', '圣诞奶蛙', '睡衣奶蛙', '宇航员奶蛙', '探险家奶蛙'];
let selectedSkin = 0;
let last = 0;
let paused = false;
let startingAt = 0;
const START_TURN_MS = 720;

function resize() {
  const rect = canvas.getBoundingClientRect();
  world.resize(rect.width, rect.height);
}

function updateSkin(direction) {
  if (!gameRoot.classList.contains('menu-open')) return;
  selectedSkin = (selectedSkin + direction + SKINS.length) % SKINS.length;
  world.setSkin(selectedSkin);
  skinName.textContent = SKINS[selectedSkin];
  [...skinDots.children].forEach((dot, index) => dot.classList.toggle('active', index === selectedSkin));
}

function buildSkinDots() {
  for (let index = 0; index < SKINS.length; index += 1) {
    const dot = document.createElement('span');
    dot.classList.toggle('active', index === selectedSkin);
    skinDots.append(dot);
  }
}

function openMenu() {
  paused = false;
  startingAt = 0;
  game.reset();
  world.setMenuTurn(0);
  gameRoot.className = 'menu-open';
  menu.hidden = false;
  panel.hidden = true;
  pause.hidden = true;
  score.textContent = '000';
  play.disabled = false;
}

function beginFromMenu() {
  if (!gameRoot.classList.contains('menu-open') || startingAt) return;
  startingAt = performance.now();
  play.disabled = true;
  gameRoot.className = 'starting';
}

function finishStart(now) {
  game.start();
  world.setMenuTurn(1);
  gameRoot.className = 'playing';
  menu.hidden = true;
  pause.hidden = false;
  notice.textContent = '';
  startingAt = 0;
  last = now;
}

function showOver() {
  gameRoot.className = 'game-over';
  panel.hidden = false;
  pause.hidden = true;
  title.textContent = '跑得不错！';
  description.textContent = `这次穿过了 ${Math.floor(game.distance)} 米森林`;
  start.innerHTML = '重新开始 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7Z"/></svg>';
  detail.textContent = game.reason;
  notice.textContent = '';
}

function restart() {
  if (paused) {
    paused = false;
    panel.hidden = true;
    pause.hidden = false;
    gameRoot.className = 'playing';
    last = performance.now();
    return;
  }
  game.start();
  panel.hidden = true;
  pause.hidden = false;
  gameRoot.className = 'playing';
  notice.textContent = '';
  last = performance.now();
}

function pauseGame() {
  if (game.state !== 'running' || paused) return;
  paused = true;
  gameRoot.className = 'paused';
  panel.hidden = false;
  title.textContent = '歇一小会';
  description.textContent = '森林在等你，准备好了就继续';
  start.textContent = '继续游戏';
  detail.textContent = '';
  pause.hidden = true;
}

function act(code) {
  if (paused || game.state !== 'running') return;
  if (code === 'left') game.move(-1);
  if (code === 'right') game.move(1);
  if (code === 'jump') game.jump();
  if (code === 'roll') game.roll();
}

new ResizeObserver(resize).observe(canvas);
buildSkinDots();
world.setSkin(selectedSkin);
skinPrev.addEventListener('click', () => updateSkin(-1));
skinNext.addEventListener('click', () => updateSkin(1));
play.addEventListener('click', beginFromMenu);
start.addEventListener('click', restart);
home.addEventListener('click', openMenu);
pause.addEventListener('click', pauseGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
window.addEventListener('blur', pauseGame);

window.addEventListener('keydown', event => {
  if (gameRoot.classList.contains('menu-open')) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault();
      updateSkin(event.code === 'ArrowLeft' ? -1 : 1);
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault();
      beginFromMenu();
    }
    return;
  }
  const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'jump', Space: 'jump', ArrowDown: 'roll', KeyS: 'roll' };
  if (event.code === 'Escape') {
    event.preventDefault();
    pauseGame();
    return;
  }
  const action = keys[event.code];
  if (!action) return;
  event.preventDefault();
  if (!event.repeat) act(action);
});

let gesture = null;
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || gameRoot.classList.contains('menu-open')) return;
  gesture = { x: event.clientX, y: event.clientY, id: event.pointerId, done: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!gesture || gesture.id !== event.pointerId || gesture.done || paused) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
  gesture.done = true;
  if (Math.abs(dx) > Math.abs(dy)) act(dx < 0 ? 'left' : 'right');
  else act(dy < 0 ? 'jump' : 'roll');
});
const releaseGesture = () => { gesture = null; };
canvas.addEventListener('pointerup', releaseGesture);
canvas.addEventListener('pointercancel', releaseGesture);

function frame(now) {
  const delta = last ? (now - last) / 1000 : 0;
  last = now;
  if (startingAt) {
    const progress = Math.min(1, (now - startingAt) / START_TURN_MS);
    world.setMenuTurn(progress);
    if (progress === 1) finishStart(now);
  }
  const oldState = game.state;
  if (!paused && !startingAt) game.tick(delta);
  if (oldState === 'running' && game.state === 'over') showOver();
  score.textContent = String(Math.floor(game.distance)).padStart(3, '0');
  world.render(game, paused);
  requestAnimationFrame(frame);
}

resize();
openMenu();
requestAnimationFrame(frame);
