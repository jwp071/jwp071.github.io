/* The name on the page is solid. The dot after it is a ball. A drone holds the hoop. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('court');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var WORDS = ['JEFF', 'PETTYJOHN'];
  var CHALK = '#fbf6ea', SHADE = '#14233b', ORANGE = '#ee6420', NAVY = '#1b2f4f';
  var FONT = 'Anton, Impact, "Arial Narrow", sans-serif', SERIF = 'Fraunces, Georgia, serif';
  var DT = 1 / 240;

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- layout: everything is sized from the viewport ---------- */
  var W = 0, H = 0, dpr = 1, S = 1, G = 0, VMAX = 0, MAXPULL = 0;
  var fs = 100, nameX = 0, base = [0, 0], home = { x: 0, y: 0 };
  var Rb = 16, RW = 26, TR = 21;
  var mask = null, mw = 0, mh = 0, ms = 1;
  var keepOut = [];
  var BALLS = [];

  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    S = Math.sqrt(W * H) / 900;
    G = 1900 * S; VMAX = 1650 * S;
    MAXPULL = Math.max(90, Math.min(170, 0.2 * Math.min(W, H)));

    var margin = Math.max(22, W * 0.06);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var wide = 4, cap = 0.73;
    fs = 100;
    for (var pass = 0; pass < 3; pass++) {
      ctx.font = '400 ' + fs + 'px ' + FONT;
      wide = ctx.measureText(WORDS[1]).width / fs;
      cap = (ctx.measureText('H').actualBoundingBoxAscent || fs * 0.73) / fs;
      fs = Math.min((W - 2 * margin - 34) / (wide + 0.2), H * 0.19 / cap, 330);
    }
    var capH = cap * fs;
    nameX = margin;
    var top = (W < 700 && H > W ? 0.36 : 0.24) * H;
    base[0] = top + capH;
    base[1] = base[0] + capH * 1.16;

    Rb = Math.max(12, Math.min(24, capH * 0.15));
    RW = Rb * 1.6;
    TR = Rb * 1.3;
    home.x = nameX + wide * fs + Rb + Math.max(6, fs * 0.05);
    home.y = base[1] - Rb;

    BALLS = [
      { name: 'Basketball', goal: 'through the hoop', r: Rb, e: 0.74, power: 1, drag: 0, kind: 0 },
      { name: 'Baseball', goal: 'into the glove on the fly', r: Math.max(8, Rb * 0.66), e: 0.42, power: 1.18, drag: 0.05, kind: 2 },
      { name: 'Tennis', goal: 'onto the racket off a bounce', r: Math.max(8, Rb * 0.62), e: 0.86, power: 1.08, drag: 0.25, kind: 1 }
    ];

    // collision mask: which pixels are letter
    ms = W * H > 2.5e6 ? 0.5 : 1;
    mw = Math.ceil(W * ms); mh = Math.ceil(H * ms);
    var off = document.createElement('canvas');
    off.width = mw; off.height = mh;
    var o = off.getContext('2d', { willReadFrequently: true });
    o.scale(ms, ms);
    o.font = '400 ' + fs + 'px ' + FONT;
    o.textBaseline = 'alphabetic';
    o.fillStyle = '#000';
    o.fillText(WORDS[0], nameX, base[0]);
    o.fillText(WORDS[1], nameX, base[1]);
    var d = o.getImageData(0, 0, mw, mh).data;
    mask = new Uint8Array(mw * mh);
    for (var i = 0, n = mw * mh; i < n; i++) mask[i] = d[i * 4 + 3] > 110 ? 1 : 0;

    keepOut = [{ x0: 0, y0: 0, x1: W, y1: 74 }];
    var info = $('info');
    if (info) {
      var r = info.getBoundingClientRect();
      keepOut.push({ x0: r.left - 10, y0: r.top - 10, x1: r.right + 10, y1: r.bottom + 10 });
    }
    renderFloor();
  }

  function solid(x, y) {
    var xi = (x * ms) | 0, yi = (y * ms) | 0;
    if (xi < 0 || yi < 0 || xi >= mw || yi >= mh) return 0;
    return mask[yi * mw + xi];
  }

  /* ---------- physics ---------- */
  var COS = [], SIN = [], NS = 16;
  for (var k = 0; k < NS; k++) { COS.push(Math.cos(k / NS * 6.283185)); SIN.push(Math.sin(k / NS * 6.283185)); }
  var LETTER = 1, RIM = 2, WALL = 4, FLOOR = 8, SCORE = 16;

  function newBall(type, vx, vy) {
    return { x: home.x, y: home.y, vx: vx || 0, vy: vy || 0, r: type.r, e: type.e, drag: type.drag, kind: type.kind,
      touched: 0, floors: 0, scored: false, t: 0, still: 0, ang: 0, fade: 1, impact: 0 };
  }

  // Advances one ball by dt against walls, letters and the rim at (hx, hy). Returns what it hit.
  function stepBall(b, dt, hx, hy) {
    var ev = 0, prevY = b.y, r = b.r, i, vn;
    b.vy += G * dt;
    if (b.drag) { var f = 1 - b.drag * dt; b.vx *= f; b.vy *= f; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.t += dt;

    if (b.x < r) { b.x = r; if (b.vx < 0) { b.impact = -b.vx; b.vx = -b.vx * b.e; ev |= WALL; } }
    else if (b.x > W - r) { b.x = W - r; if (b.vx > 0) { b.impact = b.vx; b.vx = -b.vx * b.e; ev |= WALL; } }
    if (b.y > H - r) {
      b.y = H - r;
      if (b.vy > 0) {
        if (b.vy > 60) { ev |= FLOOR; b.floors++; b.impact = b.vy; }
        b.vy = b.vy < 60 ? 0 : -b.vy * b.e;
        b.vx *= 0.985;
      }
    }

    // letters
    var hit = 0, nx = 0, ny = 0;
    for (i = 0; i < NS; i++) {
      if (solid(b.x + COS[i] * r, b.y + SIN[i] * r)) { nx -= COS[i]; ny -= SIN[i]; hit++; }
    }
    if (hit) {
      var len = Math.sqrt(nx * nx + ny * ny);
      if (len < 0.01) { nx = 0; ny = -1; } else { nx /= len; ny /= len; }
      for (var p = 0; p < 8; p++) {
        b.x += nx; b.y += ny;
        var still = 0;
        for (i = 0; i < NS; i++) if (solid(b.x + COS[i] * r, b.y + SIN[i] * r)) { still = 1; break; }
        if (!still) break;
      }
      vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        var e = -vn < 45 ? 0 : b.e;
        if (-vn > 60) { ev |= LETTER; b.impact = -vn; }
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
        b.vx *= 0.992; b.vy *= 0.992;
      }
    }

    if (b.kind === 0) {
      // hoop: two small rim posts, and it only counts going down through the middle
      for (var side = -1; side <= 1; side += 2) {
        var dx = b.x - (hx + side * RW), dy = b.y - hy, d2 = dx * dx + dy * dy, min = r + 3;
        if (d2 < min * min && d2 > 0.0001) {
          var d = Math.sqrt(d2); nx = dx / d; ny = dy / d;
          b.x = hx + side * RW + nx * min; b.y = hy + ny * min;
          vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.impact = -vn; b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; ev |= RIM; }
        }
      }
      if (!b.scored && b.vy > 0 && prevY < hy && b.y >= hy && Math.abs(b.x - hx) < RW - 2) { b.scored = true; ev |= SCORE; }
    } else {
      // glove (baseball): must arrive without touching anything. racket (tennis): must have bounced first.
      var tx = b.x - hx, ty = b.y - hy, t2 = tx * tx + ty * ty, reach = r + TR;
      if (t2 < reach * reach && t2 > 0.0001) {
        var bounced = ((b.touched | ev) & (LETTER | WALL | FLOOR)) !== 0;
        if (!b.scored && (b.kind === 1 ? bounced : !bounced)) { b.scored = true; ev |= SCORE; }
        if (!(ev & SCORE) || b.kind === 1) {
          var td = Math.sqrt(t2); nx = tx / td; ny = ty / td;
          b.x = hx + nx * reach; b.y = hy + ny * reach;
          vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.impact = -vn; var te = b.kind === 1 ? 1.9 : 1.3; b.vx -= te * vn * nx; b.vy -= te * vn * ny; if (!(ev & SCORE)) ev |= RIM; }
        }
      }
    }
    b.touched |= ev;
    return ev;
  }

  /* ---------- finding fair places for the hoop ----------
     Each candidate spot is test-fired a couple of hundred times; it is only used if some shots go in. */
  var NA = 28, NV = 7;
  var plan = null, lastSpot = null;

  function boxClear(x, y) {
    var x0 = x - RW - Rb, x1 = x + RW + Rb, y0 = y - 4.8 * Rb, y1 = y + 2.4 * Rb;
    if (x0 < 6 || x1 > W - 6 || y1 > H - 10) return false;
    for (var i = 0; i < keepOut.length; i++) {
      var k = keepOut[i];
      if (x1 > k.x0 && x0 < k.x1 && y1 > k.y0 && y0 < k.y1) return false;
    }
    for (var yy = y0; yy <= y1; yy += 5) for (var xx = x0; xx <= x1; xx += 5) if (solid(xx, yy)) return false;
    var hx = x - home.x, hy = y - home.y;
    return hx * hx + hy * hy > 36 * Rb * Rb;
  }

  function startPlan(level) {
    plan = { level: level, type: typeFor(level), tried: 0, ok: [], best: null, cur: null, done: false, result: null };
  }

  function finishPlan() {
    var p = plan, pick = null;
    if (p.ok.length) {
      p.ok.sort(function (a, b) { return b.hits - a.hits; });
      pick = p.level < 3 ? p.ok[0] : p.ok[Math.floor(Math.random() * p.ok.length)];
    } else pick = p.best || { x: Math.min(W - RW - Rb - 8, home.x), y: Math.max(70 + 4.8 * Rb, home.y - 7 * Rb), hits: 0, sol: null };
    p.result = pick; p.done = true;
  }

  function planStep(budget) {
    var p = plan, t0 = performance.now();
    while (!p.done && performance.now() - t0 < budget) {
      if (!p.cur) {
        var found = null;
        for (var a = 0; a < 60 && !found; a++) {
          var x = RW + Rb + 8 + Math.random() * (W - 2 * (RW + Rb + 8));
          var y = 62 + 4.8 * Rb + Math.random() * (H - 62 - 4.8 * Rb - 2.4 * Rb - 14);
          if (!boxClear(x, y)) continue;
          if (lastSpot) {
            var ddx = x - lastSpot.x, ddy = y - lastSpot.y, far = 0.22 * Math.min(W, H);
            if (ddx * ddx + ddy * ddy < far * far) continue;
          }
          found = { x: x, y: y, i: 0, hits: 0, sol: null };
        }
        p.tried++;
        if (!found) { if (p.tried > 12) finishPlan(); continue; }
        p.cur = found;
      }
      var c = p.cur, ai = c.i % NA, vi = (c.i / NA) | 0;
      var ang = Math.PI * (ai + 0.5) / NA, sp = VMAX * p.type.power * (0.45 + 0.55 * vi / (NV - 1));
      var vx = Math.cos(ang) * sp, vy = -Math.sin(ang) * sp;
      var b = newBall(p.type, vx, vy);
      for (var s = 0; s < 620; s++) {
        var ev = stepBall(b, DT, c.x, c.y);
        if (ev & SCORE) {
          c.hits++;
          // remember a shot from the middle of the pack as a known-good answer
          if (!c.sol || c.hits === 3) c.sol = { vx: vx, vy: vy };
          break;
        }
        if (b.floors >= 2) break;
      }
      if (++c.i >= NA * NV) {
        if (c.hits >= 4) p.ok.push(c);
        if (!p.best || c.hits > p.best.hits) p.best = c;
        p.cur = null;
        if (p.ok.length >= 3 || p.tried >= 9) finishPlan();
      }
    }
  }

  /* ---------- game state ---------- */
  var state = 'idle';            // idle | play | over
  var makes = 0, strikes = 0, best = parseInt(store('dh.best'), 10) || 0;
  var ball = null, flying = false, spare = [];
  var ballType = null;
  var drone = { x: 0, y: -200, tx: 0, ty: -200, vx: 0, ready: false, wob: 0, cx: 0, amp: 0, phase: 0 };
  var netKick = 0, clock = 0, respawnAt = 0;
  var aim = null;                // { sx, sy, px, py }
  var fx = [];
  var usedHint = false;

  function typeFor(level) { return BALLS[Math.floor(level / 2) % 3]; }

  function setState(s) {
    state = s;
    body.setAttribute('data-state', s);
    var over = $('over'); if (over) over.inert = s !== 'over';
  }

  function hud() {
    if ($('score')) $('score').textContent = makes;
    if ($('ballname')) $('ballname').textContent = ballType ? ballType.name + ': ' + ballType.goal : '';
    if ($('best')) $('best').textContent = best || '–';
    var marks = document.querySelectorAll('#strikes i');
    for (var i = 0; i < marks.length; i++) marks[i].className = i < strikes ? 'on' : '';
    if ($('strikes')) $('strikes').setAttribute('aria-label', strikes + ' of 3 strikes');
  }

  function freshBall() {
    ballType = typeFor(makes);
    ball = newBall(ballType);
    flying = false;
    hud();
  }

  function placeHoop(spot, level) {
    lastSpot = spot;
    drone.cx = spot.x; drone.tx = spot.x; drone.ty = spot.y;
    drone.sol = spot.sol;
    // from the third basket on, the drone patrols side to side
    var want = level < 2 ? 0 : Math.min(1, (level - 1) / 8) * 0.14 * W, amp = 0;
    for (var a = 8; a <= want; a += 8) {
      if (!boxClear(spot.x - a, spot.y) || !boxClear(spot.x + a, spot.y)) break;
      amp = a;
    }
    drone.amp = amp; drone.phase = 0;
    drone.period = Math.max(2.6, 5 - level * 0.15);
    drone.ready = true;
  }

  function newGame() {
    makes = 0; strikes = 0; spare.length = 0; fx.length = 0; aim = null;
    lastSpot = null;
    freshBall();
    drone.ready = false; drone.ty = -200; drone.amp = 0;
    startPlan(0);
    setState('idle');
  }

  function say(text, x, y, big) { fx.push({ kind: 'text', text: text, x: x, y: y, t0: clock, life: big ? 1.3 : 0.9, big: big }); }
  function puff(x, y, n, color) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = 40 + Math.random() * 160;
      fx.push({ kind: 'dot', x: x, y: y, vx: Math.cos(a) * s * S, vy: Math.sin(a) * s * S - 60 * S, t0: clock, life: 0.35 + Math.random() * 0.35, color: color });
    }
  }

  function scored(b) {
    makes++;
    var t = b.touched, word;
    if (b.kind === 0) { word = !(t & (LETTER | RIM | WALL | FLOOR)) ? 'Swish' : (t & LETTER) ? 'Off the name' : (t & (WALL | FLOOR)) ? 'Trick shot' : 'Rattled in'; sound.swish(); }
    else if (b.kind === 2) { word = 'Caught'; sound.catchIt(); }
    else { word = (t & LETTER) ? 'Off the name' : 'Winner'; sound.racket(); }
    say(word, drone.x, drone.y - 5.4 * Rb, true);
    puff(drone.x, drone.y + (b.kind === 0 ? Rb : 0), 16, ORANGE);
    netKick = 1;
    if (navigator.vibrate) navigator.vibrate(12);
    drone.caughtUntil = b.kind === 2 && typeFor(makes).kind === 2 ? clock + 0.45 : 0;
    if (!plan.done) planStep(1e9);
    placeHoop(plan.result, makes);
    startPlan(makes + 1);
    if (b.kind !== 2) spare.push(b);          // a caught baseball stays in the glove
    respawnAt = clock + 0.35;
    ball = null; flying = false;
    var next = typeFor(makes);
    if (next !== ballType) setTimeout(function () { if (state === 'play') say(next.name + ': ' + next.goal, home.x, home.y - 3.2 * Rb, false); }, 380);
    ballType = next;
    hud();
  }

  function missed(b) {
    strikes++;
    say('Strike ' + strikes, Math.max(60, Math.min(W - 60, b.x)), Math.min(H - 40, b.y) - 2 * Rb, false);
    sound.strike();
    spare.push(b);
    ball = null; flying = false;
    hud();
    if (strikes >= 3) {
      var isBest = makes > best;
      if (isBest) { best = makes; store('dh.best', String(best)); }
      $('over-score').textContent = makes;
      $('over-unit').textContent = makes === 1 ? 'point' : 'points';
      $('over-best').textContent = isBest ? 'A new personal best.' : 'Your best: ' + best;
      $('over-best').classList.toggle('new', isBest);
      hud();
      setState('over');
      setTimeout(function () { var a = $('again'); if (a && state === 'over') a.focus({ preventScroll: true }); }, 500);
    } else respawnAt = clock + 0.3;
  }

  /* ---------- sound ---------- */
  var audio = null, muted = store('dh.mute') === '1';
  function ac() {
    if (muted) return null;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      return audio;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, slide) {
    var a = ac(); if (!a) return;
    var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var lastBounce = 0;
  var sound = {
    bounce: function (b, power) {
      if (clock - lastBounce < 0.04) return;
      lastBounce = clock;
      var v = Math.min(0.14, 0.02 + power / (2400 * S) * 0.14);
      tone([150, 330, 210][b.kind], [0.11, 0.07, 0.05][b.kind], b.kind === 2 ? 'square' : 'sine', v, [90, 260, 150][b.kind]);
    },
    rim: function () { tone(620, 0.16, 'square', 0.035, 540); tone(930, 0.12, 'triangle', 0.04); },
    swish: function () {
      var a = ac(); if (!a) return;
      var dur = 0.42, len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var n = a.createBufferSource(), f = a.createBiquadFilter(), lp = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
      n.buffer = buf;
      f.type = 'bandpass'; f.Q.value = 0.9;
      f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(650, t + dur);   // the net dragging down the ball
      lp.type = 'lowpass'; lp.frequency.value = 3200;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f); f.connect(lp); lp.connect(g); g.connect(a.destination);
      n.start(t); n.stop(t + dur);
    },
    catchIt: function () { tone(130, 0.14, 'sine', 0.22, 70); setTimeout(function () { tone(880, 0.16, 'triangle', 0.06); }, 70); },
    racket: function () { tone(540, 0.09, 'triangle', 0.16, 300); setTimeout(function () { tone(990, 0.18, 'triangle', 0.06); }, 80); },
    strike: function () { tone(160, 0.3, 'sawtooth', 0.06, 90); },
    launch: function () { tone(240, 0.12, 'sine', 0.07, 520); }
  };

  /* ---------- update ---------- */
  function update(dt) {
    clock += dt;

    if (plan && !plan.done) planStep(flying ? 2.5 : 6);
    if (!drone.ready && plan && plan.done) { placeHoop(plan.result, makes); startPlan(makes + 1); }

    // drone flies to its spot, then patrols
    if (drone.ready) {
      if (drone.amp) { drone.phase += dt * 6.283 / drone.period; drone.tx = drone.cx + Math.sin(drone.phase) * drone.amp; }
      var px = drone.x, kf = Math.min(1, dt * (drone.amp ? 9 : 4));
      drone.x += (drone.tx - drone.x) * kf;
      drone.y += (drone.ty - drone.y) * Math.min(1, dt * 4);
      drone.vx += ((drone.x - px) / Math.max(dt, 0.001) - drone.vx) * Math.min(1, dt * 8);
    }
    drone.wob *= Math.pow(0.02, dt);
    netKick *= Math.pow(0.03, dt);

    var steps = Math.max(1, Math.round(dt / DT)), i, s, ev;
    if (ball && flying) {
      for (s = 0; s < steps && ball; s++) {
        ev = stepBall(ball, DT, drone.x, drone.y);
        if (ev & RIM) {
          sound.rim(); drone.wob = 1;
          if (ball.kind && !ball.warned) { ball.warned = true; say(ball.kind === 1 ? 'Needs a bounce first' : 'Too late, it bounced', drone.x, drone.y - 5.4 * Rb, false); }
        }
        else if (ev & (LETTER | WALL | FLOOR)) {
          sound.bounce(ball, ball.impact);
          if (ev & LETTER) puff(ball.x, ball.y, 3, CHALK);
        }
        if (ev & SCORE) { scored(ball); break; }
        var sp2 = ball.vx * ball.vx + ball.vy * ball.vy;
        ball.still = sp2 < 900 ? ball.still + DT : 0;
        if (ball.still > 0.3 || ball.t > 5.5 || (ball.floors >= 3 && ball.y > H - ball.r - 2)) { missed(ball); break; }
      }
      if (ball) ball.ang += ball.vx / ball.r * dt;
    }
    for (i = spare.length - 1; i >= 0; i--) {
      var b = spare[i];
      for (s = 0; s < steps; s++) stepBall(b, DT, drone.x, drone.y);
      b.ang += b.vx / b.r * dt;
      b.fade -= dt * (b.scored ? 0.9 : 1.6);
      if (b.fade <= 0) spare.splice(i, 1);
    }
    if (!ball && state !== 'over' && clock >= respawnAt) freshBall();
  }

  /* ---------- drawing ---------- */
  function renderFloor() {
    var fl = $('floor');
    if (!fl) return;
    fl.width = canvas.width; fl.height = canvas.height;
    var c = fl.getContext('2d'), land = W >= H;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // planks run the length of the court
    var seed = 20261115;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
    var pw = Math.max(13, Math.min(W, H) / 38);
    var across = land ? H : W, along = land ? W : H;
    c.save();
    if (!land) c.transform(0, 1, 1, 0, 0, 0);            // swap axes: planks run top to bottom
    for (var row = 0; row * pw < across; row++) {
      var x = -rnd() * 420;
      while (x < along) {
        var len = 230 + rnd() * 380, l = 70 + rnd() * 7, sat = 52 + rnd() * 10, hue = 31 + rnd() * 5;
        c.fillStyle = 'hsl(' + hue.toFixed(1) + ',' + sat.toFixed(0) + '%,' + l.toFixed(1) + '%)';
        c.fillRect(x, row * pw, len + 1, pw + 1);
        c.strokeStyle = 'rgba(120,72,24,.07)'; c.lineWidth = 1;       // grain
        for (var g = 0; g < 3; g++) {
          var gy = row * pw + 2 + rnd() * (pw - 4), gx = x + rnd() * len * 0.5, gl = len * (0.25 + rnd() * 0.5);
          c.beginPath(); c.moveTo(gx, gy); c.bezierCurveTo(gx + gl * 0.3, gy + (rnd() - 0.5) * 3, gx + gl * 0.7, gy + (rnd() - 0.5) * 3, gx + gl, gy); c.stroke();
        }
        c.fillStyle = 'rgba(92,52,14,.3)'; c.fillRect(x + len, row * pw, 1, pw);   // butt joint
        x += len;
      }
      c.fillStyle = 'rgba(92,52,14,.2)'; c.fillRect(0, row * pw, along, 1);        // seam
    }
    c.restore();

    // markings, in feet. Half a court: the basket end sits at the right (or at the top on a tall screen).
    var m = 14, u = ((land ? H : W) - 2 * m) / 50;
    c.save();
    if (land) c.transform(-u, 0, 0, u, W - m, m); else c.transform(0, u, u, 0, m, m + 44);
    var lw = Math.max(1 / 6, 2.4 / u);
    c.lineWidth = lw; c.strokeStyle = CHALK; c.lineCap = 'butt';
    c.fillStyle = NAVY; c.fillRect(0, 17, 19, 16);                                   // the lane
    c.strokeRect(0, 17, 19, 16);
    c.beginPath(); c.arc(19, 25, 6, 0, 6.2832); c.stroke();                          // free-throw circle
    c.beginPath(); c.moveTo(0, 3); c.lineTo(14, 3); c.arc(5.25, 25, 23.75, -1.1877, 1.1877); c.lineTo(0, 47); c.stroke();
    c.beginPath(); c.moveTo(47, 0); c.lineTo(47, 50); c.stroke();                    // half court
    c.beginPath(); c.arc(47, 25, 6, 0, 6.2832); c.moveTo(49, 25); c.arc(47, 25, 2, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(5.25, 25, 4, -1.5708, 1.5708); c.stroke();                  // restricted area
    c.beginPath(); c.moveTo(4, 22); c.lineTo(4, 28); c.stroke();                     // backboard
    c.strokeStyle = ORANGE; c.beginPath(); c.arc(5.25, 25, 0.75, 0, 6.2832); c.stroke();
    c.strokeStyle = CHALK; c.lineWidth = lw * 1.4;
    c.strokeRect(0, 0, 200, 50);                                                     // baseline and sidelines
    c.restore();
    // out of bounds
    c.fillStyle = NAVY;
    if (land) { c.fillRect(0, 0, W, m - 1); c.fillRect(0, H - m + 1, W, m); c.fillRect(W - m + 1, 0, m, H); }
    else { c.fillRect(0, 0, m - 1, H); c.fillRect(W - m + 1, 0, m, H); c.fillRect(0, 0, W, m + 43); }

    // the name, painted on the boards
    c.font = '400 ' + fs + 'px ' + FONT;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.lineJoin = 'round'; c.lineWidth = Math.max(4, fs * 0.05); c.strokeStyle = CHALK;
    for (var w = 0; w < 2; w++) c.strokeText(WORDS[w], nameX, base[w]);
    c.fillStyle = NAVY;
    for (w = 0; w < 2; w++) c.fillText(WORDS[w], nameX, base[w]);

    // a little arena light
    var sh = c.createRadialGradient(W * 0.35, H * 0.3, 0, W * 0.35, H * 0.3, Math.max(W, H) * 0.8);
    sh.addColorStop(0, 'rgba(255,248,230,.16)'); sh.addColorStop(0.5, 'rgba(255,248,230,0)'); sh.addColorStop(1, 'rgba(60,30,5,.2)');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }

  function drawBall(b, alpha) {
    var r = b.r;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.arc(r * 0.12, r * 0.2, r, 0, 6.2832); ctx.fill();
    ctx.rotate(b.ang);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832);
    if (b.kind === 0) {
      ctx.fillStyle = ORANGE; ctx.fill();
      ctx.strokeStyle = '#3a1a0c'; ctx.lineWidth = Math.max(1.2, r * 0.09);
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
      ctx.moveTo(-r * 0.75, -r); ctx.quadraticCurveTo(-r * 0.2, 0, -r * 0.75, r);
      ctx.moveTo(r * 0.75, -r); ctx.quadraticCurveTo(r * 0.2, 0, r * 0.75, r);
      ctx.stroke(); ctx.restore();
    } else if (b.kind === 1) {
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
  }

  function drawDrone(front) {
    var d = Rb, hx = drone.x, hy = drone.y;
    var bob = reduced ? 0 : Math.sin(clock * 2.1) * d * 0.14;
    var tilt = Math.max(-0.3, Math.min(0.3, drone.vx * 0.0009)) + Math.sin(clock * 30) * 0.05 * drone.wob;
    var bx = hx, by = hy - 3.5 * d + bob;
    var ry = RW * 0.3;

    var kind = ballType ? ballType.kind : 0, i;
    if (!front) {
      ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (kind === 0) {
        ctx.moveTo(bx - d * 0.6, by + d * 0.4); ctx.lineTo(hx - RW, hy);
        ctx.moveTo(bx + d * 0.6, by + d * 0.4); ctx.lineTo(hx + RW, hy);
      } else if (kind === 2) {
        ctx.moveTo(bx - d * 0.6, by + d * 0.4); ctx.lineTo(hx - TR * 0.6, hy - TR * 0.8);
        ctx.moveTo(bx + d * 0.6, by + d * 0.4); ctx.lineTo(hx + TR * 0.6, hy - TR * 0.8);
      }
      ctx.stroke();
      if (kind === 1) {                                     // racket, held by the handle
        var k1 = 1 + netKick * 0.12, rx = TR * 0.92 * k1, ryk = TR * 1.06 * k1;
        ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = Math.max(4, d * 0.42); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, by + d * 0.4); ctx.lineTo(hx, hy - ryk - d * 0.5); ctx.stroke();
        ctx.strokeStyle = ORANGE; ctx.lineWidth = Math.max(2, d * 0.2);
        ctx.beginPath(); ctx.moveTo(hx, hy - ryk - d * 0.55); ctx.lineTo(hx - rx * 0.45, hy - ryk * 0.82);
        ctx.moveTo(hx, hy - ryk - d * 0.55); ctx.lineTo(hx + rx * 0.45, hy - ryk * 0.82); ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.ellipse(hx, hy, rx, ryk, 0, 0, 6.2832); ctx.clip();
        ctx.fillStyle = 'rgba(251,246,234,.25)'; ctx.fillRect(hx - rx, hy - ryk, 2 * rx, 2 * ryk);
        ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 1;
        ctx.beginPath();
        var gap = Math.max(4, TR * 0.26);
        for (i = -6; i <= 6; i++) { ctx.moveTo(hx + i * gap, hy - ryk); ctx.lineTo(hx + i * gap, hy + ryk); ctx.moveTo(hx - rx, hy + i * gap); ctx.lineTo(hx + rx, hy + i * gap); }
        ctx.stroke(); ctx.restore();
        ctx.strokeStyle = CHALK; ctx.lineWidth = Math.max(2.5, d * 0.24);
        ctx.beginPath(); ctx.ellipse(hx, hy, rx, ryk, 0, 0, 6.2832); ctx.stroke();
      } else if (kind === 2) {                              // glove
        var k2 = 1 - netKick * 0.1, gr = TR * k2;
        ctx.fillStyle = '#b0692b';
        ctx.beginPath(); ctx.arc(hx, hy, gr, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(hx - gr * 0.92, hy - gr * 0.2, gr * 0.42, 0, 6.2832); ctx.fill();           // thumb
        for (i = 0; i < 4; i++) { var fa = -2.25 + i * 0.5; ctx.beginPath(); ctx.arc(hx + Math.cos(fa) * gr * 0.86, hy + Math.sin(fa) * gr * 0.86, gr * 0.3, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = '#7d4519';
        ctx.beginPath(); ctx.arc(hx + gr * 0.05, hy + gr * 0.1, gr * 0.56, 0, 6.2832); ctx.fill();          // pocket
        ctx.strokeStyle = '#e9c48e'; ctx.lineWidth = 1.1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(hx, hy, gr * 0.84, 0.3, 2.9); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(bx, by); ctx.rotate(tilt);
      ctx.strokeStyle = '#c9d2d0'; ctx.lineWidth = Math.max(2, d * 0.2); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-d * 2.2, -d * 0.3); ctx.lineTo(d * 2.2, -d * 0.3);                    // arms
      ctx.moveTo(-d * 0.7, d * 0.3); ctx.lineTo(-d * 1.1, d * 0.95);                    // legs
      ctx.moveTo(d * 0.7, d * 0.3); ctx.lineTo(d * 1.1, d * 0.95);
      ctx.stroke();
      ctx.fillStyle = '#e6ebe8';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-d * 1.05, -d * 0.55, d * 2.1, d * 0.95, d * 0.4); else ctx.rect(-d * 1.05, -d * 0.55, d * 2.1, d * 0.95);
      ctx.fill();
      ctx.fillStyle = SHADE;
      ctx.beginPath(); ctx.arc(d * 0.5, -d * 0.08, d * 0.24, 0, 6.2832); ctx.fill();    // camera
      ctx.fillStyle = (clock % 1.4) < 0.7 ? ORANGE : '#8a3a1c';
      ctx.beginPath(); ctx.arc(-d * 0.6, -d * 0.1, d * 0.11, 0, 6.2832); ctx.fill();    // status light
      for (var side = -1; side <= 1; side += 2) {
        ctx.fillStyle = '#c9d2d0';
        ctx.fillRect(side * d * 2.2 - d * 0.14, -d * 0.62, d * 0.28, d * 0.36);          // motors
        var spin = reduced ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(clock * 47 + side));
        ctx.fillStyle = 'rgba(20,35,59,.3)';
        ctx.beginPath(); ctx.ellipse(side * d * 2.2, -d * 0.72, d * 1.25 * spin, d * 0.1, 0, 0, 6.2832); ctx.fill();
      }
      ctx.restore();

      if (kind === 0) {                                     // back of the rim
        ctx.strokeStyle = '#b24a1c'; ctx.lineWidth = Math.max(2.5, d * 0.22);
        ctx.beginPath(); ctx.ellipse(hx, hy, RW, ry, 0, Math.PI, 2 * Math.PI); ctx.stroke();
      }
    } else if (kind === 2) {
      if (clock < drone.caughtUntil) drawBall({ x: hx + TR * 0.05, y: hy + TR * 0.1, r: BALLS[1].r, kind: 2, ang: 0.6 }, 1);
    } else if (kind === 0) {
      // net, then the front of the rim
      var sway = Math.sin(clock * 22) * netKick * d * 0.5, drop = d * (1.9 + netKick * 0.5), n = 7;
      ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (i = 0; i <= n; i++) {
        var t = i / n, xt = hx - RW + t * 2 * RW, xb = hx - RW * 0.55 + t * 1.1 * RW + sway;
        var yt = hy + Math.sin(t * Math.PI) * ry;
        ctx.moveTo(xt, yt); ctx.quadraticCurveTo((xt + xb) / 2 + sway * 0.3, hy + drop * 0.55, xb, hy + drop);
      }
      for (i = 1; i <= 2; i++) {
        var f = i / 3, w = RW * (1 - 0.45 * f);
        ctx.moveTo(hx - w + sway * f, hy + drop * f + 2); ctx.quadraticCurveTo(hx + sway * f, hy + drop * f + ry * 0.8, hx + w + sway * f, hy + drop * f + 2);
      }
      ctx.stroke();
      ctx.strokeStyle = ORANGE; ctx.lineWidth = Math.max(2.5, d * 0.22);
      ctx.beginPath(); ctx.ellipse(hx, hy, RW, ry, 0, 0, Math.PI); ctx.stroke();
    }
  }

  function launchFromAim() {
    var dx = aim.sx - aim.px, dy = aim.sy - aim.py, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 14) return null;
    var f = Math.min(1, len / MAXPULL), sp = f * VMAX * ballType.power;
    return { vx: dx / len * sp, vy: dy / len * sp, f: f, ux: dx / len, uy: dy / len };
  }

  function drawAim() {
    var L = launchFromAim();
    if (!L || !ball) return;
    // the pull
    var hxp = ball.x - L.ux * L.f * MAXPULL * 0.6, hyp = ball.y - L.uy * L.f * MAXPULL * 0.6;
    ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(hxp, hyp); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(hxp, hyp, 5, 0, 6.2832); ctx.fillStyle = CHALK; ctx.fill();
    // the first stretch of the flight path
    var x = ball.x, y = ball.y, vx = L.vx, vy = L.vy, step = 0.045;
    ctx.fillStyle = NAVY; ctx.strokeStyle = CHALK; ctx.lineWidth = 1.3;
    for (var i = 1; i <= 11; i++) {
      vy += G * step; x += vx * step; y += vy * step;
      if (ballType.drag) { vx *= 1 - ballType.drag * step; vy *= 1 - ballType.drag * step; }
      ctx.globalAlpha = 1 - i / 14;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2.4, 4.6 - i * 0.2), 0, 6.2832); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var e = fx[i], age = (clock - e.t0) / e.life;
      if (age >= 1) { fx.splice(i, 1); continue; }
      if (e.kind === 'dot') {
        e.vy += G * 0.5 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
        ctx.globalAlpha = 1 - age; ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, 2.2, 0, 6.2832); ctx.fill();
      } else {
        var size = e.big ? Math.max(22, Math.min(40, fs * 0.2)) : 13;
        ctx.globalAlpha = age < 0.75 ? 1 : (1 - age) * 4;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = e.big ? 'italic 600 ' + size + 'px ' + SERIF : '500 ' + size + 'px "IBM Plex Mono", ui-monospace, monospace';
        var tw = ctx.measureText(e.text).width / 2 + 8;
        var tx = Math.max(tw, Math.min(W - tw, e.x)), ty = Math.max(74, e.y - age * 20);
        ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = SHADE; ctx.strokeText(e.text, tx, ty);
        ctx.fillStyle = e.big ? CHALK : ORANGE; ctx.fillText(e.text, tx, ty);
      }
      ctx.globalAlpha = 1;
    }
  }

  function lift(on) {
    ctx.shadowColor = on ? 'rgba(12,22,44,.6)' : 'transparent';
    ctx.shadowBlur = on ? 2.5 * dpr : 0;
    ctx.shadowOffsetY = on ? 1.5 * dpr : 0;
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    lift(true);
    if (drone.ready) drawDrone(false);
    lift(false);
    for (var i = 0; i < spare.length; i++) drawBall(spare[i], Math.max(0, Math.min(1, spare[i].fade * 2)));
    if (ball) {
      if (!flying && !aim && !reduced) {                       // an idle ball breathes, so it reads as touchable
        var pr = ball.r + 5 + (Math.sin(clock * 3) + 1) * 3;
        ctx.strokeStyle = 'rgba(20,35,59,' + (0.5 - (Math.sin(clock * 3) + 1) * 0.17).toFixed(3) + ')';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ball.x, ball.y, pr, 0, 6.2832); ctx.stroke();
      }
      drawBall(ball, 1);
    }
    lift(true);
    if (drone.ready) drawDrone(true);
    if (aim && ball && !flying) drawAim();
    lift(false);
    if (state === 'idle' && !usedHint && ball && !aim) {
      ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = SHADE;
      ctx.fillText('PULL BACK & LET GO ↗', Math.min(W - 16, ball.x + ball.r + 4), ball.y + ball.r + 14);
    }
    drawFx(dt);
  }

  /* ---------- input: pull back anywhere, release to shoot ---------- */
  function down(e) {
    if (e.button || state === 'over' || aim) return;
    if (e.target.closest && e.target.closest('a,button')) return;
    e.preventDefault();
    aim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY };
  }
  function move(e) {
    if (!aim || e.pointerId !== aim.id) return;
    aim.px = e.clientX; aim.py = e.clientY;
  }
  function up(e) {
    if (!aim || e.pointerId !== aim.id) return;
    aim.px = e.clientX; aim.py = e.clientY;
    var L = launchFromAim();
    aim = null;
    if (!L || !ball || flying || !drone.ready) return;
    ball.vx = L.vx; ball.vy = L.vy;
    flying = true; usedHint = true;
    sound.launch();
    if (state === 'idle') setState('play');
  }
  window.addEventListener('pointerdown', down, { passive: false });
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', function () { aim = null; });
  window.addEventListener('contextmenu', function (e) { if (e.target === canvas) e.preventDefault(); });

  function on(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  on('again', newGame);
  var muteBtn = $('mute');
  function showMute() { if (muteBtn) { muteBtn.textContent = muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false'); } }
  on('mute', function () { muted = !muted; store('dh.mute', muted ? '1' : '0'); showMute(); tone(520, 0.1, 'triangle', 0.07); });
  showMute();
  on('share', function () {
    var btn = $('share'), url = location.origin + location.pathname;
    var text = 'I scored ' + makes + ' against a drone with a hoop, a glove and a racket. Three strikes and you’re out:';
    function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = 'Challenge a friend'; }, 2200); }
    if (navigator.share) navigator.share({ text: text, url: url }).catch(function () { /* cancelled */ });
    else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { done('Link copied'); }, function () { done('Could not copy'); });
    else window.prompt('Copy this link:', url);
  });

  // keep scrapers guessing, let humans click
  var mail = $('email');
  if (mail) mail.href = 'mai' + 'lto:' + mail.getAttribute('data-u') + '@' + mail.getAttribute('data-d');

  /* ---------- go ---------- */
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.04, (now - last) / 1000 || 0);
    last = now;
    if (document.hidden) return;
    update(dt);
    draw(dt);
  }

  function start() {
    layout();
    newGame();
    drone.x = W * 0.5; drone.y = -120;
    requestAnimationFrame(frame);
    window.addEventListener('resize', function () {
      layout();
      aim = null; spare.length = 0;
      freshBall();
      drone.ready = false; lastSpot = null;
      startPlan(makes);
    });
  }
  var started = false;
  function once() { if (!started) { started = true; start(); } }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 100px Anton').then(once, once);
    setTimeout(once, 1500);
  } else once();

  // for the tests
  window.__dh = {
    info: function () {
      return { state: state, makes: makes, strikes: strikes, flying: flying, ready: drone.ready, settled: Math.abs(drone.x - drone.tx) + Math.abs(drone.y - drone.ty) < 1.5,
        hits: lastSpot ? lastSpot.hits : -1, amp: drone.amp, home: { x: home.x, y: home.y },
        pull: drone.sol && ballType ? { dx: -drone.sol.vx / (VMAX * ballType.power) * MAXPULL, dy: -drone.sol.vy / (VMAX * ballType.power) * MAXPULL } : null };
    }
  };
})();
