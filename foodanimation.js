/* ============================================================
   FireFly Restaurant — foodanimation.js  v3.0
   Physics-based interactive particle system:
   · Mouse/touch repulsion with spring return
   · Grab & throw with velocity inheritance
   · Realistic gravity, drag, bounce off walls
   · Per-particle spin on throw
   · Glow trails and ember sparks
   · Three depth layers for parallax
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('foodCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Canvas sizing ───────────────────────────────────────── */
  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  new ResizeObserver(resize).observe(canvas.parentElement || document.body);
  resize();

  /* ── Constants ───────────────────────────────────────────── */
  const EMOJIS = ['🍔','🍕','🍝','🥗','🍲','🍮','☕','🥤','🍷','🥩','🍜','🧆','🍱','🥘','🫕'];
  const EMBER_COLORS = ['232,184,109','255,107,53','255,200,120','255,160,60'];

  const GRAVITY       = 0.012;   // gentle float gravity (upward float overrides per particle)
  const DRAG          = 0.988;   // air resistance
  const BOUNCE        = 0.45;    // wall bounce energy retention
  const REPEL_RADIUS  = 110;     // mouse hover repel distance
  const REPEL_FORCE   = 3.8;     // repel push strength
  const GRAB_RADIUS   = 48;      // click-grab distance
  const SPRING_K      = 0.032;   // spring return to float path
  const THROW_SCALE   = 0.78;    // mouse velocity → throw velocity

  /* ── Layers ──────────────────────────────────────────────── */
  const LAYERS = [
    { count:6,  sizeMin:14, sizeMax:20, floatSpeed:0.10, opMin:0.06, opMax:0.10, wobble:0.22 },
    { count:8,  sizeMin:20, sizeMax:30, floatSpeed:0.17, opMin:0.10, opMax:0.16, wobble:0.32 },
    { count:5,  sizeMin:30, sizeMax:44, floatSpeed:0.25, opMin:0.12, opMax:0.20, wobble:0.42 },
  ];

  /* ── State ───────────────────────────────────────────────── */
  const particles = [];
  const embers    = [];
  let   raf       = null;

  /* Mouse tracking */
  const mouse = { x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, down: false };
  let grabbed = null; // currently grabbed particle

  /* ── Helpers ─────────────────────────────────────────────── */
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = n    => Math.floor(Math.random() * n);

  /* ── Particle factory ────────────────────────────────────── */
  function makeParticle(layer, fromBottom) {
    const size = rand(layer.sizeMin, layer.sizeMax);
    const p = {
      emoji:       EMOJIS[randInt(EMOJIS.length)],
      layerRef:    layer,
      /* position */
      x:           Math.random() * W,
      y:           fromBottom ? H + size * 2 : Math.random() * H,
      /* velocity */
      vx:          (Math.random() - 0.5) * 0.10,
      vy:          -rand(layer.floatSpeed * 0.8, layer.floatSpeed * 1.2),
      /* float path (original drift) */
      floatVy:    -rand(layer.floatSpeed * 0.8, layer.floatSpeed * 1.2),
      floatVx:    (Math.random() - 0.5) * 0.08,
      /* appearance */
      size,
      opacity:     rand(layer.opMin, layer.opMax),
      rotation:    Math.random() * Math.PI * 2,
      rotSpeed:    (Math.random() - 0.5) * 0.005,
      /* wobble */
      wobbleAmp:   rand(0.12, layer.wobble),
      wobbleFreq:  rand(0.005, 0.013),
      wobble:      Math.random() * Math.PI * 2,
      /* glow */
      glowR:       size * rand(1.6, 2.6),
      glowAlpha:   rand(0.06, 0.16),
      glowWarm:    Math.random() > 0.45,
      /* physics state */
      grabbed:     false,
      thrown:      false,
      throwDecay:  0,
      /* trail */
      trail:       [],
      trailMaxLen: Math.floor(rand(4, 10)),
    };
    return p;
  }

  /* ── Ember factory ───────────────────────────────────────── */
  function makeEmber(fromBottom) {
    return {
      x:     Math.random() * W,
      y:     fromBottom ? H + 4 : Math.random() * H,
      r:     rand(1.0, 3.0),
      vx:    (Math.random() - 0.5) * 0.28,
      vy:   -rand(0.20, 0.62),
      op:    rand(0.18, 0.60),
      life:  1.0,
      decay: rand(0.0014, 0.0038),
      col:   EMBER_COLORS[randInt(EMBER_COLORS.length)],
    };
  }

  /* ── Init ────────────────────────────────────────────────── */
  LAYERS.forEach(l => {
    for (let i = 0; i < l.count; i++) particles.push(makeParticle(l, false));
  });
  for (let i = 0; i < 30; i++) embers.push(makeEmber(false));

  /* ── Mouse / Touch events ────────────────────────────────── */
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  canvas.addEventListener('mousemove', e => {
    const pos = getPos(e);
    mouse.vx = pos.x - mouse.px;
    mouse.vy = pos.y - mouse.py;
    mouse.px = mouse.x;
    mouse.py = mouse.y;
    mouse.x  = pos.x;
    mouse.y  = pos.y;

    if (grabbed) {
      grabbed.x = pos.x;
      grabbed.y = pos.y;
    }
  });

  canvas.addEventListener('mousedown', e => {
    const pos = getPos(e);
    mouse.x = pos.x; mouse.y = pos.y;
    mouse.down = true;

    // Find closest particle within grab radius
    let best = null, bestDist = Infinity;
    particles.forEach(p => {
      const dx = p.x - pos.x, dy = p.y - pos.y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < GRAB_RADIUS + p.size * 0.5 && d < bestDist) {
        bestDist = d; best = p;
      }
    });
    if (best) {
      grabbed = best;
      grabbed.grabbed = true;
      grabbed.thrown  = false;
      grabbed.vx = 0; grabbed.vy = 0;
      grabbed.trail = [];
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mouseup', e => {
    mouse.down = false;
    if (grabbed) {
      // Throw with mouse velocity
      grabbed.vx = mouse.vx * THROW_SCALE;
      grabbed.vy = mouse.vy * THROW_SCALE;
      // Extra spin on throw
      const speed = Math.sqrt(mouse.vx**2 + mouse.vy**2);
      grabbed.rotSpeed = (Math.random() > 0.5 ? 1 : -1) * Math.min(speed * 0.018, 0.22);
      grabbed.thrown   = true;
      grabbed.throwDecay = 1.0;
      grabbed.grabbed  = false;
      grabbed = null;
      canvas.style.cursor = '';
    }
  });

  // Touch support
  canvas.addEventListener('touchstart',  e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
  canvas.addEventListener('touchmove',   e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })); }, { passive: false });
  canvas.addEventListener('touchend',    e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mouseup')); }, { passive: false });

  // Cursor change on hover near particles
  canvas.addEventListener('mousemove', e => {
    if (grabbed) return;
    const pos = getPos(e);
    const near = particles.some(p => {
      const dx = p.x - pos.x, dy = p.y - pos.y;
      return Math.sqrt(dx*dx + dy*dy) < GRAB_RADIUS + p.size * 0.5;
    });
    canvas.style.cursor = near ? 'grab' : '';
  });

  /* ── Glow helper ─────────────────────────────────────────── */
  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   `rgba(${rgb},${(a * 0.6).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(${rgb},${(a * 0.2).toFixed(3)})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Physics update ──────────────────────────────────────── */
  function updateParticle(p) {
    if (p.grabbed) return; // mouse controls position

    /* Trail */
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > p.trailMaxLen) p.trail.shift();

    /* Mouse repulsion (hover, not grabbing) */
    if (!grabbed) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < REPEL_RADIUS && dist > 1) {
        const force = (1 - dist / REPEL_RADIUS) ** 2 * REPEL_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
        // Spin when repelled
        p.rotSpeed += (Math.random() - 0.5) * 0.02;
      }
    }

    /* Throw decay — spring back to float */
    if (p.thrown) {
      p.throwDecay = Math.max(0, p.throwDecay - 0.008);
      if (p.throwDecay <= 0) {
        p.thrown = false;
        p.vx = p.floatVx;
        p.vy = p.floatVy;
        p.rotSpeed = (Math.random() - 0.5) * 0.005;
      } else {
        // Gravity pulls while thrown
        p.vy += GRAVITY;
      }
    } else if (!p.grabbed) {
      /* Normal float: spring toward float velocity */
      p.vx += (p.floatVx + Math.sin(p.wobble) * p.wobbleAmp - p.vx) * SPRING_K;
      p.vy += (p.floatVy - p.vy) * SPRING_K;
    }

    /* Drag */
    p.vx *= DRAG;
    p.vy *= DRAG;

    /* Integrate */
    p.wobble   += p.wobbleFreq;
    p.x        += p.vx;
    p.y        += p.vy;
    p.rotation += p.rotSpeed;

    /* Slow rotSpeed back to calm */
    p.rotSpeed *= 0.985;

    /* Wall bounce (only when thrown) */
    if (p.thrown) {
      if (p.x < p.size) { p.x = p.size; p.vx = Math.abs(p.vx) * BOUNCE; spawnBurstEmbers(p.x, p.y, 4); }
      if (p.x > W - p.size) { p.x = W - p.size; p.vx = -Math.abs(p.vx) * BOUNCE; spawnBurstEmbers(p.x, p.y, 4); }
      if (p.y < p.size) { p.y = p.size; p.vy = Math.abs(p.vy) * BOUNCE; spawnBurstEmbers(p.x, p.y, 4); }
      if (p.y > H - p.size) { p.y = H - p.size; p.vy = -Math.abs(p.vy) * BOUNCE; spawnBurstEmbers(p.x, p.y, 4); }
    }

    /* Recycle particles that float off top */
    if (!p.thrown && p.y < -p.size * 3) {
      const next = makeParticle(p.layerRef, true);
      Object.assign(p, next);
    }
  }

  /* ── Burst embers on wall hit ────────────────────────────── */
  function spawnBurstEmbers(x, y, count) {
    for (let i = 0; i < count; i++) {
      const e = makeEmber(false);
      e.x  = x + (Math.random() - 0.5) * 10;
      e.y  = y + (Math.random() - 0.5) * 10;
      e.vx = (Math.random() - 0.5) * 2.5;
      e.vy = -rand(0.5, 2.0);
      e.r  = rand(1.5, 4.0);
      e.op = rand(0.4, 0.9);
      embers.push(e);
    }
    // Keep ember array from growing unbounded
    while (embers.length > 80) embers.shift();
  }

  /* ── Draw trail ──────────────────────────────────────────── */
  function drawTrail(p) {
    if (p.trail.length < 2 || (!p.thrown && !p.grabbed)) return;
    const rgb = p.glowWarm ? '232,184,109' : '255,107,53';
    ctx.save();
    for (let i = 1; i < p.trail.length; i++) {
      const t   = i / p.trail.length;
      const r0  = p.trail[i-1], r1 = p.trail[i];
      const lw  = t * p.size * 0.55;
      const a   = t * p.opacity * 0.7;
      ctx.beginPath();
      ctx.moveTo(r0.x, r0.y);
      ctx.lineTo(r1.x, r1.y);
      ctx.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Main draw ───────────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    /* — Embers — */
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.x += e.vx; e.y += e.vy; e.life -= e.decay;
      if (e.life <= 0 || e.y < -8) { embers.splice(i, 1); embers.push(makeEmber(true)); continue; }
      const a = e.life * e.op;
      glow(e.x, e.y, e.r * 7, e.col, a * 0.5);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${e.col},${Math.min(a, 1).toFixed(3)})`;
      ctx.fill();
    }

    /* — Food particles — */
    particles.forEach(p => {
      updateParticle(p);

      // Trail
      drawTrail(p);

      // Extra glow when grabbed/thrown
      const glowBoost = (p.grabbed || p.thrown) ? 2.2 : 1.0;
      const alphaBoost = (p.grabbed || p.thrown) ? 2.0 : 1.0;
      const rgb = p.glowWarm ? '232,184,109' : '255,107,53';
      glow(p.x, p.y, p.glowR * glowBoost, rgb, p.glowAlpha * alphaBoost);

      // Emoji
      ctx.save();
      ctx.globalAlpha = Math.min(p.opacity * (p.grabbed ? 1.4 : 1.0), 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Shadow/depth when grabbed
      if (p.grabbed) {
        ctx.shadowColor  = `rgba(${rgb},0.6)`;
        ctx.shadowBlur   = 28;
        ctx.shadowOffsetY = 8;
      }

      ctx.font = `${p.size * (p.grabbed ? 1.18 : 1)}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    });

    raf = requestAnimationFrame(draw);
  }

  /* ── Visibility API ──────────────────────────────────────── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
    else if (!raf) { raf = requestAnimationFrame(draw); }
  });

  draw();
})();