/* Basketball and Mixed: a hardwood court. The painted name is solid, the dot after it is a ball,
   and a drone carries the target. Pull back anywhere and let go. */
(function () {
  'use strict';
  var JP = window.JP;
  if (!JP) return;
  var ctx = JP.ctx, CHALK = JP.CHALK, INK = JP.INK, NAVY = JP.NAVY, ORANGE = JP.ORANGE;
  var DT = 1 / 240;

  var mixed = false;
  var W, H, S, G, VMAX, MAXPULL;
  var fs = 100, nameX = 0, base = [0, 0], home = { x: 0, y: 0 };
  var Rb = 16, RW = 26, TR = 21;
  var mask = null, mw = 0, mh = 0, ms = 1;
  var glyphs = [];
  var court = { x: 0, y: 0, r: 8 };          // where the hoop is bolted to the floor
  var BALLS = [];

  function layout() {
    W = JP.W; H = JP.H; S = JP.S;
    G = 1900 * S; VMAX = 1650 * S;
    MAXPULL = Math.max(90, Math.min(170, 0.2 * Math.min(W, H)));

    var margin = Math.max(22, W * 0.06), wide = 4, cap = 0.73;
    fs = 100;
    for (var pass = 0; pass < 3; pass++) {
      ctx.font = '400 ' + fs + 'px ' + JP.FONT;
      wide = ctx.measureText(JP.WORDS[1]).width / fs;
      cap = (ctx.measureText('H').actualBoundingBoxAscent || fs * 0.73) / fs;
      fs = Math.min((W - 2 * margin - 34) / (wide + 0.2), H * 0.19 / cap, 330);
    }
    ctx.font = '400 ' + fs + 'px ' + JP.FONT;
    var capH = cap * fs;
    nameX = margin;
    var top = (tall() ? 0.36 : 0.24) * H;
    base[0] = top + capH;
    base[1] = base[0] + capH * 1.16;
    glyphs = JP.glyphs(ctx, JP.WORDS[0], nameX, base[0], 1).concat(JP.glyphs(ctx, JP.WORDS[1], nameX, base[1], 5));

    Rb = Math.max(12, Math.min(24, capH * 0.15));
    RW = Rb * 1.6; TR = Rb * 1.3;
    if (tall()) {
      // On a tall phone the spot after the name is boxed in by the wall, so the ball rests on top of
      // PETTYJOHN instead, in the open floor to the right of JEFF.
      var jeffEnd = glyphs[3].x + glyphs[3].w, nameEnd = nameX + wide * fs;
      home.x = Math.min(nameEnd - 1.5 * Rb, (jeffEnd + W - 14) / 2);
      home.y = base[1] - capH * 1.02 - Rb;
    } else {
      home.x = nameX + wide * fs + Rb + Math.max(6, fs * 0.05);
      home.y = base[1] - Rb;
    }

    BALLS = [
      { name: 'Basketball', goal: 'through the hoop', r: Rb, e: 0.74, power: 1, drag: 0, kind: 0 },
      { name: 'Baseball', goal: 'into the glove on the fly', r: Math.max(8, Rb * 0.66), e: 0.42, power: 1.18, drag: 0.05, kind: 2 },
      { name: 'Tennis', goal: 'onto the racket off a bounce', r: Math.max(8, Rb * 0.62), e: 0.86, power: 1.08, drag: 0.25, kind: 1 }
    ];

    // collision mask: each pixel holds the number of the letter that covers it
    ms = W * H > 2.5e6 ? 0.5 : 1;
    mw = Math.ceil(W * ms); mh = Math.ceil(H * ms);
    var off = document.createElement('canvas');
    off.width = mw; off.height = mh;
    var o = off.getContext('2d', { willReadFrequently: true });
    o.scale(ms, ms);
    o.font = '400 ' + fs + 'px ' + JP.FONT;
    o.textBaseline = 'alphabetic';
    for (var gi = 0; gi < glyphs.length; gi++) {
      o.fillStyle = 'rgb(' + glyphs[gi].id * 16 + ',0,0)';
      o.fillText(glyphs[gi].ch, glyphs[gi].x, glyphs[gi].y);
    }
    var d = o.getImageData(0, 0, mw, mh).data;
    mask = new Uint8Array(mw * mh);
    for (var i = 0, n = mw * mh; i < n; i++) mask[i] = d[i * 4 + 3] > 110 ? Math.max(1, Math.round(d[i * 4] / 16)) : 0;

    var m = 14, u = ((JP.land ? H : W) - 2 * m) / 50;
    if (JP.land) { court.x = W - m - 5.25 * u; court.y = m + 25 * u; } else { court.x = m + 25 * u; court.y = m + 44 + 5.25 * u; }
    court.r = Math.max(5, 0.75 * u);
  }

  function tall() { return window.innerWidth < 700 && window.innerHeight > window.innerWidth; }

  function solid(x, y) {
    var xi = (x * ms) | 0, yi = (y * ms) | 0;
    if (xi < 0 || yi < 0 || xi >= mw || yi >= mh) return 0;
    return mask[yi * mw + xi];
  }

  /* ---------- the floor ---------- */
  function floor(c) {
    var land = JP.land;
    var seed = 20261115;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
    var pw = Math.max(13, Math.min(W, H) / 38);
    var across = land ? H : W, along = land ? W : H;
    c.save();
    if (!land) c.transform(0, 1, 1, 0, 0, 0);
    for (var row = 0; row * pw < across; row++) {
      var x = -rnd() * 420;
      while (x < along) {
        var len = 230 + rnd() * 380, l = 70 + rnd() * 7, sat = 52 + rnd() * 10, hue = 31 + rnd() * 5;
        c.fillStyle = 'hsl(' + hue.toFixed(1) + ',' + sat.toFixed(0) + '%,' + l.toFixed(1) + '%)';
        c.fillRect(x, row * pw, len + 1, pw + 1);
        c.strokeStyle = 'rgba(120,72,24,.07)'; c.lineWidth = 1;
        for (var g = 0; g < 3; g++) {
          var gy = row * pw + 2 + rnd() * (pw - 4), gx = x + rnd() * len * 0.5, gl = len * (0.25 + rnd() * 0.5);
          c.beginPath(); c.moveTo(gx, gy); c.bezierCurveTo(gx + gl * 0.3, gy + (rnd() - 0.5) * 3, gx + gl * 0.7, gy + (rnd() - 0.5) * 3, gx + gl, gy); c.stroke();
        }
        c.fillStyle = 'rgba(92,52,14,.3)'; c.fillRect(x + len, row * pw, 1, pw);
        x += len;
      }
      c.fillStyle = 'rgba(92,52,14,.2)'; c.fillRect(0, row * pw, along, 1);
    }
    c.restore();

    // markings, in feet: half a court with the basket at the right (or the top on a tall screen)
    var m = 14, u = ((land ? H : W) - 2 * m) / 50;
    c.save();
    if (land) c.transform(-u, 0, 0, u, W - m, m); else c.transform(0, u, u, 0, m, m + 44);
    var lw = Math.max(1 / 6, 2.4 / u);
    c.lineWidth = lw; c.strokeStyle = CHALK; c.lineCap = 'butt';
    c.fillStyle = NAVY; c.fillRect(0, 17, 19, 16);
    c.strokeRect(0, 17, 19, 16);
    c.beginPath(); c.arc(19, 25, 6, 0, 6.2832); c.stroke();
    c.beginPath(); c.moveTo(0, 3); c.lineTo(14, 3); c.arc(5.25, 25, 23.75, -1.1877, 1.1877); c.lineTo(0, 47); c.stroke();
    c.beginPath(); c.moveTo(47, 0); c.lineTo(47, 50); c.stroke();
    c.beginPath(); c.arc(47, 25, 6, 0, 6.2832); c.moveTo(49, 25); c.arc(47, 25, 2, 0, 6.2832); c.stroke();
    c.beginPath(); c.arc(5.25, 25, 4, -1.5708, 1.5708); c.stroke();
    c.lineWidth = lw * 1.8; c.beginPath(); c.moveTo(4, 22); c.lineTo(4, 28); c.stroke();          // backboard
    c.lineWidth = lw; c.beginPath(); c.moveTo(4, 25); c.lineTo(4.5, 25); c.stroke();               // the bracket the rim hangs on
    c.lineWidth = lw * 1.4; c.strokeRect(0, 0, 200, 50);
    c.restore();
    c.fillStyle = NAVY;
    if (land) { c.fillRect(0, 0, W, m - 1); c.fillRect(0, H - m + 1, W, m); c.fillRect(W - m + 1, 0, m, H); }
    else { c.fillRect(0, 0, m - 1, H); c.fillRect(W - m + 1, 0, m, H); c.fillRect(0, 0, W, m + 43); }

    // the name, painted on the boards
    c.font = '400 ' + fs + 'px ' + JP.FONT;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.lineJoin = 'round'; c.lineWidth = Math.max(4, fs * 0.05); c.strokeStyle = CHALK;
    var i;
    for (i = 0; i < glyphs.length; i++) c.strokeText(glyphs[i].ch, glyphs[i].x, glyphs[i].y);
    c.fillStyle = NAVY;
    for (i = 0; i < glyphs.length; i++) c.fillText(glyphs[i].ch, glyphs[i].x, glyphs[i].y);

    var sh = c.createRadialGradient(W * 0.35, H * 0.3, 0, W * 0.35, H * 0.3, Math.max(W, H) * 0.8);
    sh.addColorStop(0, 'rgba(255,248,230,.16)'); sh.addColorStop(0.5, 'rgba(255,248,230,0)'); sh.addColorStop(1, 'rgba(60,30,5,.2)');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }

  /* ---------- physics ---------- */
  var COS = [], SIN = [], NS = 16;
  for (var k = 0; k < NS; k++) { COS.push(Math.cos(k / NS * 6.283185)); SIN.push(Math.sin(k / NS * 6.283185)); }
  var LETTER = 1, RIM = 2, WALL = 4, FLOOR = 8, SCORE = 16;

  function newBall(type, vx, vy) {
    return { x: home.x, y: home.y, vx: vx || 0, vy: vy || 0, r: type.r, e: type.e, drag: type.drag, kind: type.kind,
      touched: 0, floors: 0, scored: false, t: 0, still: 0, ang: 0, fade: 1, impact: 0, letter: 0 };
  }

  function stepBall(b, dt, hx, hy) {
    var ev = 0, prevY = b.y, r = b.r, i, vn, nx, ny;
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

    var hit = 0, id = 0, m;
    nx = 0; ny = 0;
    for (i = 0; i < NS; i++) {
      m = solid(b.x + COS[i] * r, b.y + SIN[i] * r);
      if (m) { nx -= COS[i]; ny -= SIN[i]; hit++; id = m; }
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
        if (-vn > 60) { ev |= LETTER; b.impact = -vn; b.letter = id; }
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
        b.vx *= 0.992; b.vy *= 0.992;
      }
    }

    if (b.kind === 0) {
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

  /* ---------- finding fair places for the target ----------
     Every candidate spot is test-fired across a grid of angles and strengths. A spot only counts if
     it has forgiving answers: shots that still go in when the aim is a little off either way. */
  var NA = 30, NV = 8;
  var plan = null, lastSpot = null;

  function boxClear(x, y) {
    var x0 = x - RW - Rb, x1 = x + RW + Rb, y0 = y - 4.8 * Rb, y1 = y + 2.4 * Rb, ko = JP.keepOut;
    if (x0 < 6 || x1 > W - 6 || y1 > H - 10) return false;
    for (var i = 0; i < ko.length; i++) if (x1 > ko[i].x0 && x0 < ko[i].x1 && y1 > ko[i].y0 && y0 < ko[i].y1) return false;
    for (var yy = y0; yy <= y1; yy += 5) for (var xx = x0; xx <= x1; xx += 5) if (solid(xx, yy)) return false;
    var hx = x - home.x, hy = y - home.y;
    return hx * hx + hy * hy > 36 * Rb * Rb;
  }

  function typeFor(level) { return mixed ? BALLS[Math.floor(level / 2) % 3] : BALLS[0]; }

  function startPlan(level) {
    plan = { level: level, type: typeFor(level), tried: 0, ok: [], best: null, cur: null, done: false, result: null,
      need: level < 3 ? 5 : level < 7 ? 4 : 3 };
  }

  function finishPlan() {
    var p = plan, pick;
    if (p.ok.length) {
      p.ok.sort(function (a, b) { return b.robust - a.robust; });
      pick = p.level < 4 ? p.ok[0] : p.ok[Math.floor(Math.random() * p.ok.length)];
    } else pick = p.best || { x: Math.min(W - RW - Rb - 8, home.x + 2 * Rb), y: Math.max(80 + 4.8 * Rb, home.y - 7 * Rb), robust: 0, sol: null };
    p.result = pick; p.done = true;
  }

  function scores(type, vx, vy, x, y) {
    var b = newBall(type, vx, vy);
    for (var s = 0; s < 620; s++) {
      if (stepBall(b, DT, x, y) & SCORE) return true;
      if (b.floors >= 2) return false;
    }
    return false;
  }

  // A hit only counts as forgiving if it still goes in with the aim a little off in each direction.
  function judge(c) {
    var g = c.grid, forgiving = 0, bestN = -1, checked = 0, ca = Math.cos(0.045), sa = Math.sin(0.045);
    for (var i = 0; i < NA * NV && checked < 48; i++) {
      if (!g[i]) continue;
      checked++;
      var v = shot(i % NA, (i / NA) | 0, plan.type), n = 0;
      if (scores(plan.type, v.vx * ca - v.vy * sa, v.vx * sa + v.vy * ca, c.x, c.y)) n++;
      if (scores(plan.type, v.vx * ca + v.vy * sa, -v.vx * sa + v.vy * ca, c.x, c.y)) n++;
      if (scores(plan.type, v.vx * 1.035, v.vy * 1.035, c.x, c.y)) n++;
      if (scores(plan.type, v.vx * 0.965, v.vy * 0.965, c.x, c.y)) n++;
      if (n >= 3) forgiving++;
      if (n > bestN) { bestN = n; c.sol = v; }
    }
    c.robust = forgiving;
  }

  function shot(ai, vi, type) {
    var ang = Math.PI * (ai + 0.5) / NA, sp = VMAX * type.power * (0.4 + 0.6 * vi / (NV - 1));
    return { vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp };
  }

  function planStep(budget) {
    var p = plan, t0 = performance.now();
    while (!p.done && performance.now() - t0 < budget) {
      if (!p.cur) {
        var found = null;
        for (var a = 0; a < 60 && !found; a++) {
          var x = RW + Rb + 8 + Math.random() * (W - 2 * (RW + Rb + 8));
          var y = 78 + 4.8 * Rb + Math.random() * (H - 78 - 4.8 * Rb - 2.4 * Rb - 14);
          if (!boxClear(x, y)) continue;
          if (lastSpot) {
            var ddx = x - lastSpot.x, ddy = y - lastSpot.y, far = 0.22 * Math.min(W, H);
            if (ddx * ddx + ddy * ddy < far * far) continue;
          }
          found = { x: x, y: y, i: 0, grid: new Uint8Array(NA * NV), robust: 0, sol: null };
        }
        p.tried++;
        if (!found) { if (p.tried > 26) finishPlan(); continue; }
        p.cur = found;
      }
      var c = p.cur, s0 = shot(c.i % NA, (c.i / NA) | 0, p.type);
      if (scores(p.type, s0.vx, s0.vy, c.x, c.y)) c.grid[c.i] = 1;
      if (++c.i >= NA * NV) {
        judge(c);
        if (c.robust >= p.need) p.ok.push(c);
        if (!p.best || c.robust > p.best.robust) p.best = c;
        p.cur = null;
        if (p.ok.length >= 3 || p.tried >= 26) finishPlan();
      }
    }
  }

  /* ---------- state ---------- */
  var makes = 0, ball = null, flying = false, spare = [], ballType = null;
  var drone = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, ready: false, wob: 0, cx: 0, amp: 0, phase: 0, period: 4, sol: null, caughtUntil: 0 };
  var intro = { t: 0, speed: 1 };
  var netKick = 0, respawnAt = 0, aim = null, usedHint = false, over = false;

  function freshBall() {
    ballType = typeFor(makes);
    ball = newBall(ballType);
    flying = false;
    JP.goal(ballType.name + ': ' + ballType.goal);
  }

  function placeTarget(spot, level) {
    lastSpot = spot;
    drone.cx = spot.x; drone.tx = spot.x; drone.ty = spot.y; drone.sol = spot.sol;
    var want = level < 3 ? 0 : Math.min(1, (level - 2) / 9) * 0.1 * W, amp = 0;
    for (var a = 8; a <= want; a += 8) {
      if (!boxClear(spot.x - a, spot.y) || !boxClear(spot.x + a, spot.y)) break;
      amp = a;
    }
    drone.amp = amp; drone.phase = 0;
    drone.period = Math.max(2.8, 5 - level * 0.12);
  }

  function reset(isMixed) {
    mixed = isMixed;
    makes = 0; spare.length = 0; aim = null; over = false; lastSpot = null; netKick = 0;
    freshBall();
    drone.ready = false; drone.amp = 0; drone.x = court.x; drone.y = court.y; drone.vx = 0;
    intro.t = 0; intro.speed = usedHint ? 1.5 : 1;
    startPlan(0);
  }

  function scored(b) {
    makes++;
    var t = b.touched, word;
    if (b.kind === 0) { word = !(t & (LETTER | RIM | WALL | FLOOR)) ? 'Swish' : (t & LETTER) ? 'Off the name' : (t & (WALL | FLOOR)) ? 'Trick shot' : 'Rattled in'; JP.sound.swish(); }
    else if (b.kind === 2) { word = 'Caught'; JP.sound.mitt(); }
    else { word = (t & LETTER) ? 'Off the name' : 'Winner'; JP.sound.racket(0.8); }
    JP.say(word, drone.x, drone.y - 5.4 * Rb, true);
    JP.puff(drone.x, drone.y + (b.kind === 0 ? Rb : 0), 16, ORANGE);
    netKick = 1;
    if (navigator.vibrate) navigator.vibrate(12);
    JP.addScore(1);
    drone.caughtUntil = b.kind === 2 && typeFor(makes).kind === 2 ? JP.clock + 0.45 : 0;
    var t0 = performance.now();                        // rare: the next spot isn't settled yet, so take a moment
    while (!plan.done && (!plan.best || (plan.best.robust < 3 && performance.now() - t0 < 160))) planStep(20);
    if (!plan.done) finishPlan();
    placeTarget(plan.result, makes);
    startPlan(makes + 1);
    if (b.kind !== 2) spare.push(b);
    respawnAt = JP.clock + 0.35;
    ball = null; flying = false;
    var next = typeFor(makes);
    if (next !== ballType) setTimeout(function () { if (JP.state === 'play' && JP.game === api[mixed ? 1 : 0]) JP.say(next.name + ': ' + next.goal, home.x, home.y - 3.2 * Rb, false); }, 380);
    ballType = next;
    JP.goal(ballType.name + ': ' + ballType.goal);
  }

  function missed(b) {
    JP.say('Miss ' + (JP.outs + 1), Math.max(60, Math.min(W - 60, b.x)), Math.min(H - 40, b.y) - 2 * Rb, false);
    JP.sound.bad();
    spare.push(b);
    ball = null; flying = false;
    if (JP.out()) over = true; else respawnAt = JP.clock + 0.3;
  }

  /* ---------- the drone fetching the hoop off the court ---------- */
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  // Describes the drone and what hangs from it. During the intro it flies in, hooks the rim and lifts it.
  function rig() {
    if (drone.ready) return { hx: drone.x, hy: drone.y, rw: RW, flat: 0, net: 1, bx: drone.x, by: drone.y - 3.5 * Rb, sc: 1, cable: 1 };
    var t = intro.t, a = ease(t / 0.9), c = ease((t - 0.9) / 0.35), l = ease((t - 1.25) / 0.75);
    var hoverY = court.y - 2.2 * Rb;
    var sc = 0.66 + 0.34 * l;
    return {
      hx: court.x, hy: court.y, rw: court.r + (RW - court.r) * l, flat: 1 - l, net: l,
      bx: court.x + (W * 0.5 - court.x) * (1 - a) * 0.6, by: (-90) + (hoverY - (-90)) * a - (3.5 * Rb - 2.2 * Rb) * l,
      sc: sc, cable: c
    };
  }

  function update(dt) {
    var clock = JP.clock;
    if (plan && !plan.done) planStep(flying ? 3 : 7);

    if (!drone.ready) {
      intro.t += dt * intro.speed;
      if (intro.t > 0.85 && intro.t - dt * intro.speed <= 0.85) JP.sound.whir();
      if (intro.t >= 2 && !plan.done && plan.best && intro.t > 3.5) finishPlan();
      if (intro.t >= 2 && plan.done) {
        drone.ready = true; drone.x = court.x; drone.y = court.y;
        placeTarget(plan.result, makes); startPlan(makes + 1);
      }
    } else {
      if (drone.amp) { drone.phase += dt * 6.283 / drone.period; drone.tx = drone.cx + Math.sin(drone.phase) * drone.amp; }
      var px = drone.x;
      drone.x += (drone.tx - drone.x) * Math.min(1, dt * (drone.amp ? 9 : 4));
      drone.y += (drone.ty - drone.y) * Math.min(1, dt * 4);
      drone.vx += ((drone.x - px) / Math.max(dt, 0.001) - drone.vx) * Math.min(1, dt * 8);
    }
    drone.wob *= Math.pow(0.02, dt);
    netKick *= Math.pow(0.03, dt);
    for (var gi = 0; gi < glyphs.length; gi++) glyphs[gi].flash *= Math.pow(0.004, dt);

    var steps = Math.max(1, Math.round(dt / DT)), i, s, ev;
    if (ball && flying) {
      for (s = 0; s < steps && ball; s++) {
        ev = stepBall(ball, DT, drone.x, drone.y);
        if (ev & RIM) {
          JP.sound.rim(); drone.wob = 1;
          if (ball.kind && !ball.warned) { ball.warned = true; JP.say(ball.kind === 1 ? 'Needs a bounce first' : 'Too late, it bounced', drone.x, drone.y - 5.4 * Rb, false); }
        } else if (ev & LETTER) {
          var g = glyphs[ball.letter - 1];
          if (g) g.flash = 1;
          JP.sound.drum(ball.letter, ball.impact / (1500 * S));
          JP.puff(ball.x, ball.y, 3, CHALK);
        } else if (ev & (WALL | FLOOR)) JP.sound.thud(ball.impact / (2400 * S), [150, 300, 200][ball.kind]);
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
    if (!ball && !over && clock >= respawnAt) freshBall();
  }

  /* ---------- drawing ---------- */
  function lift(on) {
    ctx.shadowColor = on ? 'rgba(12,22,44,.6)' : 'transparent';
    ctx.shadowBlur = on ? 2.5 * JP.dpr : 0;
    ctx.shadowOffsetY = on ? 1.5 * JP.dpr : 0;
  }

  function drawRig(g, front) {
    var clock = JP.clock, d = Rb * g.sc, hx = g.hx, hy = g.hy, rw = g.rw;
    var bob = JP.reduced || !drone.ready ? 0 : Math.sin(clock * 2.1) * d * 0.14;
    var tilt = Math.max(-0.3, Math.min(0.3, drone.vx * 0.0009)) + Math.sin(clock * 30) * 0.05 * drone.wob;
    var bx = g.bx, by = g.by + bob;
    var ry = rw * (0.3 + 0.7 * g.flat);
    var kind = drone.ready && ballType ? ballType.kind : 0, i;

    if (!front) {
      ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (kind === 0 && g.cable > 0) {
        ctx.moveTo(bx - d * 0.6, by + d * 0.4); ctx.lineTo(bx - d * 0.6 + (hx - rw - bx + d * 0.6) * g.cable, by + d * 0.4 + (hy - by - d * 0.4) * g.cable);
        ctx.moveTo(bx + d * 0.6, by + d * 0.4); ctx.lineTo(bx + d * 0.6 + (hx + rw - bx - d * 0.6) * g.cable, by + d * 0.4 + (hy - by - d * 0.4) * g.cable);
      } else if (kind === 2) {
        ctx.moveTo(bx - d * 0.6, by + d * 0.4); ctx.lineTo(hx - TR * 0.6, hy - TR * 0.8);
        ctx.moveTo(bx + d * 0.6, by + d * 0.4); ctx.lineTo(hx + TR * 0.6, hy - TR * 0.8);
      }
      ctx.stroke();
      if (kind === 1) {
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
      } else if (kind === 2) {
        var k2 = 1 - netKick * 0.1, gr = TR * k2;
        ctx.fillStyle = '#b0692b';
        ctx.beginPath(); ctx.arc(hx, hy, gr, 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(hx - gr * 0.92, hy - gr * 0.2, gr * 0.42, 0, 6.2832); ctx.fill();
        for (i = 0; i < 4; i++) { var fa = -2.25 + i * 0.5; ctx.beginPath(); ctx.arc(hx + Math.cos(fa) * gr * 0.86, hy + Math.sin(fa) * gr * 0.86, gr * 0.3, 0, 6.2832); ctx.fill(); }
        ctx.fillStyle = '#7d4519';
        ctx.beginPath(); ctx.arc(hx + gr * 0.05, hy + gr * 0.1, gr * 0.56, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = '#e9c48e'; ctx.lineWidth = 1.1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(hx, hy, gr * 0.84, 0.3, 2.9); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.save();
      ctx.translate(bx, by); ctx.rotate(tilt);
      ctx.strokeStyle = '#c9d2d0'; ctx.lineWidth = Math.max(2, d * 0.2); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-d * 2.2, -d * 0.3); ctx.lineTo(d * 2.2, -d * 0.3);
      ctx.moveTo(-d * 0.7, d * 0.3); ctx.lineTo(-d * 1.1, d * 0.95);
      ctx.moveTo(d * 0.7, d * 0.3); ctx.lineTo(d * 1.1, d * 0.95);
      ctx.stroke();
      ctx.fillStyle = '#e6ebe8';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-d * 1.05, -d * 0.55, d * 2.1, d * 0.95, d * 0.4); else ctx.rect(-d * 1.05, -d * 0.55, d * 2.1, d * 0.95);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(d * 0.5, -d * 0.08, d * 0.24, 0, 6.2832); ctx.fill();
      ctx.fillStyle = (clock % 1.4) < 0.7 ? ORANGE : '#8a3a1c';
      ctx.beginPath(); ctx.arc(-d * 0.6, -d * 0.1, d * 0.11, 0, 6.2832); ctx.fill();
      for (var side = -1; side <= 1; side += 2) {
        ctx.fillStyle = '#c9d2d0';
        ctx.fillRect(side * d * 2.2 - d * 0.14, -d * 0.62, d * 0.28, d * 0.36);
        var spin = JP.reduced ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(clock * 47 + side));
        ctx.fillStyle = 'rgba(20,35,59,.3)';
        ctx.beginPath(); ctx.ellipse(side * d * 2.2, -d * 0.72, d * 1.25 * spin, d * 0.1, 0, 0, 6.2832); ctx.fill();
      }
      ctx.restore();

      if (kind === 0) {
        ctx.strokeStyle = g.flat > 0.5 ? ORANGE : '#b24a1c'; ctx.lineWidth = Math.max(2.5, d * 0.22);
        ctx.beginPath(); ctx.ellipse(hx, hy, rw, ry, 0, Math.PI, 2 * Math.PI); ctx.stroke();
      }
    } else if (kind === 2) {
      if (clock < drone.caughtUntil) JP.drawBall(2, hx + TR * 0.05, hy + TR * 0.1, BALLS[1].r, 0.6, 1);
    } else if (kind === 0) {
      var sway = Math.sin(clock * 22) * netKick * d * 0.5, drop = d * (1.9 + netKick * 0.5), n = 7;
      if (g.net > 0.02) {
        ctx.globalAlpha = g.net;
        ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (i = 0; i <= n; i++) {
          var t = i / n, xt = hx - rw + t * 2 * rw, xb = hx - rw * 0.55 + t * 1.1 * rw + sway;
          var yt = hy + Math.sin(t * Math.PI) * ry;
          ctx.moveTo(xt, yt); ctx.quadraticCurveTo((xt + xb) / 2 + sway * 0.3, hy + drop * 0.55 * g.net, xb, hy + drop * g.net);
        }
        for (i = 1; i <= 2; i++) {
          var f = i / 3, w = rw * (1 - 0.45 * f);
          ctx.moveTo(hx - w + sway * f, hy + drop * f * g.net + 2); ctx.quadraticCurveTo(hx + sway * f, hy + drop * f * g.net + ry * 0.8, hx + w + sway * f, hy + drop * f * g.net + 2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ORANGE; ctx.lineWidth = Math.max(2.5, d * 0.22);
      ctx.beginPath(); ctx.ellipse(hx, hy, rw, ry, 0, 0, Math.PI); ctx.stroke();
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
    var hxp = ball.x - L.ux * L.f * MAXPULL * 0.6, hyp = ball.y - L.uy * L.f * MAXPULL * 0.6;
    ctx.strokeStyle = 'rgba(251,246,234,.95)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(hxp, hyp); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(hxp, hyp, 5, 0, 6.2832); ctx.fillStyle = CHALK; ctx.fill();
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

  function draw() {
    var clock = JP.clock, i, g = rig();
    // letters light up when struck
    ctx.font = '400 ' + fs + 'px ' + JP.FONT; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    for (i = 0; i < glyphs.length; i++) {
      if (glyphs[i].flash < 0.03) continue;
      ctx.globalAlpha = glyphs[i].flash * 0.85; ctx.fillStyle = ORANGE;
      ctx.fillText(glyphs[i].ch, glyphs[i].x, glyphs[i].y - glyphs[i].flash * fs * 0.012);
    }
    ctx.globalAlpha = 1;

    lift(true); drawRig(g, false); lift(false);
    for (i = 0; i < spare.length; i++) JP.drawBall(spare[i].kind, spare[i].x, spare[i].y, spare[i].r, spare[i].ang, Math.max(0, Math.min(1, spare[i].fade * 2)));
    if (ball) {
      if (!flying && !aim && !JP.reduced && drone.ready) {
        var pr = ball.r + 5 + (Math.sin(clock * 3) + 1) * 3;
        ctx.strokeStyle = 'rgba(20,35,59,' + (0.5 - (Math.sin(clock * 3) + 1) * 0.17).toFixed(3) + ')';
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ball.x, ball.y, pr, 0, 6.2832); ctx.stroke();
      }
      JP.drawBall(ball.kind, ball.x, ball.y, ball.r, ball.ang, 1);
    }
    lift(true);
    drawRig(g, true);
    if (aim && ball && !flying) drawAim();
    lift(false);
    if (JP.state === 'idle' && !usedHint && ball && !aim && drone.ready) {
      ctx.font = '500 11px ' + JP.MONO;
      ctx.textAlign = 'right'; ctx.fillStyle = INK;
      if (tall()) { ctx.textBaseline = 'bottom'; ctx.fillText('PULL BACK & LET GO ↗', W - 26, ball.y - ball.r - 12); }
      else { ctx.textBaseline = 'top'; ctx.fillText('PULL BACK & LET GO ↗', Math.min(W - 16, ball.x + ball.r + 4), ball.y + ball.r + 14); }
    }
  }

  /* ---------- input ---------- */
  function down(p) { if (!aim) aim = { sx: p.x, sy: p.y, px: p.x, py: p.y }; }
  function move(p, dragging) { if (aim && dragging) { aim.px = p.x; aim.py = p.y; } }
  function up(p) {
    if (!aim) return;
    aim.px = p.x; aim.py = p.y;
    var L = launchFromAim();
    aim = null;
    if (!L || !ball || flying || !drone.ready || over) return;
    ball.vx = L.vx; ball.vy = L.vy;
    flying = true; usedHint = true;
    JP.sound.launch();
    JP.begin();
  }

  function debug() {
    return { makes: makes, flying: flying, ready: drone.ready, settled: drone.ready && Math.abs(drone.x - drone.tx) + Math.abs(drone.y - drone.ty) < 1.5,
      robust: lastSpot ? lastSpot.robust : -1, amp: drone.amp, kind: ballType ? ballType.kind : 0,
      pull: drone.sol && ballType ? { dx: -drone.sol.vx / (VMAX * ballType.power) * MAXPULL, dy: -drone.sol.vy / (VMAX * ballType.power) * MAXPULL } : null };
  }

  function make(isMixed) {
    return {
      lede: function () {
        return (tall() ? 'The ball resting on my name is yours: ' : 'The dot after my name is a ball: ') +
          (isMixed ? 'pull back, aim at whatever the drone is carrying, let go.' : 'pull back, aim for the hoop, let go.');
      },
      overTitle: 'Three misses', outWord: 'misses',
      layout: layout, floor: floor, reset: function () { reset(isMixed); }, update: update, draw: draw,
      down: down, move: move, up: up, cancel: function () { aim = null; }, debug: debug
    };
  }
  var api = [make(false), make(true)];
  JP.register('hoops', api[0]);
  JP.register('mixed', api[1]);
})();
