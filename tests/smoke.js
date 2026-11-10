/* Automated smoke test for Road to Turkey.
   This drives the real game in a headless, phone-sized Chromium with simulated touches.
   It is NOT the same as testing on a real phone. Run:  node tests/smoke.js
   Needs Playwright (npm i -D playwright) — only for testing, never for playing. */
const path = require('path');
const { chromium } = require('playwright');

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
const RUNNER = 'file://' + path.resolve(__dirname, '..', 'runner.html');
const SIZES = [[360, 640], [390, 844], [412, 915]];
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  async function open(w, h) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(URL);
    await page.waitForTimeout(300);
    return { ctx, page };
  }
  const st = page => page.evaluate(() => {
    const S = RTT.game.S;
    return { state: RTT.game.state, S: S && JSON.parse(JSON.stringify(S)), target: RTT.debug.target() };
  });
  const noHScroll = page => page.evaluate(() => {
    const vw = window.innerWidth;
    const over = [...document.querySelectorAll('button, .card, #hud, #dlg, .logo')].filter(el => {
      if (!el.offsetParent) return false;
      const r = el.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1;
    }).map(el => el.id || el.className);
    return { ok: document.documentElement.scrollWidth <= vw && document.body.scrollWidth <= vw && !over.length, over };
  });
  const smallTargets = page => page.evaluate(() => [...document.querySelectorAll('button, a.minor')].filter(el => {
    if (!el.offsetParent) return false; const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44;
  }).map(el => el.id || el.textContent.trim()));
  // play through the open dialogue; picks = which choice to take each time choices appear
  async function talk(page, picks = []) {
    let i = 0;
    for (let n = 0; n < 60; n++) {
      if (await page.evaluate(() => !RTT.dlg.open)) return;
      const count = await page.locator('#dlgChoices .choice').count();
      if (count) { await page.waitForTimeout(260); await page.locator('#dlgChoices .choice').nth(picks[i++] || 0).tap(); }
      else await page.tap('#dlgText');
      await page.waitForTimeout(40);
    }
    throw new Error('dialogue did not finish');
  }
  async function useThing(page, tx, ty, id, picks) {
    await page.evaluate(([x, y]) => RTT.debug.teleport(x, y), [tx, ty]);
    await page.waitForTimeout(120);
    const s = await st(page);
    if (s.target !== id) { check('stand next to ' + id, false, s.target); return; }
    await page.tap('#actBtn');
    await talk(page, picks);
  }

  // ---------- 1. layout on three phone sizes ----------
  console.log('Layout (title, HUD, dialogue) at phone sizes');
  for (const [w, h] of SIZES) {
    const { ctx, page } = await open(w, h);
    let r = await noHScroll(page); check(`${w}x${h} title: no horizontal overflow`, r.ok, r.over);
    check(`${w}x${h} title: touch targets >= 44px`, (await smallTargets(page)).length === 0, await smallTargets(page));
    const menuFits = await page.evaluate(() => { const r = document.getElementById('btnSettings').getBoundingClientRect(); return r.bottom <= window.innerHeight; });
    check(`${w}x${h} title: menu fits on screen`, menuFits);
    await page.tap('#btnPlay'); await page.waitForTimeout(250);
    r = await noHScroll(page); check(`${w}x${h} dialogue: no horizontal overflow`, r.ok, r.over);
    await talk(page);
    r = await noHScroll(page); check(`${w}x${h} in game: no horizontal overflow`, r.ok, r.over);
    check(`${w}x${h} in game: touch targets >= 44px`, (await smallTargets(page)).length === 0, await smallTargets(page));
    await ctx.close();
  }

  // ---------- 2. full playthrough ----------
  console.log('Title screen');
  let { ctx, page } = await open(390, 844);
  check('Play, Continue, Settings buttons exist', await page.evaluate(() => ['btnPlay', 'btnContinue', 'btnSettings'].every(id => !!document.getElementById(id).offsetParent)));
  check('Continue disabled with no save', await page.evaluate(() => document.getElementById('btnContinue').disabled));
  await page.tap('#btnSettings'); await page.tap('#setFast'); await page.tap('#setSound');
  check('settings toggles change and persist', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem(RTT.SETTINGS_KEY)); return s.fastText === true && s.sound === false; }));
  await page.tap('#btnSetBack');

  console.log('Protagonist');
  const stages = await page.evaluate(() => {
    const A = RTT.art, out = [];
    out.push([90, 70, 50, 30, 10].map(A.stageOf).join(''));
    for (const view of ['face', 'back']) {
      const seen = new Set();
      for (let s = 1; s <= 5; s++) {
        const c = document.createElement('canvas'); c.width = c.height = 120; const x = c.getContext('2d');
        x.translate(60, 70); if (view === 'face') A.face(x, { who: 'barry', stage: s, expr: 'neutral', t: 1 }); else A.headBack(x, { stage: s });
        const d = x.getImageData(0, 0, 120, 120).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i]) >>> 0;
        seen.add(h);
      }
      out.push(seen.size);
    }
    return out;
  });
  check('hair value maps to stages 1-5', stages[0] === '12345', stages[0]);
  check('five visually distinct front-view hair stages', stages[1] === 5, stages[1]);
  check('five visually distinct back-view hair stages', stages[2] === 5, stages[2]);

  console.log('Starting Level 1');
  await page.tap('#btnPlay'); await page.waitForTimeout(200);
  check('opening dialogue starts', (await st(page)).state === 'dialogue');
  await talk(page);
  let s = await st(page);
  check('player has control after intro', s.state === 'play');
  check('HUD shows Hair, Confidence and Turkey Fund', await page.evaluate(() => !document.getElementById('hud').hidden && ['txtStage', 'txtConf', 'txtFund'].every(id => document.getElementById(id).textContent.length > 0)));
  check('mission tracker shows first objective', (await page.textContent('#missionNow')).includes('mirror'));

  console.log('Touch movement and collision');
  const cdp = await ctx.newCDPSession(page);
  async function drag(dx, dy, ms) {
    const x = 90, y = 700;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
    await page.waitForTimeout(ms);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
  }
  const p0 = (await st(page)).S;
  await drag(60, 0, 500);
  const p1 = (await st(page)).S;
  check('dragging the stick right moves Barry right', p1.x > p0.x + 30, [p0.x, p1.x]);
  check('Barry faces the way he walks', p1.dir === 'right', p1.dir);
  await drag(0, -60, 2500);
  const p2 = (await st(page)).S;
  check('walking up stops when Barry bumps into the bed/wall', p2.y < p1.y - 10 && p2.y >= 48 && await page.evaluate(() => !RTT.debug.hits(RTT.game.S.x, RTT.game.S.y)), p2.y);
  await drag(-60, 0, 4000);
  const p3 = (await st(page)).S;
  check('walking left is blocked by furniture/walls (stays inside the bedroom)', p3.x > 6 * 48 && p3.x < p2.x, p3.x);

  console.log('Level layout');
  const reach = await page.evaluate(() => {
    RTT.debug.teleport(8.6, 3.9);
    const d = RTT.debug, locked = {}, open = {};
    ['mirror', 'wardrobe', 'nightstand', 'laundry', 'sofa', 'jar', 'cabinet', 'door'].forEach(id => locked[id] = d.canReach(id, false));
    locked.moira = d.canReach('moira', false);
    ['gary', 'bin', 'moira', 'shelfM'].forEach(id => open[id] = d.canReach(id, true));
    return { locked, open };
  });
  check('every room and searchable spot in the flat is reachable', Object.entries(reach.locked).every(([k, v]) => k === 'moira' ? true : v), reach.locked);
  check('pharmacy is NOT reachable while the front door is locked', reach.locked.moira === false);
  check('street and pharmacy reachable once the door is open', Object.values(reach.open).every(Boolean), reach.open);
  const c0 = await page.evaluate(() => RTT.debug.cam());
  await page.evaluate(() => RTT.debug.teleport(21, 9)); await page.waitForTimeout(100);
  const c1 = await page.evaluate(() => RTT.debug.cam());
  await page.evaluate(() => { RTT.game.S.missions = {}; RTT.debug.teleport(8.6, 3.9); });   // undo the test teleport's side effects
  check('camera follows Barry across the map', c1.x > c0.x + 300, [c0.x, c1.x]);

  console.log('Objectives, dialogue, inventory');
  await page.evaluate(() => RTT.debug.teleport(6.5, 11.9)); await page.waitForTimeout(120);
  await page.tap('#actBtn'); await page.waitForTimeout(100);
  check('front door refuses before the mirror', await page.evaluate(() => RTT.dlg.open && !RTT.game.S.flags.doorOpen));
  await talk(page);
  await useThing(page, 2.5, 2.0, 'mirror', [0, 0]);          // deny everything, start a fund
  s = await st(page);
  check('mirror mission completes', s.S.missions.mirror === 1);
  check('branching choices change Confidence (50 +5 +10)', s.S.conf === 65, s.S.conf);
  await useThing(page, 2.5, 2.0, 'mirror', [1]);             // tug another
  s = await st(page);
  check('a different branch costs Hair and changes the hair stage', s.S.hair === 56 && await page.evaluate(() => RTT.art.stageOf(RTT.game.S.hair) === 3), s.S.hair);
  await useThing(page, 9.6, 1.9, 'nightstand');
  await useThing(page, 2.4, 9.4, 'sofa');
  check('searching finds cash for the Turkey Fund', (await st(page)).S.cash === 32, (await st(page)).S.cash);
  await page.evaluate(() => RTT.debug.teleport(6.5, 11.9)); await page.waitForTimeout(120);
  await page.tap('#actBtn'); await talk(page);
  check('front door refuses below €40', !(await st(page)).S.flags.doorOpen);
  await useThing(page, 12.4, 8.0, 'jar');
  s = await st(page);
  check('€40 mission completes', s.S.cash === 42 && s.S.missions.cash === 1, s.S.cash);
  await page.evaluate(() => RTT.debug.teleport(7.4, 2.5)); await page.waitForTimeout(200);
  check('walking over loose change picks it up', (await st(page)).S.cash === 44, (await st(page)).S.cash);
  await useThing(page, 6.8, 2.0, 'wardrobe');
  s = await st(page);
  check('hat goes into the inventory, optional mission ticks', s.S.inv.beanie === 1 && s.S.missions.hat === 1);
  await useThing(page, 3.5, 1.7, 'cabinet');
  await page.tap('#btnBag');
  check('bag lists hat and product', await page.locator('#bagList .item').count() === 2);
  await page.locator('#bagList .item button', { hasText: 'Wear' }).tap();
  check('wearing a hat from the bag works', (await st(page)).S.hat === 'beanie');
  await page.locator('#bagList .item button', { hasText: 'Use' }).tap();
  s = await st(page);
  check('using a product applies its effect and uses it up', s.S.conf === 70 && s.S.inv.fibers_old === 0, s.S.conf);   // 65 -3 (tug) +8
  await page.tap('#btnBagBack');
  await page.tap('#missionBtn');
  const ml = [await page.locator('#missionList li.done').count(), await page.locator('#missionList li').count(), await page.evaluate(() => document.getElementById('missionList').hidden)];
  check('mission list shows ticked and open objectives', ml[0] === 3 && ml[1] === 6 && ml[2] === false, ml);
  await page.tap('#missionBtn');

  console.log('Saving');
  await page.evaluate(() => RTT.game.save());
  await page.reload(); await page.waitForTimeout(300);
  check('Continue is enabled after a reload', await page.evaluate(() => !document.getElementById('btnContinue').disabled));
  await page.tap('#btnContinue'); await page.waitForTimeout(200);
  s = await st(page);
  check('Continue restores cash, hat, missions and hair', s.state === 'play' && s.S.cash === 44 && s.S.hat === 'beanie' && s.S.missions.mirror === 1 && s.S.hair === 56, s.S);

  console.log('Street and pharmacy');
  await page.evaluate(() => RTT.debug.teleport(6.5, 11.9)); await page.waitForTimeout(120);
  await page.tap('#actBtn'); await talk(page);
  check('front door opens once objectives are met', (await st(page)).S.flags.doorOpen === 1);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
  s = await st(page);
  check('Barry walks out through the door; mission ticks', s.S.y > 13 * 48 && s.S.missions.out === 1, s.S.y);
  await page.evaluate(() => RTT.debug.teleport(17, 14.3)); await page.waitForTimeout(3500);
  check('wind does nothing while wearing a hat', (await st(page)).S.hair === 56, (await st(page)).S.hair);
  await page.evaluate(() => { RTT.game.S.hat = null; }); await page.waitForTimeout(4500);
  s = await st(page);
  check('wind costs Hair and Confidence without a hat', s.S.hair < 56 && s.S.conf < 70, [s.S.hair, s.S.conf]);
  await useThing(page, 11.6, 14.2, 'gary', [1, 0]);           // ask his secret -> gutters
  await useThing(page, 21, 6.6, 'moira', [2, 0]);             // own it -> buy minoxidil (fiver off)
  s = await st(page);
  check('pharmacy purchase spends cash and adds the product', s.S.inv.minoxidil === 1 && s.S.cash === 19, s.S.cash);
  check('level completes', s.state === 'done' && s.S.done === true && s.S.missions.buy === 1, s.state);
  check('level-complete screen is shown with stats', await page.evaluate(() => document.getElementById('scrDone').classList.contains('on') && document.getElementById('dnFund').textContent === '€19'));
  let r = await noHScroll(page); check('complete screen: no horizontal overflow', r.ok, r.over);

  console.log('Pause, mute, restart, defeat');
  await page.tap('#btnReplay'); await page.waitForTimeout(150); await talk(page);
  s = await st(page);
  check('replay starts a fresh level', s.state === 'play' && s.S.cash === 0 && !s.S.missions.mirror);
  await page.tap('#btnPause');
  check('pause button pauses', (await st(page)).state === 'pause');
  const frozen = (await st(page)).S.x; await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
  check('nothing moves while paused', (await st(page)).S.x === frozen);
  await page.tap('#btnResume');
  check('resume returns to play', (await st(page)).state === 'play');
  const snd = await page.evaluate(() => RTT.settings.sound);
  await page.tap('#btnMute');
  check('mute button toggles sound', await page.evaluate(() => RTT.settings.sound) === !snd);
  await page.evaluate(() => { RTT.game.S.cash = 99; });
  await page.tap('#btnPause'); await page.tap('#btnRestart'); await page.tap('#cfYes'); await page.waitForTimeout(150); await talk(page);
  check('restart resets the level', (await st(page)).S.cash === 0);
  await page.evaluate(() => { RTT.game.S.conf = 4; RTT.game.fx({ conf: -5 }); }); await page.waitForTimeout(100);
  check('confidence 0 shows a defeat screen with a joke', (await st(page)).state === 'defeat' && (await page.textContent('#defMsg')).length > 10);
  r = await noHScroll(page); check('defeat screen: no horizontal overflow', r.ok, r.over);
  await page.tap('#btnRetry'); await page.waitForTimeout(150); await talk(page);
  await page.evaluate(() => { RTT.game.S.hair = 3; RTT.game.fx({ hair: -6 }); }); await page.waitForTimeout(100);
  check('hair 0 shows the other defeat screen', (await st(page)).state === 'defeat' && (await page.textContent('#defTitle')).length > 3);
  await page.tap('#btnDefTitle');
  check('back to title from defeat', (await st(page)).state === 'title' && await page.evaluate(() => document.getElementById('scrTitle').classList.contains('on')));

  console.log('Original runner still works');
  await page.goto(RUNNER); await page.waitForTimeout(300);
  await page.tap('#startBtn'); await page.waitForTimeout(600);
  check('Street Run starts', await page.evaluate(() => window.__game.state === 'play'));

  check('no JavaScript errors anywhere', errors.length === 0, errors.slice(0, 5));
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
