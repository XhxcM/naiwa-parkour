(function (root) {
  'use strict';

  const OBSTACLE_RULES = {
    fence: { dodges: ['jump'], reason: '撞上低栅栏了，下次上滑跳过去' },
    lowGate: { dodges: ['jump', 'roll'], reason: '矮通道栏可以跳过，也可以下滑翻滚穿过' },
    highGate: { dodges: ['roll'], reason: '高通道栏只能从下面穿过，记得下滑翻滚' },
    tree: { dodges: ['lane'], reason: '倒树挡住整条路，只能提前换道' }
  };

  class Runner {
    constructor(random = Math.random) {
      this.random = random;
      this.reset();
    }

    reset() {
      this.state = 'ready';
      this.distance = 0;
      this.elapsed = 0;
      this.speed = 15;
      this.lane = 0;
      this.x = 0;
      this.height = 0;
      this.vy = 0;
      this.jumpElapsed = 0;
      this.jumpDuration = 0.96;
      this.rollElapsed = 0;
      this.rollDuration = 0.78;
      this.obstacles = [];
      this.nextRow = 46;
      this.reason = '';
    }

    get isJumping() { return this.height > 0 || this.vy !== 0; }
    get isRolling() { return this.rollElapsed > 0; }
    get jumpProgress() { return this.isJumping ? Math.min(1, this.jumpElapsed / this.jumpDuration) : 0; }
    get rollProgress() { return this.isRolling ? Math.min(1, this.rollElapsed / this.rollDuration) : 0; }

    start() {
      this.reset();
      this.state = 'running';
    }

    move(direction) {
      if (this.state === 'running') {
        this.lane = Math.max(-1, Math.min(1, this.lane + direction));
      }
    }

    jump() {
      if (this.state === 'running' && !this.isJumping && !this.isRolling) {
        this.vy = 8.5;
        this.jumpElapsed = 0;
      }
    }

    roll() {
      if (this.state === 'running' && !this.isJumping && !this.isRolling) {
        this.rollElapsed = Number.EPSILON;
      }
    }

    spawnRow() {
      const safeLane = Math.floor(this.random() * 3) - 1;
      const blocked = [-1, 0, 1].filter(lane => lane !== safeLane);
      if (this.random() < 0.3) blocked.splice(Math.floor(this.random() * blocked.length), 1);
      const types = ['fence', 'lowGate', 'highGate', 'tree'];
      blocked.forEach(lane => {
        const type = types[Math.floor(this.random() * types.length)];
        this.obstacles.push({ lane, z: this.nextRow, type });
      });
      this.nextRow += 25 + this.random() * 8;
    }

    avoids(obstacle) {
      const dodges = OBSTACLE_RULES[obstacle.type]?.dodges || [];
      if (dodges.includes('jump') && this.height >= 0.72) return true;
      if (dodges.includes('roll') && this.isRolling) return true;
      return false;
    }

    tick(delta) {
      if (this.state !== 'running') return;
      let remaining = Math.min(delta, 0.1);

      while (remaining > 0 && this.state === 'running') {
        const dt = Math.min(remaining, 1 / 120);
        remaining -= dt;
        this.elapsed += dt;
        this.speed = Math.min(28, 15 + this.elapsed * 0.22);
        this.distance += this.speed * dt;
        this.x += Math.max(-dt * 9, Math.min(dt * 9, this.lane - this.x));

        if (this.isJumping) {
          this.jumpElapsed += dt;
          this.height = Math.max(0, this.height + this.vy * dt - 9 * dt * dt);
          this.vy -= 18 * dt;
          if (this.height === 0) {
            this.vy = 0;
            this.jumpElapsed = 0;
          }
        }

        if (this.isRolling) {
          this.rollElapsed += dt;
          if (this.rollElapsed >= this.rollDuration) this.rollElapsed = 0;
        }

        while (this.nextRow < this.distance + 110) this.spawnRow();

        for (const obstacle of this.obstacles) {
          const sameLane = Math.abs(obstacle.lane - this.x) < 0.57;
          const atPlayer = Math.abs(obstacle.z - this.distance) < 0.9;
          if (sameLane && atPlayer && !this.avoids(obstacle)) {
            this.state = 'over';
            this.reason = OBSTACLE_RULES[obstacle.type]?.reason || '撞到障碍物了';
            break;
          }
        }
        this.obstacles = this.obstacles.filter(obstacle => obstacle.z > this.distance - 8);
      }
    }
  }

  Runner.OBSTACLE_RULES = OBSTACLE_RULES;
  root.Runner = Runner;
  if (typeof module !== 'undefined') module.exports = Runner;
})(typeof globalThis !== 'undefined' ? globalThis : window);
