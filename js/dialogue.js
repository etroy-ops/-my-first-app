/* Road to Turkey — dialogue engine: typewriter text, animated portraits, branching choices. */
(function (R) {
  'use strict';
  var $ = R.$, A = R.art;
  var D = R.dlg = { open: false };
  var node = null, full = '', shown = 0, typing = false, acc = 0, revealedAt = 0, choices = [];
  var PITCH = { barry: 150, mirror: 215, gary: 118, moira: 265 };
  var pc = null, pctx = null, PS = 96;

  function val(v) { return typeof v === 'function' ? v(R.game.S) : v; }

  function setupPortrait() {
    if (pc) return;
    pc = $('dlgPortrait'); pctx = pc.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    pc.width = PS * dpr; pc.height = PS * dpr;
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  D.start = function (id) {
    setupPortrait();
    D.open = true;
    $('dlg').hidden = false;
    show(id);
  };

  function show(id) {
    node = R.level1.nodes[id];
    if (!node) { D.close(); return; }
    if (node.fx) R.game.fx(val(node.fx));
    if (!D.open) return;                     // an effect ended the game
    full = String(val(node.text));
    shown = R.settings.fastText ? full.length : 0;
    typing = shown < full.length; acc = 0;
    $('dlg').className = node.who === 'narr' ? 'narr' : '';
    $('dlgName').textContent = R.level1.names[node.who] || '';
    pc.hidden = node.who === 'narr';
    $('dlgText').textContent = full.slice(0, shown);
    $('dlgChoices').innerHTML = '';
    $('dlgNext').hidden = true;
    choices = [];
    if (!typing) reveal();
  }

  function reveal() {
    typing = false; shown = full.length; revealedAt = Date.now();
    $('dlgText').textContent = full;
    var S = R.game.S, box = $('dlgChoices');
    choices = (node.choices || []).filter(function (c) { return !c.show || c.show(S); });
    if (!choices.length) { $('dlgNext').hidden = false; return; }
    choices.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'choice'; b.type = 'button';
      b.textContent = val(c.t);
      if (c.ok && !c.ok(S)) {
        b.disabled = true;
        var why = document.createElement('small'); why.textContent = c.why || 'not available'; b.appendChild(why);
      }
      b.addEventListener('click', function (e) { e.stopPropagation(); D.choose(i); });
      box.appendChild(b);
    });
  }

  D.choose = function (i) {
    var c = choices[i];
    if (!c || typing || !D.open) return;
    if (Date.now() - revealedAt < 220) return;          // guard against a stray double-tap
    if (c.ok && !c.ok(R.game.S)) return;
    R.sfx.ui();
    if (c.fx) R.game.fx(val(c.fx));
    if (!D.open) return;
    var go = val(c.go);
    if (go) show(go); else D.close();
  };

  // tap anywhere on the box: finish typing, or move on
  D.tap = function () {
    if (!D.open) return;
    if (typing) { reveal(); return; }
    if (choices.length) return;
    var next = val(node.next);
    if (next) show(next); else D.close();
  };

  D.close = function () {
    if (!D.open) return;
    D.open = false; $('dlg').hidden = true;
    R.game.dialogueEnded();
  };
  D.abort = function () { D.open = false; $('dlg').hidden = true; };

  D.tick = function (dt, t) {
    if (!D.open || !node) return;
    if (typing) {
      var before = Math.floor(shown);
      acc += dt * 46;
      shown = Math.min(full.length, acc);
      var now = Math.floor(shown);
      if (now !== before) {
        $('dlgText').textContent = full.slice(0, now);
        if (now % 3 === 0 && PITCH[node.who]) R.sfx.blip(PITCH[node.who] + (now % 5) * 9);
      }
      if (shown >= full.length) reveal();
    }
    if (node.who !== 'narr') {
      var S = R.game.S, mine = node.who === 'barry' || node.who === 'mirror';
      A.portrait(pctx, PS, PS, {
        who: node.who, expr: node.face || 'neutral', t: t,
        stage: mine ? A.stageOf(S.hair) : 0, hat: mine ? S.hat : null,
      });
    }
  };

  $('dlg').addEventListener('click', function () { D.tap(); });
})(window.RTT);
