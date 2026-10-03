const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 480, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173');
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.waitForFunction(() => game.state === 'running');
  await page.evaluate(() => {
    game.distance = 35;
    game.nextRow = 1000;
    game.obstacles = [
      { lane: -1, z: 46, type: 'fence' },
      { lane: 0, z: 50, type: 'lowGate' },
      { lane: 1, z: 54, type: 'highGate' },
      { lane: -1, z: 63, type: 'tree' }
    ];
  });
  await page.waitForTimeout(180);
  await page.screenshot({ path: 'design/scene-preview.png' });

  await page.evaluate(() => {
    paused = true;
    game.height = 1.75;
    game.vy = 1;
    game.jumpElapsed = game.jumpDuration * 0.48;
  });
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'design/jump-preview.png' });

  await page.evaluate(() => {
    game.height = 0;
    game.vy = 0;
    game.jumpElapsed = 0;
    game.rollElapsed = game.rollDuration * 0.42;
  });
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'design/roll-preview.png' });
  await browser.close();
})();
