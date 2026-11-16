/* Tennis: a hard court from above. PETTYJOHN is the net. Move your racket to rally with the drone. */
(function () {
  'use strict';
  var JP = window.JP;
  if (!JP) return;
  var ctx = JP.ctx, CHALK = JP.CHALK, INK = JP.INK, NAVY = JP.NAVY, ORANGE = JP.ORANGE;

  var W, H, S, cw, ch, cx0, cx1, top, bot, netY, si, br, R, GZ;
  var netGlyphs = [], netFs = 40, netH = 30;

  function layout() {
    W = JP.W; H = JP.H; S = JP.S;
    top = 58; bot = H - 22;
    ch = bot - top;
    cw = Math.min(W - 36, ch * (JP.land ? 0.66 : 0.5));
    cx0 = (W - cw) / 2; cx1 = cx0 + cw;
    netY = top + ch / 2;
    si = cw * 4.5 / 36;
    br = Math.max(6, Math.min(11, cw * 0.022));
    R = Math.max(36, cw * 0.1);
    GZ = 1500 * S;

    // the net is the surname, letter by letter
    var word = JP.WORDS[1];
    ctx.font = '400 100px ' + JP.FONT;
    var w100 = ctx.measureText(word).width, spread = cw * 0.9;
    netFs = Math.min(64, Math.max(20, cw * 0.075));
    ctx.font = '400 ' + netFs + 'px ' + JP.FONT;
    var natural = w100 * netFs / 100, gap = (spread - natural) / (word.length - 1), x = cx0 + cw * 0.05;
    netGlyphs = [];
    for (var i = 0; i < word.length; i++) {
      var gw = ctx.measureText(word[i]).width;
      netGlyphs.push({ ch: word[i], x: x + gw / 2, o: 0, v: 0 });
      x += gw + gap;
    }
    netH = netFs * 0.74 + 12;
  }

  function floor(c) {
    // surround
    c.fillStyle = '#2c7355'; c.fillRect(0, 0, W, H);
    var seed = 7;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
    for (var i = 0; i < 2600; i++) {            // a little grit, like an acrylic surface
      c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)';
      c.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
    }
    c.fillStyle = '#2b5c9a'; c.fillRect(cx0, top, cw, ch);
    for (i = 0; i < 1400; i++) {
      c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.04)';
      c.fillRect(cx0 + rnd() * cw, top + rnd() * ch, 1.5, 1.5);
    }
    // the first name, painted behind the far service line
    c.save();
    var fsz = Math.min(cw * 0.3, ch * 0.16);
    c.font = '400 ' + fsz + 'px ' + JP.FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(251,246,234,.13)';
    c.fillText(JP.WORDS[0], W / 2, top + ch * 0.105);
    c.restore();

    var lw = Math.max(2, cw * 0.007), sl = (ch / 2) * 21 / 39;
    c.strokeStyle = CHALK; c.lineWidth = lw;
    c.strokeRect(cx0, top, cw, ch);
    c.beginPath();
    c.moveTo(cx0 + si, top); c.lineTo(cx0 + si, bot);
    c.moveTo(cx1 - si, top); c.lineTo(cx1 - si, bot);
    c.moveTo(cx0 + si, netY - sl); c.lineTo(cx1 - si, netY - sl);
    c.moveTo(cx0 + si, netY + sl); c.lineTo(cx1 - si, netY + sl);
    c.moveTo(W / 2, netY - sl); c.lineTo(W / 2, netY + sl);
    c.moveTo(W / 2, top); c.lineTo(W / 2, top + 8); c.moveTo(W / 2, bot); c.lineTo(W / 2, bot - 8);
    c.stroke();
    var sh = c.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
    sh.addColorStop(0, 'rgba(255,255,255,.07)'); sh.addColorStop(1, 'rgba(0,0,20,.22)');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }

  /* ---------- state ---------- */
  var ball = null, trail = [], marks = [];
  var me = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, swing: 0, dir: 1 };
  var bot_ = { x: 0, y: 0, swing: 0, tx: 0, ty: 0, alt: 0.5 };
  var rally = 0, serveAt = 0, over = false, moved = false;

  function reset() {
    ball = null; trail.length = 0; marks.length = 0; rally = 0; over = false; serveAt = 0;
    me.x = me.tx = W / 2; me.y = me.ty = netY + ch * 0.36; me.vx = me.vy = 0; me.swing = 0;
    bot_.x = bot_.tx = W / 2; bot_.y = bot_.ty = top + ch * 0.13; bot_.swing = 0;
    JP.goal('Keep the rally going');
  }

  // Send the ball from where it is to land at (tx, ty) after T seconds.
  function send(tx, ty, T, toMe) {
    ball.vx = (tx - ball.x) / T; ball.vy = (ty - ball.y) / T;
    ball.vz = (0.5 * GZ * T * T - ball.z) / T;
    ball.bounces = 0; ball.toMe = toMe; ball.tx = tx; ball.ty = ty; ball.T = T; ball.t = 0; ball.crossed = false;
  }

  function serve() {
    rally = 0;
    ball = { x: bot_.x, y: bot_.y + 18, z: 46 * S, vx: 0, vy: 0, vz: 0, spin: 0 };
    var tx = W / 2 + (Math.random() - 0.5) * (cw - 2 * si) * 0.6;
    send(tx, netY + ch * (0.22 + Math.random() * 0.1), 1.2, true);
    bot_.swing = 1;
    JP.sound.racket(0.4);
    trail.length = 0;
  }

  function level() { return JP.score; }

  function myHit() {
    var off = Math.max(-1, Math.min(1, (ball.x - me.x) / R * 1.1 + me.vx / (cw * 2.6)));
    var half = cw / 2 - si - br * 2;
    var tx = W / 2 + off * half;
    var pace = Math.max(0, Math.min(1, -me.vy / (ch * 1.2)));
    var ty = netY - (ch / 2) * (0.5 + 0.2 * Math.random() + 0.22 * pace);
    var T = Math.max(0.6, 1.02 - rally * 0.012) * (1 - 0.22 * pace);
    send(tx, ty, T, false);
    me.swing = 1; me.dir = off >= 0 ? 1 : -1;
    rally++;
    JP.addScore(1);
    JP.sound.racket(0.5 + pace * 0.5);
    JP.puff(ball.x, ball.y, 4, '#d9ee3f', 0.6);
    if (navigator.vibrate) navigator.vibrate(8);
    planBot();
  }

  // The drone heads for where it can meet the ball just after the bounce.
  function planBot() {
    var k = ball.T + 0.2;
    bot_.tx = Math.max(cx0 - 10, Math.min(cx1 + 10, ball.x + ball.vx * k));
    bot_.ty = Math.max(top - 4, Math.min(netY - R * 1.6, ball.y + ball.vy * k));
    bot_.meetAt = JP.clock + k;
  }

  function botHit() {
    var lv = level(), half = cw / 2 - si - br * 2;
    var tx;
    if (Math.random() < Math.min(0.8, 0.3 + lv * 0.018)) tx = W / 2 + (me.x < W / 2 ? 1 : -1) * half * (0.55 + 0.4 * Math.random());   // away from you
    else tx = W / 2 + (Math.random() - 0.5) * 2 * half * 0.65;
    var ty = netY + (ch / 2) * (0.45 + 0.42 * Math.random());
    send(tx, ty, Math.max(0.68, 1.16 - rally * 0.014 - lv * 0.006), true);
    bot_.swing = 1;
    JP.sound.racket(0.5);
    bot_.tx = W / 2; bot_.ty = top + ch * 0.13;
  }

  function pointOver(won) {
    if (won) {
      JP.addScore(3);
      JP.say('Winner  +3', ball.x, Math.max(top + 40, ball.y), true);
      JP.sound.good();
      serveAt = JP.clock + 1.2;
    } else {
      JP.say('Miss ' + (JP.outs + 1), Math.max(70, Math.min(W - 70, ball.x)), Math.min(H - 60, ball.y) - 20, false);
      JP.sound.bad();
      if (JP.out()) over = true; else serveAt = JP.clock + 1.2;
    }
    ball.dead = JP.clock;
    bot_.tx = W / 2; bot_.ty = top + ch * 0.13;
  }

  function update(dt) {
    var clock = JP.clock, i;
    // rackets
    var px = me.x, py = me.y;
    me.x += (me.tx - me.x) * Math.min(1, dt * 26);
    me.y += (me.ty - me.y) * Math.min(1, dt * 26);
    if (dt > 0) { me.vx += ((me.x - px) / dt - me.vx) * Math.min(1, dt * 14); me.vy += ((me.y - py) / dt - me.vy) * Math.min(1, dt * 14); }
    me.swing = Math.max(0, me.swing - dt * 5.5);
    bot_.swing = Math.max(0, bot_.swing - dt * 5.5);
    var sp = cw * (0.62 + Math.min(0.3, level() * 0.012)) * dt;
    var dx = bot_.tx - bot_.x, dy = bot_.ty - bot_.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > sp) { bot_.x += dx / d * sp; bot_.y += dy / d * sp; bot_.lean = dx / d; } else { bot_.x = bot_.tx; bot_.y = bot_.ty; bot_.lean = 0; }

    for (i = 0; i < netGlyphs.length; i++) {
      var g = netGlyphs[i];
      g.v += (-g.o * 260 - g.v * 9) * dt; g.o += g.v * dt;
    }
    for (i = marks.length - 1; i >= 0; i--) if (clock - marks[i].t > 2.2) marks.splice(i, 1);

    if (JP.state === 'play' && !ball && !over && serveAt && clock >= serveAt) serve();
    if (!ball) return;
    if (ball.dead && clock - ball.dead > 0.9) { ball = null; return; }

    var prevY = ball.y;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vz -= GZ * dt; ball.z += ball.vz * dt;
    ball.t += dt; ball.spin += dt * 9;
    if (ball.z <= 0) {
      ball.z = 0; ball.vz = -ball.vz * 0.7; ball.vx *= 0.9; ball.vy *= 0.9;
      if (ball.vz > 40 * S) {
        ball.bounces++;
        marks.push({ x: ball.x, y: ball.y, t: clock });
        JP.sound.thud(0.5, 280);
        JP.puff(ball.x, ball.y, 3, 'rgba(255,255,255,.6)', 0.4);
      } else ball.vz = 0;
    }
    trail.push(ball.x, ball.y - ball.z * 0.55);
    if (trail.length > 22) trail.splice(0, 2);
    if ((prevY - netY) * (ball.y - netY) <= 0 && !ball.crossed) {       // over the net: the nearest letters shiver
      ball.crossed = true;
      for (i = 0; i < netGlyphs.length; i++) {
        var near = Math.max(0, 1 - Math.abs(netGlyphs[i].x - ball.x) / (cw * 0.2));
        netGlyphs[i].v -= near * 150;
      }
    }
    if (ball.dead) return;

    if (ball.toMe) {
      var mx = ball.x - me.x, my = ball.y - ball.z * 0.3 - me.y;
      if (ball.y > netY + 6 && mx * mx + my * my < (R + br) * (R + br) && ball.z < 90 * S) myHit();
      else if (ball.bounces >= 2 || ball.y > H + 30 || ball.x < -30 || ball.x > W + 30) pointOver(false);
    } else {
      var bx = ball.x - bot_.x, by = ball.y - bot_.y;
      if (ball.bounces >= 1 && bx * bx + by * by < (R * 1.05 + br) * (R * 1.05 + br)) botHit();
      else if (ball.bounces >= 2 || ball.y < -30 || ball.x < -30 || ball.x > W + 30) pointOver(true);
    }
  }

  /* ---------- drawing ---------- */
  function racket(x, y, ang, scale, frame) {
    var s = R * 0.5 * scale;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(8,16,30,.22)';
    ctx.beginPath(); ctx.ellipse(s * 0.25, s * 0.3 - s * 1.5, s * 0.8, s * 1.0, 0, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = Math.max(4, s * 0.28); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, s * 0.9); ctx.lineTo(0, -s * 0.4); ctx.stroke();
    ctx.strokeStyle = ORANGE; ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.lineTo(-s * 0.36, -s * 0.72); ctx.moveTo(0, -s * 0.2); ctx.lineTo(s * 0.36, -s * 0.72); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -s * 1.5, s * 0.78, s * 0.98, 0, 0, 6.2832); ctx.clip();
    ctx.fillStyle = 'rgba(251,246,234,.2)'; ctx.fillRect(-s, -s * 2.6, 2 * s, 2.2 * s);
    ctx.strokeStyle = 'rgba(251,246,234,.85)'; ctx.lineWidth = 1;
    ctx.beginPath();
    var gap = Math.max(3.5, s * 0.24);
    for (var i = -6; i <= 6; i++) { ctx.moveTo(i * gap, -s * 2.6); ctx.lineTo(i * gap, -s * 0.4); ctx.moveTo(-s, -s * 1.5 + i * gap); ctx.lineTo(s, -s * 1.5 + i * gap); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = frame; ctx.lineWidth = Math.max(2.5, s * 0.17);
    ctx.beginPath(); ctx.ellipse(0, -s * 1.5, s * 0.78, s * 0.98, 0, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }

  function draw() {
    var clock = JP.clock, i;
    // bounce marks
    for (i = 0; i < marks.length; i++) {
      ctx.fillStyle = 'rgba(10,25,50,' + (0.28 * (1 - (clock - marks[i].t) / 2.2)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(marks[i].x, marks[i].y, br * 1.1, br * 0.8, 0, 0, 6.2832); ctx.fill();
    }
    // where the ball will land on your side
    if (ball && !ball.dead && ball.toMe && ball.bounces === 0) {
      var left = Math.max(0, 1 - ball.t / ball.T);
      ctx.strokeStyle = 'rgba(251,246,234,' + (0.25 + 0.6 * (1 - left)).toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ball.tx, ball.ty, br * (1.3 + left * 3.2), 0, 6.2832); ctx.stroke();
    }

    // drone and its racket
    var bsw = bot_.swing, bAng = Math.PI + (bsw > 0 ? Math.sin(bsw * Math.PI) * 1.5 * (bot_.x < W / 2 ? 1 : -1) : 0.25);
    racket(bot_.x + R * 0.1, bot_.y + R * 0.5, bAng, 0.95, CHALK);
    JP.droneTop(bot_.x, bot_.y, R * 0.42, (bot_.lean || 0) * 0.25, 0.5, false);

    // net: a dark band with the name stitched across it
    ctx.fillStyle = 'rgba(8,16,30,.28)'; ctx.fillRect(cx0 - 8, netY + netH * 0.35, cw + 16, netH * 0.45);
    ctx.fillStyle = NAVY; ctx.fillRect(cx0 - 10, netY - netH / 2, cw + 20, netH);
    ctx.strokeStyle = 'rgba(251,246,234,.13)'; ctx.lineWidth = 1; ctx.beginPath();
    for (var mx = cx0 - 10; mx <= cx1 + 10; mx += 7) { ctx.moveTo(mx, netY - netH / 2); ctx.lineTo(mx, netY + netH / 2); }
    ctx.stroke();
    ctx.fillStyle = CHALK; ctx.fillRect(cx0 - 10, netY - netH / 2, cw + 20, 3);
    ctx.fillStyle = '#c9d2d0';
    ctx.beginPath(); ctx.arc(cx0 - 12, netY, 6, 0, 6.2832); ctx.arc(cx1 + 12, netY, 6, 0, 6.2832); ctx.fill();
    ctx.font = '400 ' + netFs + 'px ' + JP.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (i = 0; i < netGlyphs.length; i++) {
      var g = netGlyphs[i], lift = Math.abs(g.o);
      ctx.fillStyle = lift > 1.5 ? '#ffd9b8' : CHALK;
      ctx.fillText(g.ch, g.x, netY + netFs * 0.37 + 2 + g.o);
    }

    // ball: shadow on the court, the ball itself drawn higher and larger the higher it is
    if (ball) {
      var a = ball.dead ? Math.max(0, 1 - (clock - ball.dead) / 0.9) : 1;
      if (trail.length > 3 && !JP.reduced) {
        for (i = 0; i < trail.length; i += 2) {
          ctx.globalAlpha = a * 0.22 * (i / trail.length);
          ctx.fillStyle = '#d9ee3f';
          ctx.beginPath(); ctx.arc(trail[i], trail[i + 1], br * (0.5 + 0.5 * i / trail.length), 0, 6.2832); ctx.fill();
        }
      }
      ctx.globalAlpha = a * 0.3; ctx.fillStyle = '#08101e';
      ctx.beginPath(); ctx.ellipse(ball.x + ball.z * 0.12, ball.y + ball.z * 0.1, br * 1.05, br * 0.8, 0, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1;
      JP.drawBall(1, ball.x, ball.y - ball.z * 0.55, br * (1 + ball.z / (220 * S)), ball.spin, a, true);
    }

    // you
    var ang = me.swing > 0 ? me.dir * (1.2 - Math.sin((1 - me.swing) * Math.PI * 0.5) * 2.4) : Math.max(-0.5, Math.min(0.5, me.vx / (cw * 3)));
    racket(me.x, me.y + R * 0.75, ang, 1, CHALK);

    if (JP.state === 'idle') {
      ctx.font = '500 11px ' + JP.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var label = moved ? 'TAP OR CLICK TO START' : 'MOVE YOUR RACKET · TAP TO START', tw = ctx.measureText(label).width / 2 + 10;
      ctx.fillStyle = 'rgba(20,35,59,.85)'; ctx.fillRect(W / 2 - tw, netY + ch * 0.2 - 12, tw * 2, 24);
      ctx.fillStyle = CHALK; ctx.fillText(label, W / 2, netY + ch * 0.2 + 1);
    }
  }

  /* ---------- input: the racket follows the pointer (lifted clear of a fingertip) ---------- */
  function aimAt(p) {
    me.tx = Math.max(10, Math.min(W - 10, p.x));
    me.ty = Math.max(netY + R * 0.5, Math.min(H - 10, p.y - (p.touch ? R * 1.6 : R * 0.75)));
    moved = true;
  }
  function down(p) {
    aimAt(p);
    if (JP.state === 'idle') { JP.begin(); serveAt = JP.clock + 0.7; }
  }

  JP.register('tennis', {
    lede: 'Rally with the drone over a net made of my name: move your racket to the ball.',
    overTitle: 'Three misses', outWord: 'misses',
    layout: layout, floor: floor, reset: reset, update: update, draw: draw,
    down: down, move: function (p) { aimAt(p); }, up: function () {},
    key: function () { if (JP.state === 'idle') { JP.begin(); serveAt = JP.clock + 0.7; } },
    debug: function () {
      return { ball: ball && !ball.dead ? { x: ball.x, y: ball.y, toMe: ball.toMe, tx: ball.tx, ty: ball.ty, vx: ball.vx, vy: ball.vy, bounces: ball.bounces } : null, rally: rally, R: R };
    }
  });
})();
