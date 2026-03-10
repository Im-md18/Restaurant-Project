/* ============================================================
   FireFly Restaurant — food-animation.js
   Floating food emoji particles on hero canvas
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('foodCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const EMOJIS = ['🍔', '🍕', '🍝', '🥗', '🍲', '🍮', '☕', '🥤', '🍷', '🥩', '🍜', '🧆'];
  const PARTICLE_COUNT = 18;
  const particles = [];

  let W = 0, H = 0, raf = null;

  /* ── Resize ── */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || document.body);
  resize();

  /* ── Particle factory ── */
  function randomParticle(fromBottom) {
    const size = 14 + Math.random() * 22;
    return {
      emoji:   EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x:       Math.random() * W,
      y:       fromBottom ? H + size : Math.random() * H,
      size,
      speedY:  -(0.18 + Math.random() * 0.32),   // float upward
      speedX:  (Math.random() - 0.5) * 0.18,
      opacity: 0.04 + Math.random() * 0.10,
      wobble:  Math.random() * Math.PI * 2,
      wobbleSpeed: 0.008 + Math.random() * 0.012,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.008,
    };
  }

  /* ── Init pool ── */
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(randomParticle(false));
  }

  /* ── Draw loop ── */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.wobble   += p.wobbleSpeed;
      p.x        += p.speedX + Math.sin(p.wobble) * 0.25;
      p.y        += p.speedY;
      p.rotation += p.rotSpeed;

      // Recycle when off-screen
      if (p.y < -p.size * 2) {
        particles[i] = randomParticle(true);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  /* ── Visibility API: pause when tab hidden ── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      raf = requestAnimationFrame(draw);
    }
  });

  draw();
})();