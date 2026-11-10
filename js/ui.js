/* Road to Turkey — UI: screens, HUD meters, mission tracker, bag (inventory), toasts, settings. */
(function (R) {
  'use strict';
  var $ = R.$, A = R.art;
  var U = R.ui = {};
  var stack = [];              // open overlay screens, last = on top
  var faces = {};              // big animated faces on defeat / complete screens
  var lastMission = null, confirmCb = null;

  // ---------- screens ----------
  U.open = function (id) {
    var el = $(id);
    if (stack.indexOf(id) < 0) stack.push(id);
    el.classList.add('on');
  };
  U.close = function (id) {
    var i = stack.indexOf(id);
    if (i >= 0) stack.splice(i, 1);
    $(id).classList.remove('on');
  };
  U.closeAll = function () { stack.slice().forEach(U.close); };
  U.isOpen = function (id) { return stack.indexOf(id) >= 0; };
  U.top = function () { return stack[stack.length - 1] || null; };

  U.showGameUI = function (on) {
    $('hud').hidden = !on; $('actBtn').hidden = !on;
    if (!on) $('missionList').hidden = true;
  };

  // ---------- toasts ----------
  U.toast = function (text, kind) {
    var box = $('toasts'), el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    while (box.children.length >= 4) box.removeChild(box.firstChild);
    box.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
  };

  // ---------- HUD ----------
  U.currentMission = function (S) {
    var ms = R.level1.missions;
    for (var i = 0; i < ms.length; i++) if (!ms[i].opt && !S.missions[ms[i].id]) return ms[i];
    return null;
  };
  U.sync = function () {
    var S = R.game.S; if (!S) return;
    var st = A.stageOf(S.hair);
    $('txtStage').textContent = Math.round(S.hair) + '% · ' + A.STAGES[st - 1].replace(/^The /, '');
    $('barHair').style.width = R.clamp(S.hair, 0, 100) + '%';
    $('barHair').classList.toggle('low', S.hair < 25);
    $('txtConf').textContent = Math.round(S.conf) + '%';
    $('barConf').style.width = R.clamp(S.conf, 0, 100) + '%';
    $('barConf').classList.toggle('low', S.conf < 25);
    $('txtFund').textContent = R.euro(S.cash) + ' / ' + R.euro(R.GOAL);
    $('barFund').style.width = Math.max(1.5, Math.min(100, S.cash / R.GOAL * 100)) + '%';
    $('btnMute').classList.toggle('off', !R.settings.sound);

    var cur = U.currentMission(S);
    $('missionNow').textContent = cur ? '▸ ' + cur.t + (cur.prog ? '  (' + cur.prog(S) + ')' : '') : '▸ Level complete';
    var id = cur ? cur.id : 'none';
    if (lastMission !== null && id !== lastMission) {
      var b = $('missionBtn'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    }
    lastMission = id;
    if (!$('missionList').hidden) U.renderMissions();
  };
  U.renderMissions = function () {
    var S = R.game.S, ul = $('missionList'); ul.innerHTML = '';
    R.level1.missions.forEach(function (m) {
      var li = document.createElement('li');
      if (S.missions[m.id]) li.className = 'done';
      li.textContent = m.t + (m.prog && !S.missions[m.id] ? ' (' + m.prog(S) + ')' : '');
      if (m.opt) { var s = document.createElement('small'); s.textContent = ' optional'; li.appendChild(s); }
      ul.appendChild(li);
    });
  };
  U.resetMissionFlash = function () { lastMission = null; };

  // ---------- bag ----------
  U.renderBag = function () {
    var S = R.game.S, items = R.level1.items, box = $('bagList'); box.innerHTML = '';
    $('bagCash').textContent = 'Turkey Fund: ' + R.euro(S.cash) + ' of ' + R.euro(R.GOAL);
    var any = false;
    Object.keys(items).forEach(function (id) {
      var n = S.inv[id] || 0; if (!n) return;
      any = true;
      var it = items[id], row = document.createElement('div'); row.className = 'item';
      var txt = document.createElement('div');
      var name = document.createElement('strong'); name.textContent = it.name + (n > 1 ? ' ×' + n : '');
      var desc = document.createElement('span'); desc.textContent = it.desc;
      txt.appendChild(name); txt.appendChild(desc); row.appendChild(txt);
      var b = document.createElement('button'); b.type = 'button';
      if (it.type === 'hat') {
        var on = S.hat === id;
        b.textContent = on ? 'Take off' : 'Wear'; if (on) b.className = 'on';
        b.addEventListener('click', function () { R.game.toggleHat(id); });
      } else {
        b.textContent = 'Use';
        b.addEventListener('click', function () { R.game.useItem(id); });
      }
      row.appendChild(b); box.appendChild(row);
    });
    if (!any) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Lint. A receipt. Regret.'; box.appendChild(e); }
  };

  // ---------- big faces ----------
  function setupFace(id) {
    var c = $(id), dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 150 * dpr; c.height = 150 * dpr;
    var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return x;
  }
  U.setFace = function (id, opts) { faces[id] = { ctx: setupFace(id), o: opts }; };
  U.tick = function (t) {
    for (var id in faces) {
      if (!$(id).offsetParent) continue;       // only animate visible ones
      var f = faces[id]; f.o.t = t; A.portrait(f.ctx, 150, 150, f.o);
    }
  };

  U.clearToasts = function () { $('toasts').innerHTML = ''; };
  U.showDefeat = function (kind) {
    U.clearToasts();
    var S = R.game.S, d = R.level1.defeat[kind];
    $('defTitle').textContent = R.pick(d.titles);
    $('defMsg').textContent = R.pick(d.lines);
    U.setFace('defFace', { who: 'barry', stage: kind === 'hair' ? 5 : A.stageOf(S.hair), hat: null, expr: kind === 'hair' ? 'shock' : 'sad' });
    U.open('scrDefeat');
  };
  U.showDone = function () {
    U.clearToasts();
    var S = R.game.S;
    $('dnFund').textContent = R.euro(S.cash);
    $('dnHair').textContent = Math.round(S.hair) + '%';
    $('dnConf').textContent = Math.round(S.conf) + '%';
    var left = R.GOAL - S.cash;
    var mornings = Math.ceil(left / Math.max(1, S.cash));
    $('dnMsg').textContent = S.cash > 0
      ? 'Only ' + R.euro(left) + ' to go. At this rate: ' + mornings.toLocaleString('en-GB') + ' more mornings exactly like this one.'
      : 'The fund stands at nothing. But the scalp has HOPE, and hope is free.';
    U.setFace('doneFace', { who: 'barry', stage: A.stageOf(S.hair), hat: S.hat, expr: 'happy' });
    U.open('scrDone');
  };

  // ---------- confirm ----------
  U.confirm = function (msg, yesLabel, cb) {
    $('cfMsg').textContent = msg; $('cfYes').textContent = yesLabel; confirmCb = cb;
    U.open('scrConfirm');
  };

  // ---------- settings ----------
  function paintSettings() {
    [['setSound', 'sound'], ['setVibe', 'vibe'], ['setFast', 'fastText']].forEach(function (p) {
      var el = $(p[0]), on = !!R.settings[p[1]];
      el.classList.toggle('off', !on); el.querySelector('b').textContent = on ? 'ON' : 'OFF';
    });
    $('btnReset').disabled = !R.game.hasSave();
  }
  U.openSettings = function () { paintSettings(); U.open('scrSettings'); };
  U.refreshTitle = function () { $('btnContinue').disabled = !R.game.hasSave(); };

  // ---------- wiring ----------
  U.init = function () {
    var G = R.game;
    function on(id, fn) { $(id).addEventListener('click', function (e) { R.audioResume(); R.sfx.ui(); fn(e); }); }

    on('btnPlay', function () {
      if (G.hasSave()) U.confirm('Start a new game? Your saved progress will be replaced.', 'New game', function () { G.newGame(); });
      else G.newGame();
    });
    on('btnContinue', function () { G.continueGame(); });
    on('btnSettings', U.openSettings);

    on('setSound', function () { R.settings.sound = !R.settings.sound; R.saveSettings(); R.audioResume(); paintSettings(); U.sync(); });
    on('setVibe', function () { R.settings.vibe = !R.settings.vibe; R.saveSettings(); R.buzz(30); paintSettings(); });
    on('setFast', function () { R.settings.fastText = !R.settings.fastText; R.saveSettings(); paintSettings(); });
    on('btnReset', function () {
      U.confirm('Delete saved progress? Barry will forget everything. Again.', 'Delete', function () {
        G.deleteSave(); paintSettings(); U.refreshTitle(); U.toast('Saved progress deleted');
      });
    });
    on('btnSetBack', function () { U.close('scrSettings'); });

    on('btnPause', function () { G.pause(); });
    on('btnBag', function () { G.openBag(); });
    on('btnMute', function () { R.settings.sound = !R.settings.sound; R.saveSettings(); R.audioResume(); U.sync(); U.toast(R.settings.sound ? 'Sound on' : 'Sound off'); });
    on('missionBtn', function () {
      var ul = $('missionList'); ul.hidden = !ul.hidden;
      if (!ul.hidden) U.renderMissions();
    });

    on('btnResume', function () { G.resume(); });
    on('btnPBag', function () { U.renderBag(); U.open('scrBag'); });
    on('btnRestart', function () {
      U.confirm('Restart "The Mirror Incident" from the beginning?', 'Restart', function () { G.newGame(); });
    });
    on('btnPSettings', U.openSettings);
    on('btnQuit', function () { G.quit(); });
    on('btnBagBack', function () { G.closeBag(); });

    on('btnRetry', function () { G.newGame(); });
    on('btnDefTitle', function () { G.quit(true); });
    on('btnReplay', function () { G.newGame(); });
    on('btnDoneTitle', function () { G.quit(true); });

    on('cfYes', function () { U.close('scrConfirm'); var cb = confirmCb; confirmCb = null; if (cb) cb(); });
    on('cfNo', function () { U.close('scrConfirm'); confirmCb = null; });

    $('actBtn').addEventListener('click', function () { R.audioResume(); G.act(); });
    U.open('scrTitle');      // register the title screen so closeAll() can hide it
    U.refreshTitle();
  };
})(window.RTT);
