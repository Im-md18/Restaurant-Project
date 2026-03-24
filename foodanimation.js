/* ============================================================
   FireFly Restaurant — foodanimation.js  v4.0
   · Full-screen canvas on hero sections
   · Three depth layers with parallax
   · Ember spark trails
   · HOVER: cursor proximity makes nearby emojis scatter away
     with spring return — fluid, organic, realistic
   · CLICK/DRAG: grab an emoji, throw it with velocity
   · Wall bounce with ember burst on impact
   · Touch support
============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('foodCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Resize ───────────────────────────────────────────────── */
  let W = 0, H = 0;
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  new ResizeObserver(resize).observe(canvas.parentElement || document.body);
  resize();

  /* ── Config ───────────────────────────────────────────────── */
  const EMOJIS = ['🍔','🍕','🍝','🥗','🍲','🍮','☕','🥤','🍷','🥩','🍜','🧆','🍱','🥘','🫕'];
  const EMBER_COLORS = ['232,184,109','255,107,53','255,200,120','255,160,60'];

  const LAYERS = [
    { count:6,  sMin:13, sMax:20, spMin:0.09, spMax:0.14, opMin:0.05, opMax:0.09, wob:0.22 },
    { count:8,  sMin:20, sMax:30, spMin:0.14, spMax:0.22, opMin:0.09, opMax:0.16, wob:0.32 },
    { count:5,  sMin:30, sMax:44, spMin:0.20, spMax:0.32, opMin:0.11, opMax:0.20, wob:0.42 },
  ];

  /* Physics */
  const HOVER_RADIUS  = 130;   // how far the cursor repels
  const HOVER_FORCE   = 4.2;   // repel push strength
  const GRAB_RADIUS   = 52;    // click-to-grab distance
  const DRAG          = 0.989; // air resistance
  const SPRING        = 0.030; // return-to-float spring
  const BOUNCE        = 0.44;  // wall energy retention
  const THROW_SCALE   = 0.82;  // mouse-velocity → throw

  /* ── State ────────────────────────────────────────────────── */
  const particles = [];
  const embers    = [];
  let   raf       = null;
  let   grabbed   = null;

  const mouse = { x:-9999, y:-9999, px:-9999, py:-9999, vx:0, vy:0, down:false };

  /* ── Helpers ──────────────────────────────────────────────── */
  const rand    = (a,b) => a + Math.random()*(b-a);
  const randInt = n     => Math.floor(Math.random()*n);

  /* ── Particle factory ─────────────────────────────────────── */
  function makeParticle(layer, fromBottom) {
    const size = rand(layer.sMin, layer.sMax);
    const fvx  = (Math.random()-0.5)*0.09;
    const fvy  = -rand(layer.spMin, layer.spMax);
    return {
      emoji:      EMOJIS[randInt(EMOJIS.length)],
      layer,
      x:          Math.random()*W,
      y:          fromBottom ? H+size*2 : Math.random()*H,
      vx: fvx, vy: fvy,
      fvx, fvy,                    // float target velocity
      size,
      opacity:    rand(layer.opMin, layer.opMax),
      rotation:   Math.random()*Math.PI*2,
      rotSpeed:   (Math.random()-0.5)*0.005,
      wobAmp:     rand(0.12, layer.wob),
      wobFreq:    rand(0.005,0.013),
      wob:        Math.random()*Math.PI*2,
      glowR:      size*rand(1.7,2.7),
      glowAlpha:  rand(0.06,0.17),
      glowWarm:   Math.random()>0.42,
      grabbed:    false,
      thrown:     false,
      throwDecay: 0,
      trail:      [],
      trailLen:   Math.floor(rand(5,12)),
      /* hover state */
      hoverScale: 1.0,            // scale up slightly when cursor is near
    };
  }

  /* ── Ember factory ────────────────────────────────────────── */
  function makeEmber(fromBottom) {
    return {
      x:    Math.random()*W,
      y:    fromBottom ? H+4 : Math.random()*H,
      r:    rand(1.0,3.2),
      vx:   (Math.random()-0.5)*0.28,
      vy:  -rand(0.20,0.65),
      op:   rand(0.18,0.62),
      life: 1.0,
      decay:rand(0.0013,0.0038),
      col:  EMBER_COLORS[randInt(EMBER_COLORS.length)],
    };
  }

  /* ── Init ─────────────────────────────────────────────────── */
  LAYERS.forEach(l => {
    for (let i=0;i<l.count;i++) particles.push(makeParticle(l,false));
  });
  for (let i=0;i<30;i++) embers.push(makeEmber(false));

  /* ── Mouse events ─────────────────────────────────────────── */
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX-r.left, y: s.clientY-r.top };
  }

  canvas.addEventListener('mousemove', e => {
    const p = pos(e);
    mouse.vx = p.x-mouse.px; mouse.vy = p.y-mouse.py;
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = p.x; mouse.y = p.y;
    if (grabbed) { grabbed.x = p.x; grabbed.y = p.y; }
  });

  canvas.addEventListener('mousedown', e => {
    mouse.down = true;
    const p = pos(e); mouse.x=p.x; mouse.y=p.y;
    let best=null, bestD=Infinity;
    particles.forEach(pt => {
      const dx=pt.x-p.x, dy=pt.y-p.y, d=Math.hypot(dx,dy);
      if (d < GRAB_RADIUS+pt.size*0.5 && d<bestD) { bestD=d; best=pt; }
    });
    if (best) {
      grabbed=best; best.grabbed=true; best.thrown=false;
      best.vx=0; best.vy=0; best.trail=[];
      canvas.style.cursor='grabbing';
    }
  });

  canvas.addEventListener('mouseup', () => {
    mouse.down=false;
    if (grabbed) {
      grabbed.vx = mouse.vx*THROW_SCALE;
      grabbed.vy = mouse.vy*THROW_SCALE;
      const sp = Math.hypot(mouse.vx,mouse.vy);
      grabbed.rotSpeed = (Math.random()>0.5?1:-1)*Math.min(sp*0.019,0.24);
      grabbed.thrown=true; grabbed.throwDecay=1.0;
      grabbed.grabbed=false; grabbed=null;
      canvas.style.cursor='';
    }
  });

  // Hover cursor
  canvas.addEventListener('mousemove', () => {
    if (grabbed) return;
    const near = particles.some(p => {
      const dx=p.x-mouse.x, dy=p.y-mouse.y;
      return Math.hypot(dx,dy) < GRAB_RADIUS+p.size*0.5;
    });
    canvas.style.cursor = near ? 'grab' : '';
  });

  // Touch
  canvas.addEventListener('touchstart',  e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousedown',{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY})); },{passive:false});
  canvas.addEventListener('touchmove',   e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mousemove', {clientX:e.touches[0].clientX,clientY:e.touches[0].clientY})); },{passive:false});
  canvas.addEventListener('touchend',    e => { e.preventDefault(); canvas.dispatchEvent(new MouseEvent('mouseup')); },{passive:false});

  /* ── Glow ─────────────────────────────────────────────────── */
  function glow(x,y,r,rgb,a) {
    const g = ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,   `rgba(${rgb},${(a*0.60).toFixed(3)})`);
    g.addColorStop(0.4, `rgba(${rgb},${(a*0.20).toFixed(3)})`);
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  /* ── Burst embers ─────────────────────────────────────────── */
  function burst(x,y,n) {
    for (let i=0;i<n;i++) {
      const e=makeEmber(false);
      e.x=x+(Math.random()-0.5)*10; e.y=y+(Math.random()-0.5)*10;
      e.vx=(Math.random()-0.5)*2.8; e.vy=-rand(0.6,2.2);
      e.r=rand(1.5,4.2); e.op=rand(0.45,0.92);
      embers.push(e);
    }
    while(embers.length>90) embers.shift();
  }

  /* ── Draw trail ───────────────────────────────────────────── */
  function drawTrail(p) {
    if (p.trail.length<2 || (!p.thrown && !p.grabbed)) return;
    const rgb = p.glowWarm ? '232,184,109' : '255,107,53';
    ctx.save();
    for (let i=1;i<p.trail.length;i++) {
      const t=i/p.trail.length;
      const r0=p.trail[i-1], r1=p.trail[i];
      ctx.beginPath();
      ctx.moveTo(r0.x,r0.y); ctx.lineTo(r1.x,r1.y);
      ctx.strokeStyle=`rgba(${rgb},${(t*p.opacity*0.75).toFixed(3)})`;
      ctx.lineWidth=t*p.size*0.6; ctx.lineCap='round'; ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Physics update ───────────────────────────────────────── */
  function update(p) {
    if (p.grabbed) return;

    // Trail
    p.trail.push({x:p.x,y:p.y});
    if (p.trail.length>p.trailLen) p.trail.shift();

    // ── HOVER REPULSION ──
    // Every frame, check mouse proximity and push away
    const dx = p.x-mouse.x, dy = p.y-mouse.y;
    const dist = Math.hypot(dx,dy);

    if (!grabbed && dist < HOVER_RADIUS && dist > 0.5) {
      // Smooth ease: quadratic falloff so particles near center get pushed harder
      const strength = (1 - dist/HOVER_RADIUS) ** 2 * HOVER_FORCE;
      p.vx += (dx/dist) * strength;
      p.vy += (dy/dist) * strength;
      // Add a little spin for realism
      p.rotSpeed += (Math.random()-0.5) * 0.025;
      // Scale up slightly when close
      const targetScale = 1 + (1-dist/HOVER_RADIUS)*0.35;
      p.hoverScale += (targetScale - p.hoverScale) * 0.12;
    } else {
      // Spring hoverScale back to 1
      p.hoverScale += (1.0 - p.hoverScale) * 0.08;
    }

    // ── THROWN STATE ──
    if (p.thrown) {
      p.throwDecay = Math.max(0, p.throwDecay-0.007);
      if (p.throwDecay<=0) {
        // Return to float
        p.thrown=false; p.vx=p.fvx; p.vy=p.fvy;
        p.rotSpeed=(Math.random()-0.5)*0.005;
      } else {
        p.vy += 0.013; // gravity while thrown
      }
    } else {
      // Spring back toward float velocity
      p.vx += (p.fvx + Math.sin(p.wob)*p.wobAmp - p.vx) * SPRING;
      p.vy += (p.fvy - p.vy) * SPRING;
    }

    // Drag & integrate
    p.vx *= DRAG; p.vy *= DRAG;
    p.wob += p.wobFreq;
    p.x   += p.vx; p.y += p.vy;
    p.rotation += p.rotSpeed;
    p.rotSpeed  *= 0.984;

    // Wall bounce (only when thrown)
    if (p.thrown) {
      if (p.x<p.size)   { p.x=p.size;   p.vx= Math.abs(p.vx)*BOUNCE; burst(p.x,p.y,4); }
      if (p.x>W-p.size) { p.x=W-p.size; p.vx=-Math.abs(p.vx)*BOUNCE; burst(p.x,p.y,4); }
      if (p.y<p.size)   { p.y=p.size;   p.vy= Math.abs(p.vy)*BOUNCE; burst(p.x,p.y,4); }
      if (p.y>H-p.size) { p.y=H-p.size; p.vy=-Math.abs(p.vy)*BOUNCE; burst(p.x,p.y,4); }
    }

    // Recycle when floated off top
    if (!p.thrown && p.y < -p.size*3) {
      const n = makeParticle(p.layer, true);
      Object.assign(p, n);
    }
  }

  /* ── Main draw loop ───────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0,0,W,H);

    // Embers
    for (let i=embers.length-1;i>=0;i--) {
      const e=embers[i];
      e.x+=e.vx; e.y+=e.vy; e.life-=e.decay;
      if (e.life<=0||e.y<-8) { embers.splice(i,1); embers.push(makeEmber(true)); continue; }
      const a=e.life*e.op;
      glow(e.x,e.y,e.r*7,e.col,a*0.5);
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${e.col},${Math.min(a,1).toFixed(3)})`; ctx.fill();
    }

    // Particles
    particles.forEach(p => {
      update(p);
      drawTrail(p);

      const isActive = p.grabbed || p.thrown;
      const glowMult  = isActive ? 2.4 : 1.0;
      const alphaMult = isActive ? 2.0 : 1.0;
      const rgb = p.glowWarm ? '232,184,109' : '255,107,53';

      // Bigger glow when hovered
      const hoverGlowMult = p.hoverScale > 1.05 ? p.hoverScale * 1.3 : 1.0;

      glow(p.x, p.y, p.glowR * glowMult * hoverGlowMult, rgb, p.glowAlpha * alphaMult * hoverGlowMult);

      ctx.save();
      ctx.globalAlpha = Math.min(p.opacity*(p.grabbed?1.45:1.0), 1);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Scale: combine hover scale + grabbed boost
      const scale = p.hoverScale * (p.grabbed ? 1.18 : 1.0);
      ctx.scale(scale, scale);

      if (p.grabbed) {
        ctx.shadowColor  = `rgba(${rgb},0.65)`;
        ctx.shadowBlur   = 30;
        ctx.shadowOffsetY = 8;
      } else if (p.hoverScale > 1.04) {
        // Subtle glow shadow on hover
        ctx.shadowColor = `rgba(${rgb},0.35)`;
        ctx.shadowBlur  = 16;
      }

      ctx.font=`${p.size}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(p.emoji,0,0);
      ctx.restore();
    });

    raf = requestAnimationFrame(draw);
  }

  // Visibility API
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf=null; }
    else if (!raf) { raf=requestAnimationFrame(draw); }
  });

  draw();
})();