const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1086, height: 1448 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4173');
  await page.waitForFunction(() => world.renderer.info.render.calls > 0);

  assert.equal(await page.title(), '奶蛙跑酷');
  assert(await page.getByRole('button', { name: '开始游戏' }).isVisible());
  assert(Math.abs(await page.evaluate(() => world.player.rotation.y) - Math.PI) < 0.1);
  assert(await page.evaluate(() => {
    const titleBox = document.querySelector('.brand').getBoundingClientRect();
    const gameBox = document.querySelector('#game').getBoundingClientRect();
    return Math.abs((titleBox.left + titleBox.width / 2) - (gameBox.left + gameBox.width / 2)) < 1;
  }));
  assert(await page.evaluate(() => {
    let voxelCount = 0;
    world.player.traverse(object => { if (object.isInstancedMesh) voxelCount += object.count; });
    return voxelCount > 300;
  }));

  const skinNames = ['奶蛙', '圣诞奶蛙', '睡衣奶蛙', '宇航员奶蛙', '探险家奶蛙'];
  for (let index = 0; index < skinNames.length; index += 1) {
    if (index > 0) await page.getByRole('button', { name: '下一套皮肤' }).click();
    assert.equal(await page.locator('#skin-name').innerText(), skinNames[index]);
    assert.equal(await page.evaluate(() => world.player.userData.skins.findIndex(skin => skin.visible)), index);
    await page.screenshot({ path: `design/skin-${index + 1}.png` });
  }

  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.waitForTimeout(260);
  assert.equal(await page.evaluate(() => game.state), 'ready');
  const turningAngle = await page.evaluate(() => world.player.rotation.y);
  assert(turningAngle > 0.1 && turningAngle < Math.PI - 0.1);
  await page.waitForFunction(() => game.state === 'running');
  assert.equal(await page.locator('#menu').isVisible(), false);

  const baseScale = await page.evaluate(() => world.player.userData.visual.scale.toArray());
  assert.deepEqual(baseScale, [0.78, 0.78, 0.78]);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => game.x), -1);

  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(180);
  assert(await page.evaluate(() => game.height > 0 && game.jumpProgress > 0));
  assert(Math.abs(await page.evaluate(() => world.player.userData.visual.rotation.y)) > 0.2);
  assert.deepEqual(await page.evaluate(() => world.player.userData.visual.scale.toArray()), baseScale);
  await page.waitForTimeout(900);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => game.isRolling), true);
  assert(Math.abs(await page.evaluate(() => world.player.userData.visual.rotation.x)) > 0.2);
  assert.deepEqual(await page.evaluate(() => world.player.userData.visual.scale.toArray()), baseScale);
  await page.waitForTimeout(800);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => game.x), 0);
  await page.getByRole('button', { name: '暂停游戏' }).click();
  assert(await page.getByRole('button', { name: '继续游戏' }).isVisible());
  assert(await page.getByRole('button', { name: '返回主界面' }).isVisible());
  await page.screenshot({ path: 'design/pause-menu.png' });
  const distance = await page.evaluate(() => game.distance);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => game.distance), distance);
  await page.getByRole('button', { name: '返回主界面' }).click();
  assert(await page.getByRole('button', { name: '开始游戏' }).isVisible());
  assert.equal(await page.evaluate(() => game.state), 'ready');

  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.waitForFunction(() => game.state === 'running');
  await page.evaluate(() => { game.obstacles = [{ lane: game.lane, z: game.distance + 5, type: 'tree' }]; });
  await page.getByRole('button', { name: '重新开始' }).waitFor();
  assert(await page.getByRole('button', { name: '返回主界面' }).isVisible());
  await page.screenshot({ path: 'design/game-over-menu.png' });
  await page.getByRole('button', { name: '重新开始' }).click();
  assert(await page.evaluate(() => game.distance < 3 && game.lane === 0));
  await page.evaluate(() => { game.obstacles = [{ lane: game.lane, z: game.distance + 5, type: 'tree' }]; });
  await page.getByRole('button', { name: '返回主界面' }).waitFor();
  await page.getByRole('button', { name: '返回主界面' }).click();
  assert(await page.getByRole('button', { name: '开始游戏' }).isVisible());

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const phone = await mobile.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto('http://localhost:4173');
  await phone.waitForFunction(() => world.renderer.info.render.calls > 0);
  assert(await phone.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  await phone.screenshot({ path: 'design/menu-mobile.png' });
  await phone.getByRole('button', { name: '下一套皮肤' }).click();
  assert.equal(await phone.locator('#skin-name').innerText(), '圣诞奶蛙');
  await phone.getByRole('button', { name: '开始游戏' }).click();
  await phone.waitForFunction(() => game.state === 'running');
  const cdp = await mobile.newCDPSession(phone);

  async function swipe(x, y, dx, dy) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  await swipe(195, 650, -90, 0);
  await phone.waitForTimeout(180);
  assert.equal(await phone.evaluate(() => game.x), -1);
  await swipe(100, 650, 90, 0);
  await phone.waitForTimeout(180);
  assert.equal(await phone.evaluate(() => game.x), 0);
  await swipe(195, 650, 0, -110);
  await phone.waitForTimeout(150);
  assert(await phone.evaluate(() => game.height > 0));
  await phone.waitForTimeout(950);
  await swipe(195, 540, 0, 110);
  await phone.waitForTimeout(120);
  assert.equal(await phone.evaluate(() => game.isRolling), true);
  assert.deepEqual(await phone.evaluate(() => world.player.userData.visual.scale.toArray()), [0.78, 0.78, 0.78]);
  await phone.screenshot({ path: 'design/playing.png' });
  await phone.setViewportSize({ width: 844, height: 390 });
  assert(await phone.evaluate(() => document.documentElement.scrollWidth === innerWidth));

  assert.deepEqual(errors, []);
  console.log('PASS: five-skin menu, turn-to-run transition, fixed character scale, jump spin, roll, pause/game-over home and restart flows, mobile swipes, responsive layouts, no JS errors.');
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
