/* Shared stage for the games: canvases, scoreboard, sound, effects, input and the frame loop.
   Each sport registers itself with JP.register and draws its own court. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('court'), floor = $('floor');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var body = document.body;

  var JP = window.JP = {
    ctx: ctx, W: 0, H: 0, dpr: 1, S: 1, land: true, clock: 0,
    state: 'idle', score: 0, outs: 0,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    CHALK: '#fbf6ea', INK: '#14233b', NAVY: '#1b2f4f', ORANGE: '#ee6420',
    FONT: 'Anton, Impact, "Arial Narrow", sans-serif',
    SERIF: 'Fraunces, Georgia, serif',
    MONO: '"IBM Plex Mono", ui-monospace, monospace',
    WORDS: ['JEFF', 'PETTYJOHN'],
    games: {}, game: null, mode: ''
  };

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  JP.store = store;
  JP.register = function (key, game) { JP.games[key] = game; };

  /* ---------- layout ---------- */
  function layout() {
    var W = JP.W = window.innerWidth, H = JP.H = window.innerHeight;
    JP.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    JP.S = Math.sqrt(W * H) / 900;
    JP.land = W >= H;
    canvas.width = floor.width = Math.round(W * JP.dpr);
    canvas.height = floor.height = Math.round(H * JP.dpr);
    JP.keepOut = [{ x0: 0, y0: 0, x1: W, y1: 74 }];
    var info = $('info');
    if (info) {
      var r = info.getBoundingClientRect();
      JP.keepOut.push({ x0: r.left - 10, y0: r.top - 10, x1: r.right + 10, y1: r.bottom + 10 });
    }
    if (JP.game) {
      JP.game.layout();
      var f = floor.getContext('2d');
      f.setTransform(JP.dpr, 0, 0, JP.dpr, 0, 0);
      f.clearRect(0, 0, W, H);
      JP.game.floor(f);
    }
  }

  /* ---------- effects ---------- */
  var fx = [], shake = 0, freeze = 0;
  JP.say = function (text, x, y, big, color) { fx.push({ kind: 'text', text: text, x: x, y: y, t0: JP.clock, life: big ? 1.3 : 0.95, big: big, color: color }); };
  JP.puff = function (x, y, n, color, speed) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = (40 + Math.random() * 160) * (speed || 1);
      fx.push({ kind: 'dot', x: x, y: y, vx: Math.cos(a) * s * JP.S, vy: Math.sin(a) * s * JP.S, t0: JP.clock, life: 0.35 + Math.random() * 0.4, color: color, r: 1.6 + Math.random() * 1.6 });
    }
  };
  JP.ring = function (x, y, r, color) { fx.push({ kind: 'ring', x: x, y: y, r: r, t0: JP.clock, life: 0.5, color: color }); };
  JP.shake = function (amt) { if (!JP.reduced) shake = Math.max(shake, amt); };
  JP.hitStop = function (sec) { freeze = Math.max(freeze, sec); };
  JP.clearFx = function () { fx.length = 0; };

  function drawFx(dt) {
    var W = JP.W;
    for (var i = fx.length - 1; i >= 0; i--) {
      var e = fx[i], age = (JP.clock - e.t0) / e.life;
      if (age >= 1) { fx.splice(i, 1); continue; }
      if (e.kind === 'dot') {
        e.vx *= 1 - 2.5 * dt; e.vy *= 1 - 2.5 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
        ctx.globalAlpha = 1 - age; ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.2832); ctx.fill();
      } else if (e.kind === 'ring') {
        ctx.globalAlpha = 1 - age; ctx.strokeStyle = e.color; ctx.lineWidth = 3 * (1 - age) + 0.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.4 + age * 1.2), 0, 6.2832); ctx.stroke();
      } else {
        var size = e.big ? Math.max(24, Math.min(46, Math.min(W, JP.H) * 0.055)) : 13;
        var pop = e.big ? 1 + Math.max(0, 0.25 - age) * 1.6 : 1;
        ctx.globalAlpha = age < 0.75 ? 1 : (1 - age) * 4;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = e.big ? 'italic 600 ' + (size * pop) + 'px ' + JP.SERIF : '500 ' + size + 'px ' + JP.MONO;
        var tw = ctx.measureText(e.text).width / 2 + 8;
        var tx = Math.max(tw, Math.min(W - tw, e.x)), ty = Math.max(84, e.y - age * 22);
        ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = JP.INK; ctx.strokeText(e.text, tx, ty);
        ctx.fillStyle = e.color || (e.big ? JP.CHALK : '#ffb37a'); ctx.fillText(e.text, tx, ty);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- shared drawing ---------- */
  // kind: 0 basketball, 1 tennis ball, 2 baseball
  JP.drawBall = function (kind, x, y, r, ang, alpha, noShadow) {
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(x, y);
    if (!noShadow) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(r * 0.12, r * 0.2, r, 0, 6.2832); ctx.fill(); }
    ctx.rotate(ang || 0);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832);
    if (kind === 0) {
      ctx.fillStyle = JP.ORANGE; ctx.fill();
      ctx.strokeStyle = '#3a1a0c'; ctx.lineWidth = Math.max(1.2, r * 0.09);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.moveTo(-r * 0.75, -r); ctx.quadraticCurveTo(-r * 0.2, 0, -r * 0.75, r);
      ctx.moveTo(r * 0.75, -r); ctx.quadraticCurveTo(r * 0.2, 0, r * 0.75, r);
      ctx.stroke(); ctx.restore();
    } else if (kind === 1) {
      ctx.fillStyle = '#d9ee3f'; ctx.fill();
      ctx.strokeStyle = '#fbfff0'; ctx.lineWidth = Math.max(1.2, r * 0.16);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.arc(-r * 1.25, 0, r, -1.1, 1.1); ctx.moveTo(r * 1.25 + r * Math.cos(Math.PI - 1.1), r * Math.sin(Math.PI - 1.1));
      ctx.arc(r * 1.25, 0, r, Math.PI - 1.1, Math.PI + 1.1);
      ctx.stroke(); ctx.restore();
    } else {
      ctx.fillStyle = '#fbf8ee'; ctx.fill();
      ctx.strokeStyle = '#d2322d'; ctx.lineWidth = Math.max(1.2, r * 0.13);
      ctx.setLineDash([r * 0.16, r * 0.14]);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.arc(-r * 1.2, 0, r * 0.95, -1.1, 1.1); ctx.moveTo(r * 1.2 + r * 0.95 * Math.cos(Math.PI - 1.1), r * 0.95 * Math.sin(Math.PI - 1.1));
      ctx.arc(r * 1.2, 0, r * 0.95, Math.PI - 1.1, Math.PI + 1.1);
      ctx.stroke(); ctx.restore();
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  // A quadcopter seen from above. `alt` lifts it off the floor (bigger, with its shadow further away).
  JP.droneTop = function (x, y, size, rot, alt, glow) {
    var s = size * (1 + alt * 0.25), i;
    ctx.save();
    ctx.fillStyle = 'rgba(8,16,30,.25)';
    ctx.beginPath(); ctx.ellipse(x + size * (0.25 + alt * 0.9), y + size * (0.35 + alt * 1.3), size * 1.25, size * 1.0, 0, 0, 6.2832); ctx.fill();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = '#c9d2d0'; ctx.lineWidth = Math.max(2.5, s * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-s, -s); ctx.lineTo(s, s); ctx.moveTo(s, -s); ctx.lineTo(-s, s); ctx.stroke();
    for (i = 0; i < 4; i++) {
      var mx = (i % 2 ? 1 : -1) * s, my = (i < 2 ? -1 : 1) * s;
      ctx.fillStyle = 'rgba(20,35,59,.16)'; ctx.beginPath(); ctx.arc(mx, my, s * 0.62, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(20,35,59,.5)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
      var a = JP.reduced ? 0.6 : JP.clock * 31 * (i % 2 ? 1 : -1) + i;
      ctx.beginPath(); ctx.moveTo(mx - Math.cos(a) * s * 0.58, my - Math.sin(a) * s * 0.58); ctx.lineTo(mx + Math.cos(a) * s * 0.58, my + Math.sin(a) * s * 0.58); ctx.stroke();
      ctx.fillStyle = '#8f9a98'; ctx.beginPath(); ctx.arc(mx, my, s * 0.13, 0, 6.2832); ctx.fill();
    }
    ctx.fillStyle = '#e9eeeb'; ctx.strokeStyle = JP.INK; ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-s * 0.5, -s * 0.62, s, s * 1.24, s * 0.3); else ctx.rect(-s * 0.5, -s * 0.62, s, s * 1.24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = JP.INK; ctx.beginPath(); ctx.arc(0, s * 0.3, s * 0.2, 0, 6.2832); ctx.fill();       // camera, facing "down" the screen
    ctx.fillStyle = glow ? '#ffd27a' : ((JP.clock % 1.4) < 0.7 ? JP.ORANGE : '#8a3a1c');
    ctx.beginPath(); ctx.arc(0, -s * 0.28, s * 0.12, 0, 6.2832); ctx.fill();
    ctx.restore();
  };

  // Letters of a word with their x positions, so they can be drawn (and hit) one at a time.
  JP.glyphs = function (c, word, x, y, firstId) {
    var out = [];
    for (var i = 0; i < word.length; i++) out.push({ ch: word[i], x: x + c.measureText(word.slice(0, i)).width, y: y, w: c.measureText(word[i]).width, id: firstId + i, flash: 0 });
    return out;
  };

  /* ---------- sound ---------- */
  var audio = null, muted = store('jp.mute') === '1';
  function ac() {
    if (muted) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, slide, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, type, freq, q, vol, sweep, attack) {
    var a = ac(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    n.buffer = noiseBuf; n.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(a.destination);
    n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.02);
  }
  // The letters of the name are a drum kit.
  var KIT = ['kick', 'snare', 'tomH', 'tomL', 'hat', 'snare', 'tomH', 'tomM', 'cow', 'kick', 'hat', 'tomL', 'crash'];
  var lastHit = 0;
  JP.sound = {
    tone: tone, noise: noise,
    drum: function (id, power) {
      if (JP.clock - lastHit < 0.035) return;
      lastHit = JP.clock;
      var v = Math.max(0.25, Math.min(1, power)), k = KIT[(id - 1) % KIT.length];
      if (k === 'kick') tone(150, 0.22, 'sine', 0.3 * v, 45);
      else if (k === 'snare') { noise(0.16, 'bandpass', 1900, 0.7, 0.2 * v); tone(190, 0.09, 'triangle', 0.1 * v, 140); }
      else if (k === 'hat') noise(0.06, 'highpass', 7000, 0.7, 0.13 * v);
      else if (k === 'crash') noise(0.7, 'highpass', 4500, 0.5, 0.12 * v);
      else if (k === 'cow') { tone(545, 0.12, 'square', 0.05 * v); tone(815, 0.12, 'square', 0.04 * v); }
      else tone(k === 'tomH' ? 230 : k === 'tomM' ? 175 : 130, 0.2, 'sine', 0.24 * v, k === 'tomH' ? 150 : k === 'tomM' ? 110 : 80);
    },
    thud: function (power, pitch) { tone(pitch || 150, 0.1, 'sine', Math.min(0.16, 0.03 + power * 0.13), (pitch || 150) * 0.6); },
    rim: function () { tone(620, 0.16, 'square', 0.03, 540); tone(930, 0.12, 'triangle', 0.035); },
    swish: function () { noise(0.42, 'bandpass', 2400, 0.9, 0.12, 650, 0.05); },
    racket: function (power) { tone(520, 0.08, 'triangle', 0.1 + 0.08 * (power || 0.5), 290); noise(0.05, 'bandpass', 1500, 1, 0.08); },
    crack: function () { noise(0.07, 'bandpass', 2300, 0.8, 0.3); tone(900, 0.06, 'square', 0.05, 380); tone(180, 0.1, 'sine', 0.12, 90); },
    mitt: function () { tone(130, 0.14, 'sine', 0.22, 70); noise(0.05, 'lowpass', 900, 0.7, 0.15); },
    whiff: function () { noise(0.2, 'bandpass', 900, 0.8, 0.07, 2600, 0.08); },
    good: function () { tone(660, 0.14, 'triangle', 0.06); tone(990, 0.2, 'triangle', 0.06, 0, 0.09); },
    great: function () { tone(523, 0.14, 'triangle', 0.07); tone(659, 0.14, 'triangle', 0.07, 0, 0.1); tone(784, 0.14, 'triangle', 0.07, 0, 0.2); tone(1047, 0.3, 'triangle', 0.07, 0, 0.3); },
    bad: function () { tone(160, 0.3, 'sawtooth', 0.05, 90); },
    launch: function () { tone(240, 0.12, 'sine', 0.07, 520); },
    whir: function () { noise(0.5, 'bandpass', 500, 2, 0.04, 900, 0.2); }
  };

  /* ---------- scoreboard and flow ---------- */
  function best() { return parseInt(store('jp.best.' + JP.mode), 10) || 0; }
  function hud() {
    $('score').textContent = JP.score;
    $('best').textContent = best() || '–';
    var marks = document.querySelectorAll('#strikes i');
    for (var i = 0; i < marks.length; i++) marks[i].className = i < JP.outs ? 'on' : '';
    $('strikes').setAttribute('aria-label', JP.outs + ' of 3 ' + (JP.game.outWord || 'strikes'));
  }
  JP.goal = function (text) { $('goal').textContent = text; };
  JP.addScore = function (n) { JP.score += n; hud(); };
  function setState(s) {
    JP.state = s;
    body.setAttribute('data-state', s);
    $('over').inert = s !== 'over';
    $('modes').inert = s === 'play';
  }
  JP.begin = function () { if (JP.state === 'idle') setState('play'); };
  // One strike/out. Returns true when that ends the run.
  JP.out = function () {
    JP.outs++; hud();
    if (JP.outs < 3) return false;
    var isBest = JP.score > best();
    if (isBest) store('jp.best.' + JP.mode, String(JP.score));
    $('over-title').textContent = JP.game.overTitle || 'Three strikes';
    $('over-score').textContent = JP.score;
    $('over-unit').textContent = JP.game.unit ? JP.game.unit(JP.score) : (JP.score === 1 ? 'point' : 'points');
    $('over-best').textContent = isBest ? 'A new personal best.' : 'Your best: ' + best();
    $('over-best').classList.toggle('new', isBest);
    hud();
    setTimeout(function () {
      if (JP.outs < 3) return;
      setState('over');
      setTimeout(function () { var a = $('again'); if (a && JP.state === 'over') a.focus({ preventScroll: true }); }, 450);
    }, 650);
    return true;
  };
  function restart() {
    JP.score = 0; JP.outs = 0; fx.length = 0; shake = 0; freeze = 0;
    setState('idle');
    JP.game.reset();
    hud();
  }

  var LABEL = { hoops: 'Basketball', baseball: 'Baseball', tennis: 'Tennis', mixed: 'Mixed' };
  function setMode(key) {
    if (!JP.games[key]) key = 'hoops';
    JP.mode = key; JP.game = JP.games[key];
    body.setAttribute('data-mode', key);
    store('jp.mode', key);
    var btns = document.querySelectorAll('#modes button');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-mode') === key ? 'true' : 'false');
    $('lede-how').textContent = JP.game.lede;
    layout();
    restart();
  }

  /* ---------- input ---------- */
  var active = null;
  function pt(e) { return { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' }; }
  window.addEventListener('pointerdown', function (e) {
    if (e.button || JP.state === 'over' || !JP.game) return;
    if (e.target.closest && e.target.closest('a,button')) return;
    e.preventDefault();
    active = e.pointerId;
    JP.game.down(pt(e));
  }, { passive: false });
  window.addEventListener('pointermove', function (e) { if (JP.game && JP.state !== 'over') JP.game.move(pt(e), e.pointerId === active); });
  window.addEventListener('pointerup', function (e) { if (e.pointerId === active) { active = null; if (JP.game && JP.state !== 'over') JP.game.up(pt(e)); } });
  window.addEventListener('pointercancel', function () { active = null; if (JP.game && JP.game.cancel) JP.game.cancel(); });
  window.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    var onButton = e.target && /^(BUTTON|A)$/.test(e.target.tagName);
    if (e.code === 'Escape' && JP.state !== 'idle') { restart(); return; }
    if (e.code === 'Space' && !onButton && !e.repeat && JP.state !== 'over' && JP.game && JP.game.key) { e.preventDefault(); JP.game.key(); }
  });

  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  on('again', restart);
  on('close', restart);
  on('over-x', restart);
  $('modes').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && b.getAttribute('data-mode') !== JP.mode) { history.replaceState(null, '', '#' + b.getAttribute('data-mode')); setMode(b.getAttribute('data-mode')); }
  });
  var muteBtn = $('mute');
  function showMute() { muteBtn.textContent = muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false'); }
  on('mute', function () { muted = !muted; store('jp.mute', muted ? '1' : '0'); showMute(); tone(520, 0.1, 'triangle', 0.07); });
  showMute();
  on('share', function () {
    var btn = $('share'), url = location.origin + location.pathname + '#' + JP.mode;
    var text = 'I scored ' + JP.score + ' at ' + LABEL[JP.mode].toLowerCase() + ' against a drone. Three ' + (JP.game.outWord || 'strikes') + ' and you’re out:';
    function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Challenge a friend'; }, 2200); }
    if (navigator.share) navigator.share({ text: text, url: url }).catch(function () { /* cancelled */ });
    else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { done('Link copied'); }, function () { done('Could not copy'); });
    else window.prompt('Copy this link:', url);
  });

  // keep scrapers guessing, let humans click
  var mail = $('email');
  if (mail) mail.href = 'mai' + 'lto:' + mail.getAttribute('data-u') + '@' + mail.getAttribute('data-d');

  /* ---------- frame loop ---------- */
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.04, (now - last) / 1000 || 0);
    last = now;
    if (document.hidden || !JP.game) return;
    if (freeze > 0) { freeze -= dt; dt = 0; }
    JP.clock += dt;
    if (dt) JP.game.update(dt);
    ctx.setTransform(JP.dpr, 0, 0, JP.dpr, 0, 0);
    ctx.clearRect(0, 0, JP.W, JP.H);
    if (shake > 0.3) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= Math.pow(0.002, dt || 0.016); }
    JP.game.draw();
    drawFx(dt);
  }

  function start() {
    var m = /^#(hoops|baseball|tennis|mixed)$/.exec(location.hash);
    setMode(m ? m[1] : (store('jp.mode') || 'hoops'));
    window.addEventListener('resize', function () { layout(); restart(); });
    requestAnimationFrame(frame);
  }
  var started = false;
  function once() { if (!started) { started = true; start(); } }
  window.addEventListener('DOMContentLoaded', function () {
    if (document.fonts && document.fonts.load) {
      document.fonts.load('400 100px Anton').then(once, once);
      setTimeout(once, 1500);
    } else once();
  });

  JP.debug = function () { var d = JP.game.debug ? JP.game.debug() : {}; d.state = JP.state; d.score = JP.score; d.outs = JP.outs; d.mode = JP.mode; return d; };
})();
