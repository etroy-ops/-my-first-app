/* Road to Turkey — game: state, movement, collision, camera, interaction, saving, rendering, input. */
(function (R) {
  'use strict';
  var $ = R.$, A = R.art, L = R.level1, U = R.ui, D = R.dlg, T = R.TILE;
  var G = R.game = { state: 'title', S: null, world: false, pendingEnd: null };

  var cv = $('cv'), ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, scale = 1, VW = 400, VH = 0;
  var cam = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, keys = {}, stick = null;
  var walk = 0, moving = false, inv = 0, pops = [], parts = [], target = null, saveT = 0;
  var mapCv = null, cols = [], gusts = [], hudH = 150, grain = null, things = [];

  // ---------- state ----------
  function fresh() {
    return {
      v: 1, level: 1, x: L.start.x * T, y: L.start.y * T, dir: 'down',
      hair: 62, conf: 50, cash: 0, inv: {}, hat: null,
      flags: {}, missions: {}, got: {}, done: false,
    };
  }
  function resetRuntime() {
    vel.x = vel.y = 0; walk = 0; moving = false; inv = 0; pops = []; parts = []; target = null; stick = null; keys = {};
    gusts = L.gusts.map(function (g) { return { x: g.x * T, y: g.y * T, v: g.v, min: g.min * T, max: g.max * T }; });
    G.pendingEnd = null;
  }
  G.hasSave = function () { var s = R.store.get(R.SAVE_KEY); return !!(s && s.v === 1); };
  G.save = function () {
    var S = G.S; if (!S || S.hair <= 0 || S.conf <= 0) return;
    S.x = Math.round(S.x); S.y = Math.round(S.y);
    R.store.set(R.SAVE_KEY, S);
  };
  G.deleteSave = function () { R.store.del(R.SAVE_KEY); };

  // ---------- collision ----------
  function tileSolid(tx, ty) {
    var ch = (L.rows[ty] || '')[tx];
    if (ch === undefined || ch === '#' || ch === ' ' || ch === '~') return true;
    if (ch === 'F') return !G.S.flags.doorOpen;
    return false;
  }
  // Barry's feet are a 20 x 10 box; (x, y) is the middle of its bottom edge.
  function hits(x, y) {
    var x0 = x - 10, x1 = x + 9.99, y0 = y - 10, y1 = y - 0.01, tx, ty, i, c;
    for (ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++)
      for (tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++)
        if (tileSolid(tx, ty)) return true;
    for (i = 0; i < cols.length; i++) {
      c = cols[i];
      if (x1 > c.x && x0 < c.x + c.w && y1 > c.y && y0 < c.y + c.h) return true;
    }
    return false;
  }
  function rectDist(px, py, r) {
    var dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.hypot(dx, dy);
  }
  function buildWorld() {
    if (mapCv) return;
    mapCv = A.buildMap(L);
    cols = [];
    L.props.forEach(function (p) { if (!p.flat) cols.push({ x: p.x * T, y: p.y * T, w: p.w * T, h: p.h * T }); });
    L.npcs.forEach(function (n) { if (!n.ghost) cols.push({ x: (n.x - 0.3) * T, y: (n.y - 0.3) * T, w: 0.6 * T, h: 0.35 * T }); });
    things = L.things.map(function (t) {
      return { def: t, x: t.rect[0] * T, y: t.rect[1] * T, w: t.rect[2] * T, h: t.rect[3] * T };
    });
  }

  // ---------- effects (used by dialogue, items, hazards) ----------
  G.fx = function (fx) {
    var S = G.S; if (!fx || !S) return;
    if (fx.hair) {
      S.hair = R.clamp(S.hair + fx.hair, 0, 100);
      U.toast((fx.hair > 0 ? '+' : '−') + Math.abs(fx.hair) + '% Hair', fx.hair > 0 ? 'good' : 'bad');
      if (fx.hair < 0) { strands(7); R.sfx.bad(); R.buzz(60); }
    }
    if (fx.conf) {
      S.conf = R.clamp(S.conf + fx.conf, 0, 100);
      U.toast((fx.conf > 0 ? '+' : '−') + Math.abs(fx.conf) + ' Confidence', fx.conf > 0 ? 'good' : 'bad');
      if (fx.conf < 0 && !fx.hair) R.sfx.bad();
    }
    if (fx.cash) {
      S.cash = Math.max(0, S.cash + fx.cash);
      U.toast((fx.cash > 0 ? '+' : '−') + R.euro(Math.abs(fx.cash)) + (fx.cash > 0 ? ' to the Turkey Fund' : ''), 'cash');
      R.sfx.cash();
    }
    if (fx.item) {
      S.inv[fx.item] = (S.inv[fx.item] || 0) + 1;
      U.toast('Got: ' + L.items[fx.item].name, 'good'); R.sfx.item(); R.buzz(20);
    }
    if (fx.flag) S.flags[fx.flag] = 1;
    if (fx.hatOff && S.hat) { S.hat = null; U.toast('Hat off'); }
    if (fx.mission) G.mission(fx.mission);
    if (fx.end) G.pendingEnd = fx.end;
    checkMissions();
    U.sync();
    if (S.hair <= 0) G.defeat('hair'); else if (S.conf <= 0) G.defeat('conf');
  };
  G.mission = function (id) {
    var S = G.S; if (S.missions[id]) return;
    S.missions[id] = 1;
    var m = L.missions.filter(function (q) { return q.id === id; })[0];
    U.toast('✔ Done: ' + m.t, 'good'); R.sfx.good(); R.buzz([20, 40, 20]);
    U.sync();
  };
  function checkMissions() {
    var S = G.S;
    if (S.cash >= 40 && !S.missions.cash) G.mission('cash');
    if (S.y > 12.95 * T && !S.missions.out) G.mission('out');
    if (S.x > 17 * T && S.y < 12 * T && !S.missions.pharm) G.mission('pharm');
  }
  function strands(n) {
    var S = G.S;
    for (var i = 0; i < n; i++) parts.push({ x: S.x + (Math.random() - 0.5) * 16, y: S.y - 74, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 50, r: Math.random() * 6, t: 0, life: 0.7 + Math.random() * 0.5 });
  }
  function pop(text, col) { pops.push({ x: G.S.x, y: G.S.y - 88, text: text, col: col || '#e3c659', t: 0 }); }

  // ---------- flow ----------
  function enterWorld() {
    buildWorld();
    G.world = true;
    U.closeAll(); D.abort();
    U.showGameUI(true);
    U.resetMissionFlash(); U.sync();
    hudH = $('hud').offsetHeight || 150;
    snapCam();
  }
  G.newGame = function () {
    G.S = fresh(); resetRuntime();
    enterWorld();
    G.state = 'play';
    G.save();
    say('intro1');
  };
  G.continueGame = function () {
    var s = R.store.get(R.SAVE_KEY);
    if (!s || s.v !== 1) { G.newGame(); return; }
    var f = fresh();
    for (var k in f) if (s[k] === undefined) s[k] = f[k];
    G.S = s; resetRuntime();
    enterWorld();
    if (hits(s.x, s.y)) { s.x = f.x; s.y = f.y; snapCam(); }
    if (s.done) { G.state = 'done'; U.showGameUI(false); U.showDone(); }
    else { G.state = 'play'; U.toast('Progress loaded', 'good'); }
  };
  G.pause = function () { if (G.state !== 'play') return; G.state = 'pause'; stick = null; U.open('scrPause'); };
  G.resume = function () { if (G.state !== 'pause') return; U.closeAll(); G.state = 'play'; };
  G.openBag = function () { if (G.state !== 'play') return; G.state = 'bag'; stick = null; U.renderBag(); U.open('scrBag'); };
  G.closeBag = function () { U.close('scrBag'); if (G.state === 'bag') G.state = 'play'; };
  G.quit = function (noSave) {
    if (!noSave) G.save();
    D.abort(); U.closeAll(); U.showGameUI(false);
    G.world = false; G.state = 'title';
    U.open('scrTitle'); U.refreshTitle();
  };
  G.defeat = function (kind) {
    if (G.state === 'defeat') return;
    D.abort(); G.state = 'defeat'; stick = null;
    U.showGameUI(false); U.showDefeat(kind);
    R.sfx.lose(); R.buzz(250);
  };
  G.complete = function () {
    var S = G.S; S.done = true; G.save();
    G.state = 'done'; U.showGameUI(false); U.showDone();
    R.sfx.win(); R.buzz([40, 60, 40, 60, 140]);
  };

  function say(id) {
    G.state = 'dialogue'; stick = null; vel.x = vel.y = 0; moving = false;
    $('actBtn').hidden = true; $('missionList').hidden = true;
    D.start(id);
  }
  G.dialogueEnded = function () {
    if (G.state !== 'dialogue') return;
    G.state = 'play'; $('actBtn').hidden = false;
    if (G.pendingEnd === 'complete') { G.pendingEnd = null; G.complete(); return; }
    G.save();
  };

  G.act = function () {
    if (G.state !== 'play' || !target) return;
    var d = target.def, S = G.S;
    R.sfx.ui();
    if (d.act === 'frontDoor') {
      if (!S.flags.mirror) return say('door_a');
      if (S.cash < 40) return say('door_b');
      S.flags.doorOpen = 1; R.sfx.door(); U.toast('Front door unlocked', 'good');
      var owns = Object.keys(L.items).some(function (k) { return L.items[k].type === 'hat' && S.inv[k]; });
      return say(!owns ? 'door_c' : !S.hat ? 'door_d' : 'door_e');
    }
    say(typeof d.say === 'function' ? d.say(S) : d.say);
  };

  G.toggleHat = function (id) {
    var S = G.S; S.hat = S.hat === id ? null : id;
    U.toast(S.hat ? 'Wearing: ' + L.items[id].name : 'Hat off', S.hat ? 'good' : ''); R.sfx.item();
    U.renderBag(); G.save();
  };
  G.useItem = function (id) {
    var S = G.S, it = L.items[id]; if (!S.inv[id] || it.type !== 'product') return;
    S.inv[id]--;
    G.fx(it.fx); U.toast(it.line);
    U.renderBag(); G.save();
  };

  // ---------- update ----------
  function update(dt) {
    var S = G.S, ix, iy, m;
    if (stick) { ix = stick.dx; iy = stick.dy; }
    else { ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0); iy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0); }
    m = Math.hypot(ix, iy);
    if (m > 1) { ix /= m; iy /= m; m = 1; }
    if (m < 0.14) { ix = iy = 0; m = 0; }
    var ease = Math.min(1, dt * 13);
    vel.x += (ix * 150 - vel.x) * ease; vel.y += (iy * 150 - vel.y) * ease;

    // move one axis at a time so Barry slides along walls instead of sticking
    var nx = S.x + vel.x * dt, ny = S.y + vel.y * dt;
    if (!hits(nx, S.y)) S.x = nx; else vel.x = 0;
    if (!hits(S.x, ny)) S.y = ny; else vel.y = 0;

    var sp = Math.hypot(vel.x, vel.y);
    moving = sp > 14;
    if (moving) walk += dt * (sp / 150) * 11;
    if (m > 0.2) S.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');

    // loose change
    L.pickups.forEach(function (p) {
      if (S.got[p.id]) return;
      if (Math.hypot(p.x * T - S.x, p.y * T - (S.y - 5)) < 24) {
        S.got[p.id] = 1; S.cash += p.v;
        pop('+' + R.euro(p.v)); R.sfx.cash(); R.buzz(15);
        checkMissions(); U.sync();
      }
    });

    // nearest thing to interact with
    var best = null, bd = 26;
    things.forEach(function (t) {
      if (t.def.hide && t.def.hide(S)) return;
      var d = rectDist(S.x, S.y - 5, t);
      if (d < bd) { bd = d; best = t; }
    });
    if (best !== target) {
      target = best;
      var b = $('actBtn');
      b.textContent = target ? target.def.label : '';
      b.classList.toggle('idle', !target);
    }

    // wind
    inv = Math.max(0, inv - dt);
    gusts.forEach(function (g) {
      g.x += g.v * dt;
      if (g.x > g.max) { g.x = g.max; g.v = -Math.abs(g.v); }
      if (g.x < g.min) { g.x = g.min; g.v = Math.abs(g.v); }
      if (inv <= 0 && Math.abs(g.x - S.x) < 30 && Math.abs(g.y - (S.y - 4)) < 22) {
        if (S.hat) { inv = 1.3; U.toast(R.pick(['The hat takes the hit.', 'Hat held. Barely.', 'Wind: denied.']), 'good'); R.sfx.ui(); }
        else { inv = 1.7; pop('WIND!', '#e0a08c'); G.fx({ hair: -4, conf: -3 }); }
      }
    });

    checkMissions();
    saveT += dt;
    if (saveT > 4 && G.state === 'play') { saveT = 0; G.save(); }
  }

  function camTarget() {
    var S = G.S, mw = L.w * T, mh = L.h * T, padTop = (hudH + 8) / scale, padBot = 120 / scale;
    var x = R.clamp(S.x - VW / 2, 0, Math.max(0, mw - VW));
    var lo = -padTop, hi = mh - VH + padBot;
    var y = hi < lo ? (lo + hi) / 2 : R.clamp(S.y - 40 - VH * 0.5, lo, hi);
    return { x: x, y: y };
  }
  function snapCam() { if (!G.S) return; var c = camTarget(); cam.x = c.x; cam.y = c.y; }

  // ---------- render ----------
  function drawTitle(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#26343a'); g.addColorStop(0.55, '#5a5140'); g.addColorStop(1, '#15130f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // grim skyline
    var r = R.rng(77), x = -10, base = H * 0.5;
    while (x < W + 10) {
      var bw = 34 + r() * 40, bh = 60 + r() * 150;
      A.rect(ctx, x, base - bh, bw, bh + 40, { fill: '#211e1b', seed: Math.round(x) + 3, lw: 2.4 });
      for (var wy = base - bh + 10; wy < base - 8; wy += 15) for (var wx = x + 7; wx < x + bw - 9; wx += 12)
        if (r() < 0.22) { ctx.fillStyle = r() < 0.5 ? 'rgba(201,162,39,.55)' : 'rgba(170,190,180,.3)'; ctx.fillRect(wx, wy, 6, 8); }
      x += bw + 2;
    }
    A.hatch(ctx, 0, 0, W, H * 0.5, 9, 'rgba(0,0,0,.12)', 1);

    // Barry, cycling through all five stages of the journey
    var st = 1 + Math.floor(t / 2.4) % 5, s = Math.min(W / 205, (H * 0.375 - 60) / 162), cy = 14 + 66 * s;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(s, s); A.k = 1 / s;
    A.shape(ctx, [[-62, 96], [-54, 56], [-18, 42], [18, 42], [54, 56], [62, 96]], { fill: '#84783f', seed: 95, boil: true, smooth: false });
    A.shape(ctx, [[-9, 44], [9, 44], [5, 96], [-5, 96]], { fill: '#c9c1a8', seed: 94, boil: true, lw: 2 });
    A.rect(ctx, -10, 34, 20, 16, { fill: '#d6b094', seed: 96, boil: true, lw: 2 });
    A.face(ctx, { who: 'barry', stage: st, expr: ['smug', 'neutral', 'shock', 'sad', 'dead'][st - 1], t: t });
    A.k = 1; ctx.restore();
    var ly = cy + 96 * s + 4;
    ctx.fillStyle = '#1b1714'; ctx.fillRect(W / 2 - 118, ly, 236, 40);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a227'; ctx.font = '900 11px "Roboto Condensed", "Arial Narrow", sans-serif';
    ctx.fillText('HAIR-LOSS STAGE ' + st + ' OF 5', W / 2, ly + 12);
    ctx.fillStyle = '#d9cfb4'; ctx.font = '900 16px "Roboto Condensed", "Arial Narrow", sans-serif';
    ctx.fillText(A.STAGES[st - 1].toUpperCase(), W / 2, ly + 28);
  }

  function drawWorld(t) {
    var S = G.S, s = DPR * scale;
    ctx.setTransform(s, 0, 0, s, -Math.round(cam.x * s), -Math.round(cam.y * s));
    ctx.drawImage(mapCv, 0, 0, L.w * T, L.h * T);
    A.frontDoor(ctx, L.door.x * T, L.door.y * T, !!S.flags.doorOpen);

    L.pickups.forEach(function (p) { if (!S.got[p.id]) A.coin(ctx, p.x * T, p.y * T, t, p.v); });

    // people and weather, sorted so nearer things overlap farther ones
    var ents = [{ y: S.y, f: function () {
      var flick = inv > 0 && Math.floor(t * 14) % 2 === 0;
      A.barry(ctx, S.x, S.y, {
        dir: S.dir, phase: walk, moving: moving, stage: A.stageOf(S.hair), hat: S.hat, t: t, alpha: flick ? 0.55 : 1,
        expr: inv > 0 ? 'shock' : S.conf < 25 ? 'sad' : S.conf >= 80 ? 'happy' : 'neutral',
      });
    } }];
    L.npcs.forEach(function (n) { ents.push({ y: n.y * T, f: function () { A.npc(ctx, n.x * T, n.y * T, { who: n.who, expr: n.expr, t: t + n.x }); } }); });
    gusts.forEach(function (g) { ents.push({ y: g.y + 6, f: function () { A.gust(ctx, g.x, g.y, t, g.v > 0 ? 1 : -1); } }); });
    ents.sort(function (a, b) { return a.y - b.y; });
    ents.forEach(function (e) { e.f(); });

    // interaction hints
    if (G.state === 'play') {
      things.forEach(function (th) {
        if (th.def.hide && th.def.hide(S)) return;
        var mx = th.x + th.w / 2, my = th.y - 8;
        if (th === target) {
          var by = my - 12 - Math.abs(Math.sin(t * 5)) * 6;
          A.ell(ctx, mx, by, 12, 12, { fill: '#c9a227', seed: 400, boil: true, lw: 2.6 });
          ctx.fillStyle = A.INK; ctx.font = '900 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', mx, by + 1);
        } else if (rectDist(S.x, S.y, th) < 150) {
          var pr = 3.5 + Math.sin(t * 4 + th.x) * 1.2;
          ctx.fillStyle = '#c9a227'; ctx.strokeStyle = A.INK; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(mx, my, pr, 0, 7); ctx.fill(); ctx.stroke();
        }
      });
    }

    // falling hairs + floating text
    ctx.strokeStyle = '#3b2d24'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    parts.forEach(function (p) {
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.beginPath(); ctx.moveTo(p.x - Math.cos(p.r) * 4, p.y - Math.sin(p.r) * 4); ctx.lineTo(p.x + Math.cos(p.r) * 4, p.y + Math.sin(p.r) * 4); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    pops.forEach(function (p) {
      ctx.globalAlpha = Math.min(1, (1.1 - p.t) * 3);
      ctx.font = '900 17px "Roboto Condensed", "Arial Narrow", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = A.INK; ctx.lineJoin = 'round';
      ctx.strokeText(p.text, p.x, p.y - p.t * 34); ctx.fillStyle = p.col; ctx.fillText(p.text, p.x, p.y - p.t * 34);
    });
    ctx.globalAlpha = 1;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function drawStick() {
    if (G.state !== 'play') return;
    var ox = stick ? stick.ox : 76, oy = stick ? stick.oy : H - 86;
    ctx.globalAlpha = stick ? 0.75 : 0.32;
    ctx.lineWidth = 3; ctx.strokeStyle = '#d9cfb4'; ctx.fillStyle = 'rgba(21,19,15,.45)';
    ctx.beginPath(); ctx.arc(ox, oy, 48, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9cfb4'; ctx.strokeStyle = '#1b1714';
    ctx.beginPath(); ctx.arc(ox + (stick ? stick.dx * 40 : 0), oy + (stick ? stick.dy * 40 : 0), 20, 0, 7); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function render(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#15130f'; ctx.fillRect(0, 0, W, H);
    if (G.world && G.S) drawWorld(t); else drawTitle(t);
    // grime: vignette + paper grain
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    if (grain) { ctx.globalAlpha = 0.5; ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (G.world) drawStick();
  }

  // ---------- loop ----------
  var last = 0;
  function frame(ms) {
    var t = ms / 1000, dt = Math.min(0.05, t - last || 0); last = t;
    A.boil = Math.floor(t * 7) % 3;
    if (G.state === 'play') update(dt);
    if (G.world && G.S) {
      var c = camTarget(), e = Math.min(1, dt * 7);
      cam.x += (c.x - cam.x) * e; cam.y += (c.y - cam.y) * e;
      pops.forEach(function (p) { p.t += dt; }); pops = pops.filter(function (p) { return p.t < 1.1; });
      parts.forEach(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.r += dt * 5; });
      parts = parts.filter(function (p) { return p.t < p.life; });
    }
    D.tick(dt, t);
    U.tick(t);
    render(t);
    requestAnimationFrame(frame);
  }

  // ---------- sizing ----------
  function resize() {
    var app = $('app');
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = app.clientWidth; H = app.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    scale = W / VW; VH = H / scale;
    if (G.world) { hudH = $('hud').offsetHeight || hudH; snapCam(); }
  }
  function makeGrain() {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), r = R.rng(9);
    for (var i = 0; i < 900; i++) {
      x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,245,220,.12)';
      x.fillRect(r() * 128, r() * 128, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    grain = ctx.createPattern(c, 'repeat');
  }

  // ---------- input ----------
  cv.addEventListener('pointerdown', function (e) {
    R.audioResume();
    if (G.state !== 'play' || stick) return;
    var r = cv.getBoundingClientRect();
    stick = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 };
    $('missionList').hidden = true;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!stick || e.pointerId !== stick.id) return;
    var r = cv.getBoundingClientRect();
    var dx = (e.clientX - r.left - stick.ox) / 44, dy = (e.clientY - r.top - stick.oy) / 44, m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    stick.dx = dx; stick.dy = dy;
  });
  function endStick(e) { if (stick && e.pointerId === stick.id) stick = null; }
  cv.addEventListener('pointerup', endStick);
  cv.addEventListener('pointercancel', endStick);
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  var KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (k) { keys[k] = true; e.preventDefault(); return; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') {
      if (e.target && e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      if (G.state === 'dialogue') D.tap(); else if (G.state === 'play') G.act();
    } else if (e.key === 'Escape' || e.key === 'p') {
      if (G.state === 'play') G.pause(); else if (G.state === 'pause') G.resume();
    } else if (G.state === 'dialogue' && e.key >= '1' && e.key <= '9') {
      D.choose(+e.key - 1);
    }
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) keys[k] = false; });
  window.addEventListener('blur', function () { keys = {}; stick = null; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (G.state === 'play') { G.save(); G.pause(); } else if (G.state === 'dialogue') G.save(); }
  });
  window.addEventListener('resize', resize);

  // ---------- test hooks (used by tests/smoke.js; harmless in play) ----------
  R.debug = {
    teleport: function (tx, ty) { G.S.x = tx * T; G.S.y = ty * T; snapCam(); },
    cam: function () { return { x: cam.x, y: cam.y }; },
    hits: hits,
    target: function () { return target ? target.def.id : null; },
    // Can Barry physically walk from where he stands to within reach of a thing?
    canReach: function (thingId, doorOpen) {
      var S = G.S, th = things.filter(function (q) { return q.def.id === thingId; })[0];
      var keep = S.flags.doorOpen; if (doorOpen) S.flags.doorOpen = 1;
      var seen = {}, queue = [[Math.round(S.x), Math.round(S.y)]], found = false, step = 8, n = 0;
      seen[queue[0].join()] = 1;
      while (queue.length && n++ < 80000) {
        var p = queue.shift();
        if (rectDist(p[0], p[1] - 5, th) < 26) { found = true; break; }
        [[step, 0], [-step, 0], [0, step], [0, -step]].forEach(function (d) {
          var q = [p[0] + d[0], p[1] + d[1]], key = q.join();
          if (!seen[key] && !hits(q[0], q[1])) { seen[key] = 1; queue.push(q); }
        });
      }
      S.flags.doorOpen = keep;
      return found;
    },
  };

  // ---------- boot ----------
  resize(); makeGrain();
  U.init();
  requestAnimationFrame(frame);
})(window.RTT);
