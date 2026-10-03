const assert = require('node:assert/strict');
const Runner = require('./engine');

const run = (game, seconds) => {
  for (let time = 0; time < seconds; time += 1 / 120) game.tick(1 / 120);
};
const empty = () => {
  const game = new Runner();
  game.start();
  game.nextRow = 1e8;
  return game;
};
const encounter = (type, action) => {
  const game = empty();
  game.obstacles = [{ z: 5, lane: 0, type }];
  if (action) game[action]();
  run(game, 1);
  return game.state;
};

let game = empty();
run(game, 1);
assert(game.distance > 14);
assert(game.speed > 15);
assert.equal(game.lane, 0);
game.move(-1);
game.move(-1);
run(game, 0.2);
assert.equal(game.x, -1);
game.move(1);
game.move(1);
game.move(1);
run(game, 0.3);
assert.equal(game.x, 1);

game = empty();
game.jump();
run(game, 0.2);
const velocity = game.vy;
game.jump();
game.roll();
assert.equal(game.vy, velocity);
assert.equal(game.isRolling, false);
game.move(-1);
run(game, 0.2);
assert.equal(game.x, -1);
assert(game.height > 0);
run(game, 1);
assert.equal(game.height, 0);

game = empty();
game.roll();
assert.equal(game.isRolling, true);
game.jump();
assert.equal(game.isJumping, false);
run(game, 1);
assert.equal(game.isRolling, false);

assert.equal(encounter('fence'), 'over');
assert.equal(encounter('fence', 'jump'), 'running');
assert.equal(encounter('fence', 'roll'), 'over');
assert.equal(encounter('lowGate', 'jump'), 'running');
assert.equal(encounter('lowGate', 'roll'), 'running');
assert.equal(encounter('highGate', 'jump'), 'over');
assert.equal(encounter('highGate', 'roll'), 'running');
assert.equal(encounter('tree', 'jump'), 'over');
assert.equal(encounter('tree', 'roll'), 'over');

game = empty();
game.obstacles = [{ z: 5, lane: 0, type: 'tree' }];
game.move(1);
run(game, 1);
assert.equal(game.state, 'running');
game.start();
assert.equal(game.distance, 0);
assert.equal(game.x, 0);
assert.equal(game.obstacles.length, 0);
game.nextRow = 1e8;
run(game, 70);
assert.equal(game.speed, 28);
const cappedSpeed = game.speed;
run(game, 10);
assert.equal(game.speed, cappedSpeed);

for (let seed = 1; seed <= 100; seed += 1) {
  let value = seed;
  game = new Runner(() => ((value = (value * 1664525 + 1013904223) >>> 0) / 2 ** 32));
  game.start();
  game.tick(0.01);
  const rows = Object.groupBy(game.obstacles, obstacle => obstacle.z);
  const rowPositions = Object.keys(rows).map(Number).sort((a, b) => a - b);
  for (const row of Object.values(rows)) {
    assert(row.length <= 2);
    assert.equal(new Set(row.map(obstacle => obstacle.lane)).size, row.length);
    assert(row.every(obstacle => Runner.OBSTACLE_RULES[obstacle.type]));
  }
  for (let index = 1; index < rowPositions.length; index += 1) {
    const gap = rowPositions[index] - rowPositions[index - 1];
    assert(gap >= 22 && gap <= 29);
  }
}

console.log('PASS: running, lane limits, jump/spin state, roll state, four obstacle rules, dodge, restart, speed cap, 100 generated courses.');
