/* Baseball: a field from above. The drone pitches, you swing, and J-E-F-F play the infield.
   Timing decides everything: early pulls it left, late pushes it right, dead-on goes deep. */
(function () {
  'use strict';
  var JP = window.JP;
  if (!JP) return;
  var ctx = JP.ctx, CHALK = JP.CHALK, INK = JP.INK, NAVY = JP.NAVY, ORANGE = JP.ORANGE;

  var W, H, S, hx, hy, RF, TH, B, br, lfs, fenceFs;
  var fielders = [], fenceGlyphs = [];

  function at(r, phi) { return { x: hx + r * Math.sin(phi), y: hy - r * Math.cos(phi) }; }

  function layout() {
    W = JP.W; H = JP.H; S = JP.S;
    hx = W / 2; hy = H - Math.max(84, H * 0.13);
    RF = hy - (W < 700 ? 132 : 80);
    TH = Math.max(0.3, Math.min(Math.PI / 4, Math.asin(Math.min(1, (W / 2 - 14) / (RF * 0.87)))));
    B = RF * 0.27;
    br = Math.max(5, Math.min(9, RF * 0.012));
    lfs = Math.max(22, Math.min(62, RF * 0.095, 0.46 * TH * 0.45 * RF * 0.82));
    var spots = [[-0.72, 0.4], [-0.26, 0.45], [0.26, 0.45], [0.72, 0.4]];
    fielders = [];
    for (var i = 0; i < 4; i++) fielders.push({ ch: JP.WORDS[0][i], phi: spots[i][0] * TH, r: spots[i][1] * RF, off: 0, want: 0, hop: 0 });

    // the surname runs along the outfield wall
    fenceFs = Math.max(16, Math.min(34, RF * 0.055));
    ctx.font = '400 ' + fenceFs + 'px ' + JP.FONT;
    var word = JP.WORDS[1], rad = RF + fenceFs * 0.75, total = 0, ws = [];
    for (i = 0; i < word.length; i++) { ws.push(ctx.measureText(word[i]).width + fenceFs * 0.28); total += ws[i]; }
    var a = -total / rad / 2;
    fenceGlyphs = [];
    for (i = 0; i < word.length; i++) { fenceGlyphs.push({ ch: word[i], phi: a + ws[i] / rad / 2, rad: rad }); a += ws[i] / rad; }
  }

  function wedge(c, r0, r1, a0, a1) {
    c.beginPath();
    c.arc(hx, hy, r1, -Math.PI / 2 + a0, -Math.PI / 2 + a1);
    c.arc(hx, hy, r0, -Math.PI / 2 + a1, -Math.PI / 2 + a0, true);
    c.closePath();
  }

  function floor(c) {
    var i, p;
    c.fillStyle = '#17263f'; c.fillRect(0, 0, W, H);                       // beyond the wall
    var FW = TH + 0.3;                                                      // fair territory plus a strip of foul ground
    c.fillStyle = '#2f6f45'; wedge(c, 0, RF, -FW, FW); c.fill();
    c.beginPath(); c.arc(hx, hy, RF * 0.2, 0, 6.2832); c.fill();            // behind the plate
    // mown stripes across fair territory
    for (i = 0; i < 11; i++) {
      c.fillStyle = i % 2 ? '#3b8a52' : '#347f4b';
      wedge(c, RF * i / 11, RF * (i + 1) / 11 + 0.5, -TH, TH); c.fill();
    }
    c.fillStyle = '#b98952'; wedge(c, RF * 0.95, RF, -FW, FW); c.fill();   // warning track
    // infield dirt, then the grass diamond inside it
    c.fillStyle = '#c4935a'; wedge(c, 0, RF * 0.5, -TH, TH); c.fill();
    var b1 = at(B, TH), b3 = at(B, -TH), b2 = { x: hx, y: hy - 2 * B * Math.cos(TH) };
    c.fillStyle = '#3b8a52';
    c.beginPath();
    var inset = 0.86, cy = hy - B * Math.cos(TH);
    c.moveTo(hx, cy + (hy - cy) * inset); c.lineTo(hx + (b1.x - hx) * inset, cy); c.lineTo(hx, cy + (b2.y - cy) * inset); c.lineTo(hx + (b3.x - hx) * inset, cy);
    c.closePath(); c.fill();
    c.fillStyle = '#c4935a';
    c.beginPath(); c.arc(hx, hy - RF * 0.2, RF * 0.035, 0, 6.2832); c.fill();   // mound
    c.beginPath(); c.arc(hx, hy, RF * 0.06, 0, 6.2832); c.fill();               // home circle
    var seed = 11;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
    for (i = 0; i < 2200; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.045)';
      c.fillRect(rnd() * W, 60 + rnd() * (H - 60), 1.5, 1.5);
    }
    // chalk
    c.strokeStyle = CHALK; c.lineWidth = Math.max(2, RF * 0.004);
    p = at(RF, -TH); c.beginPath(); c.moveTo(hx, hy); c.lineTo(p.x, p.y);
    p = at(RF, TH); c.moveTo(hx, hy); c.lineTo(p.x, p.y); c.stroke();
    c.strokeRect(hx - RF * 0.055, hy - RF * 0.035, RF * 0.03, RF * 0.07);
    c.strokeRect(hx + RF * 0.025, hy - RF * 0.035, RF * 0.03, RF * 0.07);
    c.fillStyle = CHALK;
    var bs = Math.max(5, RF * 0.011);
    [b1, b2, b3].forEach(function (q) { c.save(); c.translate(q.x, q.y); c.rotate(Math.PI / 4); c.fillRect(-bs, -bs, 2 * bs, 2 * bs); c.restore(); });
    c.fillRect(hx - RF * 0.03, hy - RF * 0.2 - 2, RF * 0.06, 4);                // rubber
    c.beginPath(); c.moveTo(hx - bs, hy - bs); c.lineTo(hx + bs, hy - bs); c.lineTo(hx + bs, hy); c.lineTo(hx, hy + bs); c.lineTo(hx - bs, hy); c.closePath(); c.fill();
    // the wall and the name on it
    c.strokeStyle = '#f2c14e'; c.lineWidth = Math.max(3, RF * 0.006);
    c.beginPath(); c.arc(hx, hy, RF, -Math.PI / 2 - FW, -Math.PI / 2 + FW); c.stroke();
    c.font = '400 ' + fenceFs + 'px ' + JP.FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = CHALK;
    for (i = 0; i < fenceGlyphs.length; i++) {
      var g = fenceGlyphs[i]; p = at(g.rad, g.phi);
      c.save(); c.translate(p.x, p.y); c.rotate(g.phi); c.fillText(g.ch, 0, 0); c.restore();
    }
    var sh = c.createRadialGradient(hx, hy - RF * 0.5, 0, hx, hy - RF * 0.5, Math.max(W, H) * 0.8);
    sh.addColorStop(0, 'rgba(255,255,230,.07)'); sh.addColorStop(1, 'rgba(0,10,0,.25)');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }

  /* ---------- state ---------- */
  var phase = 'wait', phaseAt = 0, nextAt = 0, pitch = null, hit = null, strikes = 0, over = false;
  var swingAt = -9, swung = false, baseFlash = 0, baseN = 0, partyUntil = 0, partyNext = 0, trail = [];
  var WIND = 0.8;

  function goal() { JP.goal(strikes ? 'Strikes: ' + strikes : 'Tap to swing'); }

  function reset() {
    phase = 'wait'; nextAt = 0; pitch = null; hit = null; strikes = 0; over = false; swingAt = -9; swung = false; partyUntil = 0; trail.length = 0;
    for (var i = 0; i < 4; i++) { fielders[i].off = fielders[i].want = 0; fielders[i].hop = 0; }
    goal();
  }

  function win() { return Math.max(0.085, 0.105 - JP.score * 0.0008); }

  function startPitch() {
    var lv = JP.score, T = Math.max(0.43, 0.8 - lv * 0.011), kind = 'fast', r = Math.random();
    if (lv >= 3 && r < 0.26) { kind = 'change'; T *= 1.4; }
    else if (lv >= 6 && r < 0.55) kind = 'curve';
    pitch = { T: T, kind: kind, brk: kind === 'curve' ? (Math.random() < 0.5 ? -1 : 1) * RF * 0.035 : 0, t: 0 };
    phase = 'windup'; phaseAt = JP.clock; swung = false; trail.length = 0;
    for (var i = 0; i < 4; i++) fielders[i].want = 0;
  }

  function pitchPos(s) {
    var y0 = hy - RF * 0.2 + RF * 0.03, y1 = hy - 3;
    return { x: hx + pitch.brk * Math.sin(Math.PI * Math.min(1, s)) * (1 - Math.min(1, s) * 0.6), y: y0 + (y1 - y0) * s };
  }

  function strike(looking) {
    strikes++;
    var p = { x: hx, y: hy - RF * 0.1 };
    if (strikes >= 3) {
      strikes = 0;
      JP.say('Strikeout', p.x, p.y, true, '#ffb37a');
      JP.sound.bad();
      if (JP.out()) over = true;
    } else {
      JP.say('Strike ' + strikes + (looking ? ' looking' : ''), p.x, p.y, false);
      JP.sound.whiff();
    }
    goal();
    phase = 'wait'; nextAt = JP.clock + 1.0; pitch = null;
  }

  function contact(err) {
    var w = win(), q = 1 - Math.abs(err) / w;
    var phi = Math.max(-1, Math.min(1, err / w)) * TH * 0.92 + (Math.random() - 0.5) * 0.06;
    phi = Math.max(-TH * 0.97, Math.min(TH * 0.97, phi));
    var p = Math.min(1.05, Math.pow(q, 0.8) * (0.92 + 0.16 * Math.random()));
    hit = { phi: phi, t: 0, x: hx, y: hy, z: 0, done: false };
    strikes = 0; goal();
    JP.sound.crack(); JP.hitStop(0.07); JP.shake(6 + p * 10);
    JP.puff(hx, hy - 4, 8, CHALK, 0.8);
    if (navigator.vibrate) navigator.vibrate(15);

    if (p < 0.5) {
      // a grounder: does a letter get to it?
      hit.ground = true;
      hit.D = RF * (0.52 + p * 0.5);
      hit.T = 0.55 + hit.D / RF * 0.75;
      var who = -1, best = 1e9;
      for (var i = 0; i < 4; i++) {
        var f = fielders[i], lat = f.r * Math.sin(phi - f.phi), reach = f.r * TH * 0.125;
        f.want = Math.max(-reach * 1.6, Math.min(reach * 1.6, lat));
        if (Math.abs(lat) < reach && Math.abs(lat) < best) { best = Math.abs(lat); who = i; }
      }
      if (who >= 0) { hit.fielder = who; hit.D = fielders[who].r; hit.T = 0.35 + hit.D / RF * 0.75; hit.result = 0; }
      else hit.result = 1;
    } else {
      hit.D = RF * (0.2 + 1.05 * Math.pow(p, 1.3));
      hit.result = hit.D >= RF ? 4 : hit.D >= RF * 0.86 ? 3 : hit.D >= RF * 0.7 ? 2 : 1;
      if (hit.result === 4) hit.D = RF * 1.45;
      hit.T = 0.85 + Math.min(1.3, hit.D / RF) * 0.75;
      hit.peak = RF * (0.1 + 0.16 * p);
    }
    phase = 'play'; pitch = null; trail.length = 0;
  }

  function resolve() {
    hit.done = true;
    var r = hit.result, names = ['Out', 'Single', 'Double', 'Triple', 'HOME RUN'];
    if (r === 0) {
      var f = fielders[hit.fielder], p = at(f.r, f.phi);
      f.hop = 1;
      JP.say('Out: fielded by the ' + f.ch, p.x + f.off, p.y - lfs, false);
      JP.sound.mitt();
      if (JP.out()) over = true;
    } else {
      JP.addScore(r);
      baseFlash = 1; baseN = r;
      if (r === 4) {
        JP.say('HOME RUN  +4', hx, hy - RF * 0.55, true, '#ffd27a');
        JP.sound.great(); partyUntil = JP.clock + 1.7; partyNext = 0; JP.shake(10);
      } else {
        JP.say(names[r] + '  +' + r, hit.x, Math.max(96, hit.y - 26), true);
        JP.sound.good();
        JP.puff(hit.x, hit.y, 6, '#d8c28a', 0.5);
      }
    }
    nextAt = JP.clock + (r === 4 ? 2.1 : 1.25);
  }

  function update(dt) {
    var clock = JP.clock, i;
    for (i = 0; i < 4; i++) {
      var f = fielders[i];
      f.off += (f.want - f.off) * Math.min(1, dt * 9);
      f.hop = Math.max(0, f.hop - dt * 3);
    }
    baseFlash = Math.max(0, baseFlash - dt * 0.9);
    if (clock < partyUntil && clock >= partyNext) {
      partyNext = clock + 0.14;
      var q = at(RF * (0.9 + Math.random() * 0.2), (Math.random() - 0.5) * 2 * TH * 0.9);
      JP.puff(q.x, Math.max(70, q.y), 14, ['#ffd27a', ORANGE, CHALK, '#9fd0ff'][Math.floor(Math.random() * 4)], 1.1);
      JP.ring(q.x, Math.max(70, q.y), 26, '#ffd27a');
    }

    if (JP.state !== 'play' && phase === 'wait') return;
    if (phase === 'wait') {
      if (!over && clock >= nextAt) startPitch();
    } else if (phase === 'windup') {
      if (clock - phaseAt >= WIND) { phase = 'flight'; phaseAt = clock; JP.sound.launch(); }
    } else if (phase === 'flight') {
      pitch.t = clock - phaseAt;
      var s = pitch.t / pitch.T, pp = pitchPos(s);
      trail.push(pp.x, pp.y); if (trail.length > 16) trail.splice(0, 2);
      if (swung) {
        var tc = swingAt + 0.08;
        if (clock >= tc && !pitch.judged) {
          pitch.judged = true;
          var err = tc - (phaseAt + pitch.T);
          if (Math.abs(err) <= win()) { contact(err); return; }
          JP.sound.whiff();
        }
      }
      if (s >= 1.22) strike(!swung);
    } else if (phase === 'play') {
      if (!hit.done) {
        hit.t += dt;
        var k = Math.min(1, hit.t / hit.T), e = hit.ground ? 1 - Math.pow(1 - k, 2) : k, pos = at(hit.D * e, hit.phi);
        hit.x = pos.x; hit.y = pos.y;
        hit.z = hit.ground ? Math.abs(Math.sin(k * 14)) * (1 - k) * RF * 0.012 : Math.sin(Math.PI * k) * hit.peak;
        trail.push(hit.x, hit.y - hit.z); if (trail.length > 26) trail.splice(0, 2);
        if (k >= 1) resolve();
      } else if (clock >= nextAt) { hit = null; phase = 'wait'; nextAt = clock; }
    }
  }

  /* ---------- drawing ---------- */
  function draw() {
    var clock = JP.clock, i, p;
    // bases light up to show what the hit was worth
    if (baseFlash > 0.02) {
      var pts = [at(B, TH), { x: hx, y: hy - 2 * B * Math.cos(TH) }, at(B, -TH), { x: hx, y: hy }];
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.globalAlpha = Math.min(1, baseFlash * 1.6);
      ctx.beginPath(); ctx.moveTo(hx, hy);
      for (i = 0; i < baseN; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.fillStyle = '#ffd27a';
      for (i = 0; i < baseN; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 8, 0, 6.2832); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    // the infield: J, E, F, F
    ctx.font = '400 ' + lfs + 'px ' + JP.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (i = 0; i < 4; i++) {
      var f = fielders[i]; p = at(f.r, f.phi);
      var fxp = p.x + f.off * Math.cos(f.phi), fyp = p.y + f.off * Math.sin(f.phi) - Math.sin(f.hop * Math.PI) * lfs * 0.35;
      ctx.fillStyle = 'rgba(8,16,30,.25)';
      ctx.beginPath(); ctx.ellipse(p.x + f.off * Math.cos(f.phi) + 3, p.y + f.off * Math.sin(f.phi) + lfs * 0.42, lfs * 0.3, lfs * 0.1, 0, 0, 6.2832); ctx.fill();
      ctx.save();
      ctx.translate(fxp, fyp); ctx.rotate(Math.max(-0.35, Math.min(0.35, (f.want - f.off) * 0.03)));
      ctx.lineWidth = Math.max(4, lfs * 0.12); ctx.strokeStyle = CHALK; ctx.strokeText(f.ch, 0, 0);
      ctx.fillStyle = f.hop > 0 ? ORANGE : NAVY; ctx.fillText(f.ch, 0, 0);
      ctx.restore();
    }

    // the drone on the mound
    var mx = hx, my = hy - RF * 0.2, alt = 0.35, glow = false, size = Math.max(13, RF * 0.03);
    if (phase === 'windup') {
      var w = (clock - phaseAt) / WIND;
      my -= Math.sin(w * Math.PI) * RF * 0.03; alt = 0.35 + w * 0.5; glow = w > 0.6;
      ctx.strokeStyle = 'rgba(251,246,234,' + (0.2 + 0.5 * w).toFixed(2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, my, size * (3.2 - 2.2 * w), 0, 6.2832); ctx.stroke();
    } else if (phase === 'flight') {
      var rel = Math.min(1, (clock - phaseAt) / 0.18);
      my += Math.sin(rel * Math.PI) * RF * 0.025; alt = 0.85 - rel * 0.5;
    }
    JP.droneTop(mx, my, size, 0, alt, glow);
    if (phase === 'windup' || phase === 'wait') JP.drawBall(2, mx, my + size * 1.5, br, 0, JP.state === 'play' || phase === 'windup' ? 1 : 0.9);

    // pitch
    if (phase === 'flight' && pitch) {
      var s = pitch.t / pitch.T, pp = pitchPos(s), left = Math.max(0, 1 - s);
      ctx.strokeStyle = 'rgba(251,246,234,' + (0.25 + 0.6 * (1 - left)).toFixed(2) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(hx, hy - 3, br * (1.4 + left * 5), 0, 6.2832); ctx.stroke();
      for (i = 0; i < trail.length; i += 2) {
        ctx.globalAlpha = 0.25 * (i / trail.length); ctx.fillStyle = CHALK;
        ctx.beginPath(); ctx.arc(trail[i], trail[i + 1], br * 0.8, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      JP.drawBall(2, pp.x, pp.y, br * (0.85 + 0.35 * Math.min(1, s)), clock * 20, 1);
    }

    // ball in play
    if (hit) {
      for (i = 0; i < trail.length; i += 2) {
        ctx.globalAlpha = 0.3 * (i / trail.length); ctx.fillStyle = CHALK;
        ctx.beginPath(); ctx.arc(trail[i], trail[i + 1], br * (0.5 + 0.6 * i / trail.length), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!(hit.done && hit.result === 0)) {
        var fade = hit.done ? Math.max(0, 1 - (clock - (nextAt - 1.25)) / 1.0) : 1;
        if (hit.result === 4 && hit.t / hit.T > 0.7) fade *= Math.max(0, 1 - (hit.t / hit.T - 0.7) / 0.3);
        ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = '#08101e';
        ctx.beginPath(); ctx.ellipse(hit.x + hit.z * 0.15, hit.y + hit.z * 0.12, br * 1.1, br * 0.8, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        JP.drawBall(2, hit.x, hit.y - hit.z, br * (1 + hit.z / (RF * 0.12)), clock * 14, fade, true);
      }
    }

    // batter and bat
    var px = hx - RF * 0.05, py = hy - 2, L = Math.max(34, RF * 0.1), ang, st = (clock - swingAt) / 0.2;
    if (st >= 0 && st < 1) ang = 1.9 - 4.5 * (1 - Math.pow(1 - st, 1.6));
    else if (st >= 1 && st < 2.2) ang = -2.6;
    else ang = 1.9 + Math.sin(clock * 3) * 0.06;
    ctx.fillStyle = 'rgba(8,16,30,.25)'; ctx.beginPath(); ctx.ellipse(px + 3, py + 5, L * 0.3, L * 0.22, 0, 0, 6.2832); ctx.fill();
    if (st >= 0 && st < 1 && !JP.reduced) {
      for (i = 1; i <= 4; i++) {
        var ga = 1.9 - 4.5 * (1 - Math.pow(1 - Math.max(0, st - i * 0.07), 1.6));
        ctx.strokeStyle = 'rgba(251,246,234,' + (0.2 - i * 0.04).toFixed(2) + ')'; ctx.lineWidth = Math.max(5, L * 0.13); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ga) * L, py + Math.sin(ga) * L); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#3a2413'; ctx.lineWidth = Math.max(6, L * 0.15); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * L, py + Math.sin(ang) * L); ctx.stroke();
    ctx.strokeStyle = '#d9a866'; ctx.lineWidth = Math.max(4, L * 0.1);
    ctx.beginPath(); ctx.moveTo(px + Math.cos(ang) * L * 0.25, py + Math.sin(ang) * L * 0.25); ctx.lineTo(px + Math.cos(ang) * L, py + Math.sin(ang) * L); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.strokeStyle = CHALK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(px - L * 0.06, py, L * 0.17, L * 0.27, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(px - L * 0.06, py, L * 0.13, 0, 6.2832); ctx.fill();

    if (JP.state === 'idle') {
      ctx.font = '500 11px ' + JP.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var label = 'TAP, CLICK OR SPACE TO BAT', tw = ctx.measureText(label).width / 2 + 10, ly = hy - RF * 0.12;
      ctx.fillStyle = 'rgba(20,35,59,.85)'; ctx.fillRect(hx - tw, ly - 12, tw * 2, 24);
      ctx.fillStyle = CHALK; ctx.fillText(label, hx, ly + 1);
    }
  }

  function swing() {
    if (JP.state === 'idle') { JP.begin(); nextAt = JP.clock + 0.6; return; }
    if (over || JP.clock - swingAt < 0.45) return;
    swingAt = JP.clock;
    if (phase === 'flight' && !swung) swung = true; else JP.sound.whiff();
  }

  JP.register('baseball', {
    lede: 'The drone pitches and you swing: tap as the ball reaches the plate, and find the gaps between the letters.',
    overTitle: 'Three outs', outWord: 'outs',
    unit: function (n) { return n === 1 ? 'base' : 'bases'; },
    layout: layout, floor: floor, reset: reset, update: update, draw: draw,
    down: swing, move: function () {}, up: function () {}, key: swing,
    debug: function () { return { phase: phase, strikes: strikes, plateIn: phase === 'flight' ? phaseAt + pitch.T - JP.clock : null, last: hit ? hit.result : null }; }
  });
})();
