/* Road to Turkey — core: namespace, helpers, local storage, settings, audio. */
window.RTT = window.RTT || {};
(function (R) {
  'use strict';

  R.TILE = 48;       // world pixels per map tile
  R.GOAL = 3000;     // euros needed for Istanbul
  R.SAVE_KEY = 'rtt_adventure_save_v1';
  R.SETTINGS_KEY = 'rtt_adventure_settings_v1';

  R.$ = function (id) { return document.getElementById(id); };
  R.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  R.lerp = function (a, b, t) { return a + (b - a) * t; };
  R.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  R.euro = function (n) { return '€' + Math.round(n).toLocaleString('en-GB'); };

  // Small seeded random generator, so "hand-drawn" wobble is repeatable.
  R.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---- Local storage (never throws: private tabs can block it) ----
  R.store = {
    get: function (key) {
      try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    del: function (key) { try { localStorage.removeItem(key); } catch (e) {} },
  };

  // ---- Settings ----
  var saved = R.store.get(R.SETTINGS_KEY) || {};
  R.settings = {
    sound: saved.sound !== false,
    vibe: saved.vibe !== false,
    fastText: saved.fastText === true,
  };
  R.saveSettings = function () { R.store.set(R.SETTINGS_KEY, R.settings); };

  // ---- Audio (tiny synth, no audio files) ----
  var ac = null;
  R.audioInit = function () {
    if (ac || !R.settings.sound) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
  };
  R.audioResume = function () {
    R.audioInit();
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
  };
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!R.settings.sound || !ac) return;
    try {
      var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  R.sfx = {
    ui: function () { tone(420, 0.06, 'square', 0.03); },
    blip: function (pitch) { tone(pitch || 180, 0.04, 'square', 0.022); },
    cash: function () { tone(900, 0.07, 'square', 0.04); tone(1350, 0.1, 'square', 0.04, 0, 0.06); },
    item: function () { tone(500, 0.1, 'triangle', 0.08); tone(750, 0.16, 'triangle', 0.08, 0, 0.09); },
    good: function () { tone(523, 0.1, 'triangle', 0.08); tone(659, 0.1, 'triangle', 0.08, 0, 0.1); tone(784, 0.2, 'triangle', 0.08, 0, 0.2); },
    bad: function () { tone(200, 0.3, 'sawtooth', 0.06, 70); },
    door: function () { tone(140, 0.12, 'square', 0.05, 90); tone(260, 0.1, 'square', 0.04, 0, 0.12); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.09, 0, i * 0.13); }); },
    lose: function () { [392, 330, 262, 175].forEach(function (f, i) { tone(f, 0.3, 'sawtooth', 0.05, 0, i * 0.18); }); },
  };
  R.buzz = function (pattern) {
    if (!R.settings.vibe) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  };
})(window.RTT);
