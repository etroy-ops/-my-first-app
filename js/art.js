/* Road to Turkey — art: everything is drawn in code with wobbly "hand-inked" outlines.
   No image files. Characters redraw with a slightly different wobble a few times a
   second ("line boil"), like cheap hand-drawn animation. */
(function (R) {
  'use strict';
  var A = R.art = {};
  var INK = A.INK = '#1b1714';
  A.boil = 0;   // current boil frame (0..2), set by the game loop
  A.k = 1;      // line-width compensation when drawing inside a scaled transform

  A.STAGES = ['Thinning Denial', "The Widow's Peak", 'The Landing Strip', 'The Horseshoe', 'Cue Ball'];
  A.stageOf = function (hair) { return hair >= 80 ? 1 : hair >= 60 ? 2 : hair >= 40 ? 3 : hair >= 20 ? 4 : 5; };

  // ---------- ink primitives ----------
  function jitter(pts, seed, amp, step, closed) {
    var r = R.rng(seed * 7919 + 13), out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] + (r() - 0.5) * amp, a[1] + (r() - 0.5) * amp]);
      if (!closed && i === n - 1) break;
      var dx = b[0] - a[0], dy = b[1] - a[1], k = Math.floor(Math.hypot(dx, dy) / step);
      for (var j = 1; j < k; j++) {
        var t = j / k;
        out.push([a[0] + dx * t + (r() - 0.5) * amp, a[1] + dy * t + (r() - 0.5) * amp]);
      }
    }
    return out;
  }
  function trace(c, p, closed, smooth) {
    var n = p.length, i;
    c.beginPath();
    if (smooth && n > 2) {
      if (closed) {
        c.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
        for (i = 0; i < n; i++) {
          var q = p[(i + 1) % n];
          c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + q[0]) / 2, (p[i][1] + q[1]) / 2);
        }
        c.closePath();
      } else {
        c.moveTo(p[0][0], p[0][1]);
        for (i = 1; i < n - 1; i++) c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
        c.lineTo(p[n - 1][0], p[n - 1][1]);
      }
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (i = 1; i < n; i++) c.lineTo(p[i][0], p[i][1]);
      if (closed) c.closePath();
    }
  }
  // o: fill, stroke (null = none), lw, seed, amp, step, closed, smooth, boil
  A.shape = function (c, pts, o) {
    o = o || {};
    var closed = o.closed !== false, k = A.k;
    var seed = (o.seed || 1) + (o.boil ? A.boil * 101 : 0);
    var amp = (o.amp == null ? 1.6 : o.amp) * k;
    var p = amp ? jitter(pts, seed, amp, o.smooth ? 1e9 : (o.step || 16) * k, closed) : pts;
    trace(c, p, closed, o.smooth);
    if (o.fill && closed) { c.fillStyle = o.fill; c.fill(); }
    if (o.stroke !== null) {
      c.lineWidth = (o.lw || 2.6) * k; c.strokeStyle = o.stroke || INK;
      c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    }
  };
  A.rect = function (c, x, y, w, h, o) { A.shape(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); };
  A.line = function (c, pts, o) { o = o || {}; o.closed = false; A.shape(c, pts, o); };
  A.ell = function (c, x, y, rx, ry, o) {
    o = o || {};
    var n = o.n || 12, pts = [];
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * rx * 1.04, y + Math.sin(a) * ry * 1.04]); }
    if (o.amp == null) o.amp = 1.2;
    o.smooth = true;
    A.shape(c, pts, o);
  };
  // diagonal pencil shading
  A.hatch = function (c, x, y, w, h, gap, col, lw) {
    c.strokeStyle = col || 'rgba(27,23,20,.22)'; c.lineWidth = lw || 1; c.beginPath();
    for (var d = gap; d < w + h; d += gap) {
      var x0 = x + d;
      c.moveTo(Math.min(x0, x + w), y + Math.max(0, x0 - (x + w)));
      c.lineTo(Math.max(x, x0 - h), y + Math.min(h, x0 - x));
    }
    c.stroke();
  };

  // ---------- faces ----------
  var SKIN = { barry: '#d6b094', mirror: '#d6b094', gary: '#c99b78', moira: '#9c6f55' };
  var HAIR = '#3b2d24';
  var EX = {
    neutral: { brow: 0.1, open: 0.72, pup: 3, mouth: 'flat' },
    shock:   { brow: -0.5, open: 1.35, pup: 1.7, mouth: 'o', sweat: 1, browY: -7 },
    sad:     { brow: -0.9, open: 0.8, pup: 3.4, mouth: 'frown', tear: 1 },
    smug:    { brow: 0.3, asym: 1, open: 0.45, pup: 3, mouth: 'smirk' },
    grit:    { brow: 1, open: 0.6, pup: 2.6, mouth: 'teeth' },
    happy:   { brow: -0.3, open: 0.85, pup: 3.2, mouth: 'smile' },
    dead:    { brow: 0, open: 0.42, pup: 2.8, mouth: 'flat' },
  };

  function barryHair(c, stage) {
    var o = { fill: HAIR, smooth: true, boil: true, amp: 1.6 }, s, i;
    function sh(pts, seed) { o.seed = seed; A.shape(c, pts, o); }
    if (stage === 1) {
      sh([[-39, -4], [-44, -26], [-32, -48], [0, -57], [32, -48], [44, -26], [39, -4], [33, -12], [30, -29], [15, -35], [0, -27], [-15, -35], [-30, -29], [-33, -12]], 41);
    } else if (stage === 2) {
      sh([[-39, -2], [-43, -24], [-31, -45], [0, -52], [31, -45], [43, -24], [39, -2], [34, -10], [31, -24], [23, -41], [9, -37], [0, -30], [-9, -37], [-23, -41], [-31, -24], [-34, -10]], 42);
      for (s = -1; s <= 1; s += 2) A.line(c, [[s * 10, -47], [s * 16, -41]], { stroke: SKIN.barry, lw: 1.6, seed: 43 + s, boil: true });
    } else if (stage === 3) {
      for (s = -1; s <= 1; s += 2) sh([[s * 39, -2], [s * 44, -22], [s * 37, -40], [s * 27, -36], [s * 30, -22], [s * 34, -8]], 44 + s);
      A.ell(c, 0, -40, 11, 6, { fill: HAIR, seed: 46, boil: true });
      for (i = -1; i <= 1; i++) A.line(c, [[i * 6, -43], [i * 9, -52]], { lw: 2, seed: 47 + i, boil: true });
    } else if (stage === 4) {
      for (s = -1; s <= 1; s += 2) sh([[s * 39, 0], [s * 44, -14], [s * 39, -27], [s * 32, -18], [s * 35, -4]], 48 + s);
      for (i = 0; i < 3; i++) A.line(c, [[-36, -27 + i], [-8, -47 + i * 3], [27, -39 + i * 4]], { lw: 1.7, seed: 50 + i, boil: true, smooth: true });
    } else {
      for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) A.line(c, [[s * 38, -4 - i * 6], [s * 42, -8 - i * 6]], { lw: 1.5, seed: 53 + i, boil: true, amp: 0.6 });
      for (i = -1; i <= 1; i++) A.line(c, [[i * 7, -45], [i * 9 + 3, -53], [i * 10 - 2, -61]], { lw: 1.7, seed: 57 + i, boil: true, smooth: true });
    }
    if (stage >= 3) A.line(c, [[-22, -30], [-13, -38], [-2, -40]], { stroke: 'rgba(255,255,255,.6)', lw: 3, seed: 60, smooth: true, amp: 0.5 });
  }

  function hat(c, kind, back) {
    if (kind === 'dadcap') {
      A.shape(c, [[-43, -12], [-41, -36], [-23, -55], [0, -59], [23, -55], [41, -36], [43, -12]], { fill: '#a0412f', seed: 61, boil: true, smooth: true });
      if (!back) {
        A.shape(c, [[-32, -15], [32, -15], [38, -5], [0, 1], [-38, -5]], { fill: '#7a2f22', seed: 62, boil: true, smooth: true });
        A.rect(c, -11, -42, 22, 13, { fill: '#d9cfb4', seed: 63, boil: true, lw: 1.6, amp: 1 });
      }
    } else {
      A.shape(c, [[-43, -10], [-42, -34], [-26, -56], [0, -63], [26, -56], [42, -34], [43, -10]], { fill: '#6d7a4a', seed: 64, boil: true, smooth: true });
      A.rect(c, -46, -23, 92, 16, { fill: '#56613a', seed: 65, boil: true, amp: 1.4 });
      for (var i = -3; i <= 3; i++) A.line(c, [[i * 12, -21], [i * 12, -9]], { lw: 1.3, seed: 66 + i, amp: 0.8 });
      A.ell(c, 0, -67, 8, 7, { fill: '#8a3d32', seed: 73, boil: true });
    }
  }

  // o: who, stage, hat, expr, t, lookX (-1 left, 0 front, 1 right)
  A.face = function (c, o) {
    var who = o.who === 'mirror' ? 'barry' : (o.who || 'barry');
    var ex = EX[o.expr] || EX.neutral, t = o.t || 0, lx = o.lookX || 0, sd = lx * 9;
    var skin = SKIN[who], hw = who === 'gary' ? 33 : 40, hh = who === 'gary' ? 50 : who === 'moira' ? 42 : 46;
    var s, i;

    if (who === 'gary') A.ell(c, 2, -34, 43, 40, { fill: '#1f1b19', seed: 80, boil: true, n: 14 });
    if (who === 'moira') A.ell(c, 0, -56, 15, 13, { fill: '#8d8a86', seed: 81, boil: true });
    if (lx <= 0) A.ell(c, hw + 1, 4, 7, 10, { fill: skin, seed: 11, boil: true });
    if (lx >= 0) A.ell(c, -hw - 1, 4, 7, 10, { fill: skin, seed: 12, boil: true });
    A.ell(c, 0, 0, hw, hh, { fill: skin, seed: 13, boil: true, n: 14 });
    // jowl / chin shadow
    A.line(c, [[-hw * 0.5, hh * 0.72], [0, hh * 0.86], [hw * 0.5, hh * 0.72]], { stroke: 'rgba(27,23,20,.25)', lw: 2, seed: 14, smooth: true, amp: 0.8 });

    if (who === 'barry') {
      // stubble
      var r = R.rng(5);
      c.fillStyle = 'rgba(40,32,28,.4)';
      for (i = 0; i < 46; i++) {
        var a = Math.PI * (0.12 + 0.76 * r()), d = 0.55 + 0.4 * r();
        var px = Math.cos(a) * hw * d + sd * 0.5, pyy = Math.sin(a) * hh * d + 6;
        if (pyy > 15) c.fillRect(px, pyy, 1.8, 1.8);
      }
      if (o.hat) hat(c, o.hat); else barryHair(c, o.stage || 2);
    } else if (who === 'gary') {
      A.shape(c, [[-33, -6], [-39, -40], [-24, -70], [6, -83], [35, -72], [45, -44], [35, -6], [30, -28], [10, -37], [-12, -32], [-27, -26]], { fill: '#1f1b19', seed: 82, boil: true, smooth: true });
      A.line(c, [[-18, -62], [2, -72], [22, -64]], { stroke: 'rgba(255,255,255,.45)', lw: 3, seed: 83, smooth: true, amp: 0.6 });
      A.line(c, [[-10, -50], [6, -57], [22, -51]], { stroke: 'rgba(255,255,255,.3)', lw: 2, seed: 84, smooth: true, amp: 0.6 });
    } else if (who === 'moira') {
      A.shape(c, [[-41, -2], [-44, -27], [-26, -45], [0, -49], [26, -45], [44, -27], [41, -2], [34, -20], [12, -31], [-20, -29], [-34, -17]], { fill: '#8d8a86', seed: 85, boil: true, smooth: true });
    }

    // eyes
    var blink = (t % 3.7) < 0.12 ? 0.12 : 1;
    for (s = -1; s <= 1; s += 2) {
      var ex0 = s * 15 + sd, ey = -5;
      if (who === 'barry') A.line(c, [[ex0 - 9, ey + 11], [ex0, ey + 15], [ex0 + 9, ey + 11]], { stroke: 'rgba(27,23,20,.45)', lw: 1.6, seed: 15 + s, smooth: true, amp: 0.6 });
      A.ell(c, ex0, ey, 9, Math.max(1.2, 9 * ex.open * blink), { fill: '#efe9d8', seed: 17 + s, boil: true, lw: 2, amp: 0.8 });
      if (blink === 1) {
        c.fillStyle = INK; c.beginPath();
        c.arc(ex0 + lx * 3.5 + (o.who === 'mirror' ? 1.5 : 0), ey + (ex.open < 0.6 ? 1 : 0), ex.pup, 0, 7); c.fill();
      }
      // brows
      var by = -19 + (ex.browY || 0) - (s === 1 ? (ex.asym || 0) * 7 : 0);
      A.line(c, [[s * 5 + sd, by + ex.brow * 7], [s * 25 + sd, by - ex.brow * 4]],
        { lw: who === 'moira' ? 3 : who === 'gary' ? 4 : 5.5, seed: 19 + s, boil: true, amp: 1 });
    }
    if (who === 'moira') {
      for (s = -1; s <= 1; s += 2) A.rect(c, s * 15 - 12 + sd, -15, 24, 19, { fill: 'rgba(210,225,225,.22)', seed: 86 + s, boil: true, lw: 2.2, amp: 1 });
      A.line(c, [[-3 + sd, -6], [3 + sd, -6]], { lw: 2.2, seed: 88, amp: 0.5 });
    }

    // nose
    if (who === 'barry') {
      A.ell(c, sd * 1.4, 9, 9, 8, { fill: '#c99a80', seed: 21, boil: true, lw: 2.2 });
      A.line(c, [[sd * 1.4 - 4, 6], [sd * 1.4 - 1, 4]], { stroke: 'rgba(255,255,255,.5)', lw: 2, seed: 22, amp: 0.3 });
    } else if (who === 'gary') {
      A.line(c, [[sd - 1, -6], [sd - 6, 15], [sd + 5, 16]], { lw: 2.4, seed: 23, boil: true, smooth: true });
    } else {
      A.line(c, [[sd - 3, 8], [sd, 11], [sd + 3, 8]], { lw: 2.2, seed: 24, boil: true, smooth: true });
    }

    // mouth
    var my = who === 'gary' ? 31 : 27, mx = sd * 1.2, m = ex.mouth;
    if (who === 'gary' && (m === 'smirk' || m === 'smile')) {
      A.shape(c, [[mx - 16, my - 5], [mx + 16, my - 6], [mx + 11, my + 6], [mx - 10, my + 6]], { fill: '#efe9d8', seed: 25, boil: true, lw: 2.2, smooth: true });
      A.line(c, [[mx - 13, my], [mx + 13, my]], { lw: 1.3, seed: 26, amp: 0.6 });
    } else if (m === 'o') {
      A.ell(c, mx, my + 3, 8, 10 + Math.sin(t * 9) * 1.5, { fill: '#3a1e1c', seed: 27, boil: true, lw: 2.2 });
    } else if (m === 'teeth') {
      A.rect(c, mx - 13, my - 5, 26, 10, { fill: '#e9e2cc', seed: 28, boil: true, lw: 2.2, amp: 1 });
      for (i = -2; i <= 2; i++) A.line(c, [[mx + i * 5, my - 5], [mx + i * 5, my + 5]], { lw: 1.2, seed: 29 + i, amp: 0.5 });
    } else {
      var pts = m === 'frown' ? [[-12, 4], [0, -3], [12, 4]]
        : m === 'smile' ? [[-13, -3], [0, 6], [13, -3]]
        : m === 'smirk' ? [[-10, 2], [2, 2], [13, -5]]
        : [[-10, 0], [0, 1], [10, 0]];
      A.line(c, pts.map(function (p) { return [p[0] + mx, p[1] + my]; }), { lw: 2.6, seed: 34, boil: true, smooth: true, amp: 1 });
    }

    // extras
    if (ex.sweat) {
      for (i = 0; i < 2; i++) {
        var ph = (t * 1.3 + i * 0.5) % 1;
        A.ell(c, hw - 8 + i * 9, -32 + ph * 26, 3, 5, { fill: '#a9cbd6', seed: 36 + i, lw: 1.4, amp: 0.4 });
      }
    }
    if (ex.tear) A.ell(c, -15 + sd, 9 + ((t * 0.8) % 1) * 14, 3, 5, { fill: '#a9cbd6', seed: 38, lw: 1.4, amp: 0.4 });
  };

  // back of Barry's head (walking away from the camera)
  A.headBack = function (c, o) {
    var skin = SKIN.barry, st = o.stage || 2, i, s;
    for (s = -1; s <= 1; s += 2) A.ell(c, s * 41, 4, 7, 10, { fill: skin, seed: 11 + s, boil: true });
    if (o.hat) {
      A.ell(c, 0, 0, 40, 46, { fill: skin, seed: 13, boil: true, n: 14 });
      A.shape(c, [[-40, 6], [-36, 26], [-20, 41], [0, 45], [20, 41], [36, 26], [40, 6]], { fill: HAIR, seed: 90, boil: true, smooth: true, stroke: null });
      hat(c, o.hat, true);
      return;
    }
    if (st <= 3) {
      A.ell(c, 0, 0, 40, 46, { fill: HAIR, seed: 13, boil: true, n: 14 });
      var sz = [[10, 8], [19, 15], [30, 26]][st - 1];
      A.ell(c, 0, -20, sz[0], sz[1], { fill: skin, seed: 91, boil: true, lw: 1.6 });
    } else {
      A.ell(c, 0, 0, 40, 46, { fill: skin, seed: 13, boil: true, n: 14 });
      if (st === 4) A.shape(c, [[-40, 4], [-36, 25], [-20, 41], [0, 45], [20, 41], [36, 25], [40, 4], [30, 12], [0, 17], [-30, 12]], { fill: HAIR, seed: 92, boil: true, smooth: true, lw: 1.8 });
      else for (i = -3; i <= 3; i++) A.line(c, [[i * 9, 30], [i * 9 + 2, 35]], { lw: 1.5, seed: 93 + i, amp: 0.5 });
    }
    if (st >= 3) A.line(c, [[-16, -30], [-6, -36], [4, -36]], { stroke: 'rgba(255,255,255,.6)', lw: 3, seed: 60, smooth: true, amp: 0.5 });
  };

  // Dialogue / title portrait. c is already scaled to CSS pixels; draws into w x h.
  A.portrait = function (c, w, h, o) {
    var who = o.who, bg = { barry: '#5c6455', mirror: '#4d6470', gary: '#6b5848', moira: '#4f6b5a' }[who] || '#555';
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    A.hatch(c, 0, 0, w, h, 7, 'rgba(27,23,20,.18)', 1);
    var s = w / 124;
    c.save(); c.translate(w / 2, h * 0.5); c.scale(s, s);
    if (who === 'mirror') c.scale(-1, 1);
    A.k = 1 / s;
    var body = { barry: '#84783f', mirror: '#84783f', gary: '#3a3532', moira: '#d8d6c8' }[who];
    A.shape(c, [[-52, 80], [-46, 50], [-16, 40], [16, 40], [46, 50], [52, 80]], { fill: body, seed: 95, boil: true, smooth: false });
    A.rect(c, -9, 34, 18, 16, { fill: SKIN[who], seed: 96, boil: true, lw: 2 });
    A.face(c, o);
    A.k = 1;
    c.restore();
    if (who === 'mirror') {
      c.fillStyle = 'rgba(110,160,190,.22)'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath();
      c.moveTo(w * 0.1, h * 0.5); c.lineTo(w * 0.45, h * 0.08); c.moveTo(w * 0.2, h * 0.62); c.lineTo(w * 0.62, h * 0.1); c.stroke();
    }
  };

  // ---------- world characters (x,y = feet) ----------
  function body(c, o, col, legCol, shoeCol, skin, tall) {
    var sw = o.moving ? Math.sin(o.phase) : 0;
    var bob = o.moving ? Math.abs(Math.sin(o.phase)) * 2 : Math.sin((o.t || 0) * 2) * 0.6;
    var side = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0, s, top = -48 - tall;
    for (s = -1; s <= 1; s += 2) {
      var lift = Math.max(0, sw * s) * 4;
      A.rect(c, s * 6 - 5, -22 - lift, 10, 18, { fill: legCol, seed: 20 + s, boil: true, amp: 0.8 });
      A.ell(c, s * 6 + side * 2, -3 - lift, 7, 4, { fill: shoeCol, seed: 23 + s, boil: true, amp: 0.7 });
    }
    A.shape(c, [[-13, top + bob], [13, top + bob], [16, -32], [14, -19], [-14, -19], [-16, -32]], { fill: col, seed: 30, boil: true, amp: 1 });
    for (s = -1; s <= 1; s += 2) {
      c.save(); c.translate(s * 15, top + 3 + bob); c.rotate(s * -0.1 + sw * s * 0.45);
      A.rect(c, -4, 0, 8, 20 + tall * 0.5, { fill: col, seed: 33 + s, boil: true, amp: 0.7 });
      A.ell(c, 0, 22 + tall * 0.5, 4, 4, { fill: skin, seed: 36 + s, boil: true, lw: 1.8, amp: 0.5 });
      c.restore();
    }
    return bob;
  }
  function shadow(c, x, y, r) {
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y, r, r * 0.34, 0, 0, 7); c.fill();
  }

  // o: dir, phase, moving, stage, hat, expr, t, alpha
  A.barry = function (c, x, y, o) {
    shadow(c, x, y, 15);
    c.save(); c.translate(x, y);
    if (o.alpha != null) c.globalAlpha = o.alpha;
    var bob = body(c, o, '#84783f', '#5a5f66', '#7b3f37', SKIN.barry, 0);
    if (o.dir !== 'up') {
      A.shape(c, [[-5, -48 + bob], [5, -48 + bob], [3, -23], [-3, -23]], { fill: '#c9c1a8', seed: 39, boil: true, amp: 0.6, lw: 1.6 });
      c.fillStyle = '#8a6a3a'; c.fillRect(-1, -36, 3, 3);
    }
    c.translate(0, -62 + bob); c.scale(0.36, 0.36); A.k = 2.2;
    if (o.dir === 'up') A.headBack(c, o);
    else A.face(c, { who: 'barry', stage: o.stage, hat: o.hat, expr: o.expr, t: o.t, lookX: o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0 });
    A.k = 1;
    c.restore();
  };

  A.npc = function (c, x, y, o) {
    shadow(c, x, y, 15);
    c.save(); c.translate(x, y);
    var gary = o.who === 'gary';
    var bob = body(c, { t: o.t, dir: 'down' }, gary ? '#3a3532' : '#d8d6c8', gary ? '#2f3a4a' : '#4a4f55', gary ? '#d9d4c4' : '#2a2725', SKIN[o.who], gary ? 8 : 0);
    if (gary) A.line(c, [[0, -54 + bob], [0, -21]], { lw: 1.4, seed: 97, amp: 0.6 });
    else A.rect(c, -4, -44 + bob, 8, 9, { fill: '#4f8a68', seed: 98, lw: 1.4, amp: 0.5 });
    c.translate(0, (gary ? -72 : -61) + bob); c.scale(0.35, 0.35); A.k = 2.2;
    A.face(c, { who: o.who, expr: o.expr, t: o.t });
    A.k = 1;
    c.restore();
  };

  A.gust = function (c, x, y, t, dirn) {
    c.save(); c.translate(x, y - 26);
    c.fillStyle = 'rgba(230,235,230,.13)'; c.beginPath(); c.ellipse(0, 0, 34, 30, 0, 0, 7); c.fill();
    for (var i = 0; i < 3; i++) {
      var yy = (i - 1) * 16, ph = Math.sin(t * 7 + i * 2) * 6, d = (i % 2 ? -1 : 1) * dirn;
      A.line(c, [[-d * 30 + ph, yy], [d * 6 + ph, yy], [d * 18 + ph, yy - 4], [d * 16 + ph, yy - 12], [d * 8 + ph, yy - 9]],
        { stroke: 'rgba(240,240,232,.9)', lw: 3, seed: 110 + i, boil: true, smooth: true, amp: 1.5 });
    }
    // crisp packet
    c.translate(Math.cos(t * 5) * 22, Math.sin(t * 6.5) * 18); c.rotate(t * 6);
    A.rect(c, -5, -7, 10, 14, { fill: '#b5482a', seed: 114, lw: 1.5, amp: 1 });
    c.restore();
  };

  A.coin = function (c, x, y, t, value) {
    var bobv = Math.sin(t * 4 + x) * 2;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(x, y + 4, 8, 3, 0, 0, 7); c.fill();
    if (value >= 5) {
      c.save(); c.translate(x, y - 8 + bobv); c.rotate(Math.sin(t * 2 + x) * 0.2);
      A.rect(c, -11, -7, 22, 14, { fill: '#7f9a78', seed: 120, boil: true, lw: 2, amp: 1 });
      c.fillStyle = INK; c.font = '900 9px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('€' + value, 0, 0.5);
      c.restore();
    } else {
      A.ell(c, x, y - 8 + bobv, 8, 8, { fill: '#b8973a', seed: 121, boil: true, lw: 2 });
      c.fillStyle = INK; c.font = '900 10px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('€', x, y - 7.5 + bobv);
    }
  };

  // front door of the flat, seen from above/outside. x,y = tile top-left.
  A.frontDoor = function (c, x, y, open) {
    var T = R.TILE;
    if (!open) {
      c.fillStyle = '#24201d'; c.fillRect(x, y, T, T * 0.36);
      A.rect(c, x + 3, y + T * 0.36, T - 6, T * 0.64, { fill: '#6b3b2e', seed: 130, lw: 2.6 });
      A.rect(c, x + 10, y + T * 0.46, T - 20, T * 0.2, { fill: '#5a3026', seed: 131, lw: 1.6, amp: 1 });
      A.ell(c, x + T - 11, y + T * 0.8, 2.5, 2.5, { fill: '#b8973a', seed: 132, lw: 1.4, amp: 0.3 });
      c.fillStyle = '#d9cfb4'; c.font = '900 8px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('4B', x + T / 2, y + T * 0.56);
    } else {
      A.rect(c, x + 1, y + 2, 7, T - 4, { fill: '#6b3b2e', seed: 133, lw: 2.2, amp: 1 });
    }
  };

  // ---------- props (static: baked into the map image once) ----------
  var P = A.props = {};
  function boxes(c, x, y, w, h, seed, cols) {   // little product boxes for shelves
    var r = R.rng(seed), px = x + 3;
    while (px < x + w - 6) {
      var bw = 5 + r() * 6, bh = h * (0.5 + r() * 0.4);
      A.rect(c, px, y + h - bh - 2, bw, bh, { fill: cols[Math.floor(r() * cols.length)], seed: seed + px, lw: 1.3, amp: 0.7 });
      px += bw + 1.5;
    }
  }
  var PROD = ['#8a9a7a', '#b08a5a', '#7d8fa3', '#a36b5e', '#c9c1a8', '#6d7a8a'];

  P.bed = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#5a4636', seed: 201 });
    A.rect(c, x + 4, y + 5, w - 8, h - 9, { fill: '#b9b29a', seed: 202, lw: 2 });
    A.rect(c, x + 8, y + 9, w * 0.42, h * 0.3, { fill: '#d8d2be', seed: 203, lw: 2 });
    // the daily casualties
    for (var i = 0; i < 6; i++) A.line(c, [[x + 14 + i * 6, y + 15 + (i % 3) * 5], [x + 18 + i * 6, y + 19 + (i % 2) * 4]], { lw: 1, seed: 204 + i, amp: 1.5 });
    A.shape(c, [[x + 4, y + h * 0.48], [x + w - 4, y + h * 0.42], [x + w - 4, y + h - 4], [x + 4, y + h - 4]], { fill: '#5d6b6e', seed: 210, lw: 2 });
    A.hatch(c, x + 6, y + h * 0.5, w - 12, h * 0.44, 8);
  };
  P.wardrobe = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#5c4735', seed: 211 });
    A.line(c, [[x + w / 2, y + 2], [x + w / 2, y + h - 2]], { lw: 2, seed: 212 });
    A.ell(c, x + w / 2 - 6, y + h * 0.6, 2, 2, { fill: '#b8973a', lw: 1.2, seed: 213, amp: 0.3 });
    A.ell(c, x + w / 2 + 6, y + h * 0.6, 2, 2, { fill: '#b8973a', lw: 1.2, seed: 214, amp: 0.3 });
    A.hatch(c, x + 2, y + 2, w - 4, h - 4, 9);
  };
  P.nightstand = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#6a503b', seed: 215 });
    A.line(c, [[x + 4, y + h * 0.62], [x + w - 4, y + h * 0.62]], { lw: 1.6, seed: 216 });
    A.ell(c, x + w * 0.5, y + h * 0.32, 8, 6, { fill: '#c9b06a', seed: 217, lw: 1.8 });
  };
  P.laundry = function (c, x, y, w, h) {
    A.ell(c, x + w * 0.4, y + h * 0.6, w * 0.4, h * 0.36, { fill: '#5b6068', seed: 218 });
    A.ell(c, x + w * 0.65, y + h * 0.45, w * 0.3, h * 0.32, { fill: '#8a7a6a', seed: 219 });
    A.ell(c, x + w * 0.45, y + h * 0.35, w * 0.24, h * 0.24, { fill: '#4a5a66', seed: 220 });
  };
  P.rug = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#7a4d42', seed: 221, lw: 2 });
    A.rect(c, x + 6, y + 6, w - 12, h - 12, { seed: 222, lw: 1.4, stroke: '#a3806a' });
    A.hatch(c, x, y, w, h, 10, 'rgba(27,23,20,.15)');
  };
  P.sink = function (c, x, y, w, h) {
    // mirror on the wall above
    A.rect(c, x + 3, y - 36, w - 6, 30, { fill: '#9fb7bd', seed: 223, lw: 3 });
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath();
    c.moveTo(x + 9, y - 14); c.lineTo(x + 19, y - 30); c.moveTo(x + 17, y - 12); c.lineTo(x + 29, y - 31); c.stroke();
    A.rect(c, x, y, w, h, { fill: '#c9c6b8', seed: 224 });
    A.ell(c, x + w / 2, y + h * 0.55, w * 0.32, h * 0.3, { fill: '#e6e3d6', seed: 225, lw: 2 });
    A.rect(c, x + w / 2 - 2, y + 2, 4, 8, { fill: '#8d9498', seed: 226, lw: 1.4, amp: 0.5 });
    c.fillStyle = INK; c.beginPath(); c.arc(x + w / 2, y + h * 0.6, 1.8, 0, 7); c.fill();
  };
  P.cabinet = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#bfbcae', seed: 227 });
    c.fillStyle = '#9a3b30'; c.fillRect(x + w / 2 - 2, y + h / 2 - 7, 4, 14); c.fillRect(x + w / 2 - 7, y + h / 2 - 2, 14, 4);
  };
  P.toilet = function (c, x, y, w, h) {
    A.rect(c, x + 4, y, w - 8, h * 0.34, { fill: '#d7d4c6', seed: 228 });
    A.ell(c, x + w / 2, y + h * 0.64, w * 0.36, h * 0.34, { fill: '#e6e3d6', seed: 229 });
    A.ell(c, x + w / 2, y + h * 0.66, w * 0.2, h * 0.2, { fill: '#8fa39b', seed: 230, lw: 1.8 });
  };
  P.bath = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#d7d4c6', seed: 231 });
    A.rect(c, x + 6, y + 8, w - 12, h - 16, { fill: '#93a8a2', seed: 232, lw: 2 });
    A.ell(c, x + w / 2, y + h - 18, 3, 3, { fill: INK, seed: 233, lw: 1, amp: 0.3 });
    A.ell(c, x + w * 0.45, y + h * 0.3, 7, 6, { fill: '#b8973a', seed: 234, lw: 1.8 });
    A.line(c, [[x + w / 2 - 6, y + h - 22], [x + w / 2 + 2, y + h - 12], [x + w / 2 - 3, y + h - 15]], { lw: 1, seed: 235, amp: 2 });
  };
  P.mat = function (c, x, y, w, h) { A.rect(c, x, y, w, h, { fill: '#6b7f78', seed: 236, lw: 2 }); A.hatch(c, x, y, w, h, 6); };
  P.sofa = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#6e5a63', seed: 237 });
    A.rect(c, x + w * 0.34, y + 8, w * 0.62, h / 2 - 10, { fill: '#85707a', seed: 238, lw: 2 });
    A.rect(c, x + w * 0.34, y + h / 2 + 2, w * 0.62, h / 2 - 10, { fill: '#85707a', seed: 239, lw: 2 });
    A.ell(c, x + w * 0.66, y + h * 0.7, 6, 4, { fill: 'rgba(60,40,30,.45)', seed: 240, stroke: null });
    A.hatch(c, x + 2, y + 2, w * 0.3, h - 4, 7);
  };
  P.tv = function (c, x, y, w, h) {
    A.rect(c, x + 5, y - 34, w - 10, 30, { fill: '#2b3b45', seed: 241, lw: 3 });
    c.fillStyle = 'rgba(190,215,220,.5)'; c.fillRect(x + 12, y - 28, w * 0.3, 3); c.fillRect(x + 12, y - 22, w * 0.5, 3);
    A.rect(c, x, y, w, h, { fill: '#3d3530', seed: 242 });
  };
  P.ctable = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#6b5038', seed: 243 });
    A.ell(c, x + w * 0.3, y + h * 0.4, 6, 6, { seed: 244, lw: 1.4, stroke: 'rgba(27,23,20,.5)' });
    A.rect(c, x + w * 0.55, y + h * 0.5, 16, 6, { fill: '#2b2826', seed: 245, lw: 1.2, amp: 0.6 });
  };
  P.plant = function (c, x, y, w, h) {
    A.shape(c, [[x + 5, y + h * 0.5], [x + w - 5, y + h * 0.5], [x + w - 9, y + h], [x + 9, y + h]], { fill: '#8a5a44', seed: 246 });
    for (var i = 0; i < 4; i++) A.line(c, [[x + w / 2, y + h * 0.5], [x + w * (0.15 + i * 0.23), y + h * 0.5 - 18 - (i % 2) * 8]], { stroke: '#5a4a32', lw: 2, seed: 247 + i, amp: 3, step: 6 });
  };
  P.counter = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#8d8676', seed: 251 });
    A.rect(c, x + 6, y + 5, 34, h - 10, { fill: '#5d5a54', seed: 252, lw: 1.8 });
    A.ell(c, x + 15, y + h / 2, 5, 5, { seed: 253, lw: 1.4 }); A.ell(c, x + 31, y + h / 2, 5, 5, { seed: 254, lw: 1.4 });
    // the holiday jar
    A.ell(c, x + w - 28, y + h / 2, 10, 9, { fill: '#a8794a', seed: 255 });
    A.ell(c, x + w - 28, y + h / 2 - 1, 5, 4, { fill: '#c9a227', seed: 256, lw: 1.4 });
  };
  P.fridge = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#c7c9c2', seed: 257 });
    A.line(c, [[x + 3, y + h * 0.36], [x + w - 3, y + h * 0.36]], { lw: 1.8, seed: 258 });
    A.line(c, [[x + w - 8, y + h * 0.46], [x + w - 8, y + h * 0.8]], { lw: 2.6, seed: 259, amp: 0.6 });
    c.fillStyle = '#b5482a'; c.fillRect(x + 8, y + h * 0.5, 7, 5);
  };
  P.ktable = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#74593f', seed: 260 });
    c.save(); c.translate(x + w * 0.45, y + h * 0.5); c.rotate(-0.2);
    A.rect(c, -11, -8, 22, 16, { fill: '#e6e0cc', seed: 261, lw: 1.5, amp: 0.8 });
    c.fillStyle = '#b5482a'; c.fillRect(-8, -5, 13, 3); c.restore();
  };
  P.doormat = function (c, x, y, w, h) { A.rect(c, x, y, w, h, { fill: '#4f4a3c', seed: 262, lw: 2 }); A.hatch(c, x, y, w, h, 5); };
  P.lamp = function (c, x, y, w, h) {
    var mx = x + w / 2;
    A.line(c, [[mx, y + h], [mx, y - 34], [mx + 16, y - 38]], { lw: 4, seed: 263, amp: 1 });
    A.ell(c, mx + 19, y - 35, 6, 4, { fill: '#c9b06a', seed: 264, lw: 2 });
    A.ell(c, mx, y + h - 2, 6, 3, { fill: '#2d2d30', seed: 265, lw: 2 });
  };
  P.bin = function (c, x, y, w, h) {
    A.rect(c, x + 3, y + 6, w - 6, h - 6, { fill: '#4e5a50', seed: 266 });
    A.rect(c, x, y, w, 10, { fill: '#66756a', seed: 267 });
    A.ell(c, x + w + 8, y + h - 8, 11, 9, { fill: '#2b2826', seed: 268 });
    A.line(c, [[x + w + 6, y + h - 18], [x + w + 10, y + h - 24]], { lw: 2, seed: 269 });
  };
  P.bench = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#6a5642', seed: 270 });
    for (var i = 1; i < 3; i++) A.line(c, [[x + 3, y + h * i / 3], [x + w - 3, y + h * i / 3]], { lw: 1.5, seed: 271 + i });
  };
  P.aboard = function (c, x, y, w, h) {
    A.shape(c, [[x + 5, y - 22], [x + w - 5, y - 22], [x + w, y + h], [x, y + h]], { fill: '#d9cfb4', seed: 274 });
    c.fillStyle = '#3e7a5a'; c.fillRect(x + w / 2 - 3, y - 17, 6, 16); c.fillRect(x + w / 2 - 8, y - 12, 16, 6);
    for (var i = 0; i < 3; i++) A.line(c, [[x + 8, y + 9 + i * 7], [x + w - 8 - (i % 2) * 8, y + 9 + i * 7]], { lw: 1.6, seed: 275 + i, amp: 1.2, step: 5 });
  };
  P.pcounter = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#c9cdbf', seed: 278 });
    A.rect(c, x, y + h * 0.62, w, h * 0.38, { fill: '#7f8c7c', seed: 279, lw: 2 });
    A.rect(c, x + w * 0.62, y + 4, 30, h * 0.5, { fill: '#3d3d40', seed: 280, lw: 1.8 });
    A.rect(c, x + w * 0.28, y + 6, 14, h * 0.4, { fill: '#55595e', seed: 281, lw: 1.5, amp: 0.8 });
    boxes(c, x + 8, y + 2, w * 0.16, h * 0.55, 282, PROD);
  };
  P.shelf = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#7b8378', seed: 283 + Math.round(x) });
    var rows = Math.max(1, Math.round(h / 34));
    for (var i = 0; i < rows; i++) {
      if (w > h) boxes(c, x + 2, y + 2, w - 4, h - 4, 290 + i + Math.round(x), PROD);
      else boxes(c, x + 2, y + 3 + i * (h / rows), w - 4, h / rows - 5, 300 + i + Math.round(x), PROD);
    }
  };
  P.backshelf = function (c, x, y, w, h) {
    A.rect(c, x, y, w, h, { fill: '#5f6b5f', seed: 310 });
    boxes(c, x + 3, y + 2, w - 6, h * 0.48, 311, PROD);
    boxes(c, x + 3, y + h * 0.5, w - 6, h * 0.48, 312, PROD);
    A.line(c, [[x + 2, y + h * 0.5], [x + w - 2, y + h * 0.5]], { lw: 1.8, seed: 313 });
  };
  P.cross = function (c, x, y, w, h) {   // glowing-ish pharmacy cross on the shop front
    A.shape(c, [[x + w * 0.36, y], [x + w * 0.64, y], [x + w * 0.64, y + h * 0.36], [x + w, y + h * 0.36], [x + w, y + h * 0.64], [x + w * 0.64, y + h * 0.64],
      [x + w * 0.64, y + h], [x + w * 0.36, y + h], [x + w * 0.36, y + h * 0.64], [x, y + h * 0.64], [x, y + h * 0.36], [x + w * 0.36, y + h * 0.36]],
      { fill: '#4f9a72', seed: 314, lw: 2.2, amp: 1 });
  };
  P.puddle = function (c, x, y, w, h) { A.ell(c, x + w / 2, y + h / 2, w / 2, h / 2, { fill: 'rgba(70,84,98,.6)', seed: 315, lw: 1.3, stroke: 'rgba(27,23,20,.4)' }); };

  // ---------- map baking ----------
  var FLOOR = { '.': '#6b5240', ',': '#8b9d95', '_': '#928863', '=': '#75767a', '~': '#3a3c41', '+': '#aeb3a6', 'D': '#4f3d2f', 'F': '#4f3d2f', 'P': '#8f9a8c' };
  var FACE = { ',': '#a9b8ae', '.': '#8b7a5e', '_': '#9c9478', '=': '#6e4a3c', '+': '#c5cdbd', 'D': '#8b7a5e' };
  function isWall(ch) { return ch === '#' || ch === ' ' || ch === undefined; }

  A.buildMap = function (L) {
    var T = R.TILE, S = 2, cvs = document.createElement('canvas');
    cvs.width = L.w * T * S; cvs.height = L.h * T * S;
    var c = cvs.getContext('2d'); c.scale(S, S);
    var x, y, i, ch, px, py, r;
    function at(cx, cy) { return (L.rows[cy] || '')[cx]; }

    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) {
      ch = at(x, y); px = x * T; py = y * T; r = R.rng(x * 131 + y * 977 + 7);
      if (isWall(ch)) {
        c.fillStyle = ch === '#' ? '#24201d' : '#1c1917'; c.fillRect(px, py, T, T);
        if (ch === ' ') A.hatch(c, px, py, T, T, 9, 'rgba(255,255,255,.035)', 1);
        continue;
      }
      c.fillStyle = FLOOR[ch]; c.fillRect(px, py, T, T);
      c.strokeStyle = 'rgba(27,23,20,.28)'; c.lineWidth = 1; c.beginPath();
      if (ch === '.' || ch === 'D' || ch === 'F') {
        for (i = 0; i < 4; i++) { c.moveTo(px, py + i * 12 + 0.5); c.lineTo(px + T, py + i * 12 + 0.5); c.moveTo(px + ((i * 19 + y * 7) % T), py + i * 12); c.lineTo(px + ((i * 19 + y * 7) % T), py + i * 12 + 12); }
      } else if (ch === ',') {
        for (i = 0; i < 2; i++) { c.moveTo(px + i * 24 + 0.5, py); c.lineTo(px + i * 24 + 0.5, py + T); c.moveTo(px, py + i * 24 + 0.5); c.lineTo(px + T, py + i * 24 + 0.5); }
      } else if (ch === '_') {
        c.fillStyle = '#857b58'; c.fillRect(px, py, 24, 24); c.fillRect(px + 24, py + 24, 24, 24);
      } else if (ch === '=') {
        c.moveTo(px, py + 0.5); c.lineTo(px + T, py + 0.5); var ox = (y % 2) * 24; c.moveTo(px + ox + 0.5, py); c.lineTo(px + ox + 0.5, py + T);
      } else if (ch === '+' || ch === 'P') {
        c.moveTo(px + 0.5, py); c.lineTo(px + 0.5, py + T); c.moveTo(px, py + 0.5); c.lineTo(px + T, py + 0.5);
      }
      c.stroke();
      // grime
      if (r() < 0.3) { c.fillStyle = 'rgba(27,23,20,' + (0.06 + r() * 0.1) + ')'; c.beginPath(); c.ellipse(px + r() * T, py + r() * T, 4 + r() * 9, 3 + r() * 6, r() * 3, 0, 7); c.fill(); }
      if (ch === '=' && r() < 0.35) { c.fillStyle = 'rgba(210,205,190,.35)'; c.fillRect(px + r() * 40, py + r() * 40, 3, 2); }
      if (ch === '~') {
        if (at(x, y - 1) === '=') {
          c.fillStyle = '#9a9a96'; c.fillRect(px, py, T, 6);
          c.fillStyle = '#b39a3a'; c.fillRect(px, py + 11, T, 2.5); c.fillRect(px, py + 16, T, 2.5);
        }
        if (at(x, y + 1) === '~' && x % 2 === 0) { c.fillStyle = 'rgba(220,220,210,.5)'; c.fillRect(px + 6, py + T - 3, 34, 4); }
      }
    }

    // wall faces (the side of a wall you can see from the room below it)
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) {
      if (at(x, y) !== '#') continue;
      var below = at(x, y + 1); px = x * T; py = y * T;
      if (isWall(below) || below === '~') continue;
      var fy = py + T * 0.36, fh = T * 0.64;
      c.fillStyle = FACE[below] || '#8b7a5e'; c.fillRect(px, fy, T, fh);
      c.strokeStyle = 'rgba(27,23,20,.25)'; c.lineWidth = 1; c.beginPath();
      if (below === '=') {
        for (i = 0; i < 4; i++) { c.moveTo(px, fy + i * 8 + 0.5); c.lineTo(px + T, fy + i * 8 + 0.5); for (var j = 0; j < 3; j++) { var bx = px + j * 16 + (i % 2) * 8; c.moveTo(bx, fy + i * 8); c.lineTo(bx, fy + i * 8 + 8); } }
      } else if (below === ',' || below === '_') {
        for (i = 0; i < 4; i++) { c.moveTo(px + i * 12 + 0.5, fy); c.lineTo(px + i * 12 + 0.5, fy + fh); } c.moveTo(px, fy + fh / 2); c.lineTo(px + T, fy + fh / 2);
      } else if (below === '.') {
        for (i = 0; i < 3; i++) { c.moveTo(px + 8 + i * 16, fy); c.lineTo(px + 8 + i * 16, fy + fh); }
      }
      c.stroke();
      r = R.rng(x * 53 + y * 17);
      if (r() < 0.4) { c.fillStyle = 'rgba(40,50,30,.18)'; c.beginPath(); c.ellipse(px + r() * T, fy + 4, 10 + r() * 8, 6 + r() * 6, 0, 0, 7); c.fill(); }
      c.fillStyle = 'rgba(27,23,20,.45)'; c.fillRect(px, fy + fh - 4, T, 4);
      A.line(c, [[px, fy], [px + T, fy]], { lw: 2.6, seed: x * 7 + y * 13, amp: 1.2 });
    }

    // thick ink outline where floor meets wall
    for (y = 0; y < L.h; y++) for (x = 0; x < L.w; x++) {
      ch = at(x, y); if (isWall(ch) || ch === '~') continue;
      px = x * T; py = y * T;
      var o = { lw: 2.8, seed: x * 31 + y * 71, amp: 1.3 };
      if (isWall(at(x - 1, y))) A.line(c, [[px, py], [px, py + T]], o);
      if (isWall(at(x + 1, y))) A.line(c, [[px + T, py], [px + T, py + T]], o);
      if (isWall(at(x, y + 1))) A.line(c, [[px, py + T], [px + T, py + T]], o);
    }

    // props
    L.props.forEach(function (p) { if (P[p.t]) P[p.t](c, p.x * T, p.y * T, p.w * T, p.h * T); });
    return cvs;
  };
})(window.RTT);
