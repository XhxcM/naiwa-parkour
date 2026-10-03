(function (root) {
  'use strict';
  class Runner {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      this.state = 'ready'; this.distance = 0; this.speed = 10;
      this.lane = 0; this.x = 0; this.height = 0; this.vy = 0;
      this.obstacles = []; this.nextRow = 48; this.reason = '';
    }
    start() { this.reset(); this.state = 'running'; }
    move(direction) {
      if (this.state === 'running') this.lane = Math.max(-1, Math.min(1, this.lane + direction));
    }
    jump() {
      if (this.state === 'running' && this.height === 0) this.vy = 8.5;
    }
    tick(delta) {
      if (this.state !== 'running') return;
      let remaining = Math.min(delta, 0.1);
      while (remaining > 0 && this.state === 'running') {
        const dt = Math.min(remaining, 1 / 120); remaining -= dt;
        this.speed = Math.min(20, 10 + this.distance / 150);
        this.distance += this.speed * dt;
        this.x += Math.max(-dt * 9, Math.min(dt * 9, this.lane - this.x));
        if (this.vy !== 0 || this.height > 0) {
          this.height = Math.max(0, this.height + this.vy * dt - 9 * dt * dt);
          this.vy -= 18 * dt;
          if (this.height === 0) this.vy = 0;
        }
        while (this.nextRow < this.distance + 110) {
          const safeLane = Math.floor(this.random() * 3) - 1;
          const blocked = [-1, 0, 1].filter(l => l !== safeLane);
          if (this.random() < 0.45) blocked.splice(Math.floor(this.random() * 2), 1);
          blocked.forEach(lane => this.obstacles.push({lane, z: this.nextRow, type: this.random() < 0.55 ? 'log' : 'rock'}));
          this.nextRow += 34 + this.random() * 10;
        }
        for (const obstacle of this.obstacles) {
          if (Math.abs(obstacle.z - this.distance) < 0.9 && Math.abs(obstacle.lane - this.x) < 0.57 &&
              (obstacle.type === 'rock' || this.height < 0.72)) {
            this.state = 'over'; this.reason = obstacle.type === 'rock' ? '遇到巨石，记得换道躲开' : '遇到倒木，试试提前跳跃'; break;
          }
        }
        this.obstacles = this.obstacles.filter(o => o.z > this.distance - 8);
      }
    }
  }
  root.Runner = Runner;
  if (typeof module !== 'undefined') module.exports = Runner;
})(typeof globalThis !== 'undefined' ? globalThis : window);
