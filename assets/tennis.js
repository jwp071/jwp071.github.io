/* Tennis: a hard court from above. PETTYJOHN is the net. Move your racket to play one service game
   against the drone, scored like tennis. */
(function () {
  'use strict';
  var JP = window.JP;
  if (!JP) return;
  var ctx = JP.ctx, CHALK = JP.CHALK, INK = JP.INK, NAVY = JP.NAVY, ORANGE = JP.ORANGE;

  var W, H, S, cw, ch, cx0, cx1, CX, top, bot, netY, si, br, R, GZ;
  var netGlyphs = [], netFs = 40, netH = 30;

  // The court's bottom strip (behind your baseline) may sit under the words, which go away once you play;
  // everything above it must stay clear of the page's boxes.
  function courtFits(x0, y0, w, h) {
    var x1 = x0 + w;
    if (x0 - 22 < 2 || x1 + 22 > W - 2) return false;
    if (JP.covered(x0 - 22, y0, x1 + 22, y0 + h * 0.84)) return false;
    return !JP.covered(x0 - 22, y0 + h * 0.84, x1 + 22, y0 + h, JP.stage === 'idle' ? ['modes'] : null);
  }

  function layout() {
    W = JP.W; H = JP.H; S = JP.S;
    // Biggest court first; at each size, the spot nearest the middle across, centred in the room up and down.
    var asp = JP.land ? 0.66 : 0.5, found = false, h, w, t, k, x, ok;
    for (h = H - 28; h >= 180 && !found; h *= 0.98) {
      w = Math.min(W - 52, h * asp);
      for (k = 0; k <= 30 && !found; k++) {
        x = W / 2 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * W * 0.015 - w / 2;
        ok = [];
        for (t = 14; t + h <= H - 14; t += 4) if (courtFits(x, t, w, h)) ok.push(t);
        if (ok.length) { found = true; top = ok[ok.length >> 1]; ch = h; cw = w; cx0 = x; }
      }
    }
    if (!found) { top = 58; ch = H - 80; cw = Math.min(W - 52, ch * asp); cx0 = (W - cw) / 2; }
    bot = top + ch;
    cx1 = cx0 + cw; CX = cx0 + cw / 2;
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
    c.fillText(JP.WORDS[0], CX, top + ch * 0.105);
    c.fillText(JP.WORDS[0], CX, bot - ch * 0.105);
    c.restore();

    var lw = Math.max(2, cw * 0.007), sl = (ch / 2) * 21 / 39;
    c.strokeStyle = CHALK; c.lineWidth = lw;
    c.strokeRect(cx0, top, cw, ch);
    c.beginPath();
    c.moveTo(cx0 + si, top); c.lineTo(cx0 + si, bot);
    c.moveTo(cx1 - si, top); c.lineTo(cx1 - si, bot);
    c.moveTo(cx0 + si, netY - sl); c.lineTo(cx1 - si, netY - sl);
    c.moveTo(cx0 + si, netY + sl); c.lineTo(cx1 - si, netY + sl);
    c.moveTo(CX, netY - sl); c.lineTo(CX, netY + sl);
    c.moveTo(CX, top); c.lineTo(CX, top + 8); c.moveTo(CX, bot); c.lineTo(CX, bot - 8);
    c.stroke();
    var sh = c.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
    sh.addColorStop(0, 'rgba(255,255,255,.07)'); sh.addColorStop(1, 'rgba(0,0,20,.22)');
    c.fillStyle = sh; c.fillRect(0, 0, W, H);
  }

  /* ---------- state ---------- */
  var ball = null, trail = [], marks = [];
  var me = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, swing: 0, dir: 1 };
  var bot_ = { x: 0, y: 0, swing: 0, tx: 0, ty: 0, alt: 0.5 };
  var rally = 0, serveAt = 0, over = false, moved = false, pace = 0;
  var pts = [0, 0];                       // you, the drone

  /* ---------- scoring ---------- */
  var CALL = ['0', '15', '30', '40'], SAY = ['Love', '15', '30', '40'];
  function deuce() { return pts[0] >= 3 && pts[1] >= 3; }
  function won() { var a = pts[0], b = pts[1]; return Math.max(a, b) >= 4 && Math.abs(a - b) >= 2 ? (a > b ? 1 : 2) : 0; }
  // As in tennis, the server's score comes first, and the drone is serving: Love–15 means you won the point.
  function call() {
    var a = pts[0], b = pts[1];
    if (won()) return 'Game';
    if (deuce()) return a === b ? '40–40' : a > b ? '40–AD' : 'AD–40';
    return CALL[b] + '–' + CALL[a];
  }
  function spoken() {
    var a = pts[0], b = pts[1];
    if (deuce()) return a === b ? 'Deuce' : a > b ? 'Advantage, you' : 'Advantage, drone';
    return a === b ? SAY[a] + '-all' : SAY[b] + '–' + SAY[a];
  }
  function goal() {
    var a = pts[0], b = pts[1];
    JP.goal(deuce() ? (a === b ? 'Deuce' : a > b ? 'Advantage you' : 'Advantage drone') : 'Drone (serving) – you');
  }
  function record() { return [parseInt(JP.store('jp.tennis.won'), 10) || 0, parseInt(JP.store('jp.tennis.played'), 10) || 0]; }

  // The drone serves from alternate sides: deuce court first, crosscourt into your right-hand box.
  function serveSide() { return (pts[0] + pts[1]) % 2 ? -1 : 1; }
  function toServe() { bot_.tx = CX - serveSide() * cw * 0.14; bot_.ty = top + ch * 0.1; }

  function reset() {
    ball = null; trail.length = 0; marks.length = 0; rally = 0; over = false; serveAt = 0; pts = [0, 0];
    place();
    goal();
  }
  function place() {
    me.x = me.tx = CX; me.y = me.ty = netY + ch * 0.26; me.vx = me.vy = 0; me.swing = 0;
    toServe(); bot_.x = bot_.tx; bot_.y = bot_.ty; bot_.swing = 0;
  }

  // Send the ball from where it is to land at (tx, ty) after T seconds.
  function send(tx, ty, T, toMe) {
    ball.vx = (tx - ball.x) / T; ball.vy = (ty - ball.y) / T;
    ball.vz = (0.5 * GZ * T * T - ball.z) / T;
    ball.bounces = 0; ball.toMe = toMe; ball.tx = tx; ball.ty = ty; ball.T = T; ball.t = 0; ball.crossed = false; ball.net = false; ball.judged = false;
    ball.out = tx < cx0 + si - br * 0.5 || tx > cx1 - si + br * 0.5 || (toMe ? ty > bot : ty < top);
  }

  function serve() {
    rally = 0;
    ball = { x: bot_.x, y: bot_.y + 18, z: 46 * S, vx: 0, vy: 0, vz: 0, spin: 0 };
    var sl = (ch / 2) * 21 / 39, side = serveSide();
    send(CX + side * (cw / 2 - si) * (0.2 + 0.6 * Math.random()), netY + sl * (0.55 + 0.38 * Math.random()), 1.2, true);
    bot_.swing = 1;
    JP.sound.racket(0.4);
    trail.length = 0;
  }

  // The drone gets quicker and more precise as the game and each rally go on.
  function level() { return rally + (pts[0] + pts[1]) * 1.5; }
  function botSpeed() { return cw * (0.62 + Math.min(0.16, level() * 0.008)); }

  function myHit() {
    var off = Math.max(-1, Math.min(1, (ball.x - me.x) / R * 1.1 + me.vx / (cw * 4.5)));
    // Off the edge of the racket (or swinging across) the ball goes wide; the wider it goes, the sharper the
    // angle: it lands shorter and right on the line. Swinging up through the ball hits it hard.
    var wide = Math.max(0, Math.abs(off) - 0.5) / 0.5;
    var half = cw / 2 - si - br * (2 - 1.5 * wide);
    var tx = CX + off * half;
    pace = Math.max(0, Math.min(1, -me.vy / (ch * 1.1)));
    var ty = netY - (ch / 2) * Math.max(0.2, 0.5 + 0.2 * Math.random() + 0.22 * pace - 0.5 * wide);
    var T = Math.max(0.55, 1.02 - rally * 0.012) * (1 - 0.32 * pace) * (1 - 0.15 * wide);
    send(tx, ty, T, false);
    me.swing = 1; me.dir = off >= 0 ? 1 : -1;
    rally++;
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
    var dx = bot_.tx - bot_.x, dy = bot_.ty - bot_.y;
    bot_.stretch = Math.sqrt(dx * dx + dy * dy) / botSpeed() / k;     // 1 = only just gets there
  }

  function botHit() {
    var lv = level(), half = cw / 2 - si - br * 2;
    var tx;
    bot_.swing = 1;
    JP.sound.racket(0.5);
    // Under pressure (a long chase, a hard shot, a long rally) the drone sometimes misses: into the net, or wide.
    var err = Math.min(0.4, 0.03 + 0.35 * Math.max(0, (bot_.stretch || 0) - 0.5) + 0.1 * pace + rally * 0.008);
    if (Math.random() < err) {
      if (Math.random() < 0.45) {             // a low ball that catches the tape and drops on its own side
        ball.z = Math.min(ball.z, 14 * S);
        send(ball.x + (CX - ball.x) * 0.25, netY + ch * 0.06, 0.4, true);
        ball.net = true;
      }
      else {
        var sgn = Math.random() < 0.5 ? -1 : 1;
        send(CX + sgn * (cw / 2 - si + si * (0.3 + 0.9 * Math.random())), netY + (ch / 2) * (0.35 + 0.45 * Math.random()), Math.max(0.7, 1.1 - rally * 0.01), true);
      }
      toServe();
      return;
    }
    if (Math.random() < Math.min(0.8, 0.3 + lv * 0.018)) tx = CX + (me.x < CX ? 1 : -1) * half * (0.55 + 0.4 * Math.random());   // away from you
    else tx = CX + (Math.random() - 0.5) * 2 * half * 0.65;
    var ty = netY + (ch / 2) * (0.45 + 0.42 * Math.random());
    send(tx, ty, Math.max(0.68, 1.16 - rally * 0.014 - lv * 0.006), true);
    bot_.tx = CX; bot_.ty = top + ch * 0.13;
  }

  function pointOver(mine, why) {
    var x = Math.max(70, Math.min(W - 70, ball.x)), y = Math.max(top + 40, Math.min(H - 60, ball.y) - 20);
    pts[mine ? 0 : 1]++;
    JP.score = pts[0];
    ball.dead = JP.clock;
    rally = 0;
    JP.say(why + (mine ? ': your point' : ': drone’s point'), x, y, false, mine ? '#d9ee3f' : undefined);
    var w = won();
    if (w) {
      over = true;
      var mineGame = w === 1, rec = record();
      rec[1]++; if (mineGame) rec[0]++;
      JP.store('jp.tennis.won', String(rec[0])); JP.store('jp.tennis.played', String(rec[1]));
      JP.say(mineGame ? 'Game, you' : 'Game, drone', CX, netY - ch * 0.2, true, mineGame ? '#ffd27a' : undefined);
      if (mineGame) JP.sound.great(); else JP.sound.bad();
      var line = pts[0] + '–' + pts[1];
      JP.finish({
        title: mineGame ? 'Game, you' : 'Game, drone', num: line, unit: 'points, you – drone',
        detail: (mineGame ? 'You broke the drone’s serve. ' : '') + 'Games won: ' + rec[0] + ' of ' + rec[1] + '.',
        good: mineGame, delay: 1300,
        share: mineGame ? 'I broke a drone’s serve at tennis, ' + line + ' in points. Your turn:' : 'A drone held serve against me at tennis. See if you can break it:'
      });
    } else {
      JP.say(spoken(), CX, netY - ch * 0.2, true);
      if (mine) JP.sound.good(); else JP.sound.bad();
      serveAt = JP.clock + 1.5;
      toServe();
    }
    goal(); JP.hud();
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
    var sp = botSpeed() * dt;
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
        if (ball.bounces === 1) { ball.lx = ball.x; ball.ly = ball.y; }
        marks.push({ x: ball.x, y: ball.y, t: clock });
        JP.sound.thud(0.5, 280);
        JP.puff(ball.x, ball.y, 3, 'rgba(255,255,255,.6)', 0.4);
      } else ball.vz = 0;
    }
    trail.push(ball.x, ball.y - ball.z * 0.55);
    if (trail.length > 22) trail.splice(0, 2);
    var face = netY - netH * 0.5;
    if (ball.net && !ball.dead && prevY < face && ball.y >= face) {          // into the net: it stops there
      ball.y = face - 1; ball.vy = -Math.abs(ball.vy) * 0.12; ball.vx *= 0.3; ball.vz = Math.min(0, ball.vz); ball.crossed = true;
      for (i = 0; i < netGlyphs.length; i++) netGlyphs[i].v += Math.max(0, 1 - Math.abs(netGlyphs[i].x - ball.x) / (cw * 0.15)) * 260;
      JP.sound.thud(0.8, 120);
      pointOver(true, 'Into the net');
      return;
    }
    if ((prevY - netY) * (ball.y - netY) <= 0 && !ball.crossed) {       // over the net: the nearest letters shiver
      ball.crossed = true;
      for (i = 0; i < netGlyphs.length; i++) {
        var near = Math.max(0, 1 - Math.abs(netGlyphs[i].x - ball.x) / (cw * 0.2));
        netGlyphs[i].v -= near * 150;
      }
    }
    if (ball.dead) return;

    if (ball.toMe) {
      if (ball.bounces === 1 && !ball.judged) {          // line call on the drone's shot
        ball.judged = true;
        if (ball.ly < netY) {
          for (i = 0; i < netGlyphs.length; i++) netGlyphs[i].v -= Math.max(0, 1 - Math.abs(netGlyphs[i].x - ball.lx) / (cw * 0.15)) * 260;
          JP.sound.thud(0.8, 120);
          pointOver(true, 'Into the net');
          return;
        }
        if (ball.lx < cx0 + si - br * 0.5 || ball.lx > cx1 - si + br * 0.5 || ball.ly > bot) { pointOver(true, 'Out'); return; }
      }
      var mx = ball.x - me.x, my = ball.y - ball.z * 0.3 - me.y;
      // a ball that's going out is left alone, so it lands out and the point is yours
      if (ball.y > netY + 6 && !(ball.out && ball.bounces === 0) && mx * mx + my * my < (R + br) * (R + br) && ball.z < 90 * S) myHit();
      else if (ball.bounces >= 2 || ball.y > H + 30 || ball.x < -30 || ball.x > W + 30) pointOver(false, 'Missed it');
    } else {
      var bx = ball.x - bot_.x, by = ball.y - bot_.y;
      // a shot the drone couldn't get to in time goes past it: a clean winner
      if (ball.bounces >= 1 && (bot_.stretch || 0) < 1.15 && bx * bx + by * by < (R * 1.05 + br) * (R * 1.05 + br)) botHit();
      else if (ball.bounces >= 2 || ball.y < -30 || ball.x < -30 || ball.x > W + 30) pointOver(true, 'Winner');
      else if (ball.bounces >= 1) {                       // past where the drone can reach
        var reach = 12 + R * 1.1 + br;
        if (ball.x < cx0 - reach || ball.x > cx1 + reach || ball.y < top - reach) pointOver(true, 'Winner');
      }
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
      ctx.strokeStyle = (ball.out ? 'rgba(255,150,110,' : 'rgba(251,246,234,') + (0.25 + 0.6 * (1 - left)).toFixed(3) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ball.tx, ball.ty, br * (1.3 + left * 3.2), 0, 6.2832); ctx.stroke();
      if (ball.out && left < 0.7) {
        ctx.font = '500 11px ' + JP.MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffb08a';
        ctx.fillText('OUT', ball.tx, ball.ty + br * 2.2);
      }
    }

    // drone and its racket
    var bsw = bot_.swing, bAng = Math.PI + (bsw > 0 ? Math.sin(bsw * Math.PI) * 1.5 * (bot_.x < CX ? 1 : -1) : 0.25);
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
      ctx.fillStyle = 'rgba(20,35,59,.85)'; ctx.fillRect(CX - tw, netY + ch * 0.12 - 12, tw * 2, 24);
      ctx.fillStyle = CHALK; ctx.fillText(label, CX, netY + ch * 0.12 + 1);
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
    lede: 'Try to break the drone’s serve over a net made of my name: move your racket to the ball.',
    call: call,
    stat: function () { var r = record(); return ['won', r[0] + '/' + r[1]]; },
    layout: layout, floor: floor, reset: reset, update: update, draw: draw,
    relayout: function () { if (!ball) { marks.length = 0; trail.length = 0; place(); } },
    down: down, move: function (p) { aimAt(p); }, up: function () {},
    key: function () { if (JP.state === 'idle') { JP.begin(); serveAt = JP.clock + 0.7; } },
    debug: function () {
      return { ball: ball && !ball.dead ? { x: ball.x, y: ball.y, toMe: ball.toMe, tx: ball.tx, ty: ball.ty, vx: ball.vx, vy: ball.vy, bounces: ball.bounces, out: ball.out, z: ball.z, lx: ball.lx, ly: ball.ly, singles: [cx0 + si, cx1 - si] } : null, rally: rally, R: R, pts: pts.slice(), call: call(), stretch: bot_.stretch };
    }
  });
})();
