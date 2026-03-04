// ================================================
// FireFly — script.js
// Deles av: index / menu / about / contact /
//           booking / thanks
// ================================================

// ── 1) TEMA (lys / mørk) ─────────────────────────
// Støtter BEGGE metodene:
//   • data-theme="light" på <html>  (nye sider)
//   • body.lightMode                (gammel CSS-kompatibilitet)
(() => {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const KEY = 'fireflyTheme';

  function applyTheme(theme) {
    const isLight = theme === 'light';

    // Ny metode
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : '');

    // Gammel metode (bakoverkompatibel)
    document.body.classList.toggle('lightMode', isLight);

    toggle.checked = isLight;
  }

  // Last lagret tema (standard: mørk)
  applyTheme(localStorage.getItem(KEY) || 'dark');

  toggle.addEventListener('change', () => {
    const theme = toggle.checked ? 'light' : 'dark';
    localStorage.setItem(KEY, theme);
    applyTheme(theme);
  });
})();


// ── 2) HAMBURGER-MENY ────────────────────────────
(() => {
  const hamburger = document.getElementById('hamburger');
  const mainNav   = document.getElementById('mainNav');
  if (!hamburger || !mainNav) return;

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mainNav.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // Lukk meny når bruker klikker på en lenke
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mainNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // Lukk meny ved Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.classList.contains('open')) {
      hamburger.classList.remove('open');
      mainNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();


// ── 3) AKTIV NAV-LENKE ───────────────────────────
(() => {
  function getCurrentPage() {
    const p = location.pathname.split('/').pop();
    return (p && p.length) ? p : 'index.html';
  }

  const currentPage = getCurrentPage();

  document.querySelectorAll('.navigation a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('#')[0];

    // Ikke marker eksterne lenker
    if (/^https?:\/\//i.test(href)) return;

    const page = href === '' ? 'index.html' : href;
    const isActive = page === currentPage;

    link.classList.toggle('active', isActive);
    if (isActive) link.setAttribute('aria-current', 'page');
    else          link.removeAttribute('aria-current');
  });
})();


// ── 4) SCROLL REVEAL ─────────────────────────────
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
})();


// ── 5) SKJEMA — DEAKTIVER KNAPP VED INNSENDING ──
// Forhindrer dobbel-innsending og gir feedback
(() => {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      btn.disabled    = true;
      btn.textContent = 'Sender…';
      btn.style.opacity = '0.75';
    });
  });
})();


// ── 6) DATOFELT — IKKE TILLAT FORTIDEN ───────────
// Gjelder booking.html
(() => {
  const dateInput = document.getElementById('dateInput');
  if (!dateInput) return;

  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);
})();


// ── 7) MENY — SØK OG FILTER ─────────────────────
// Gjelder menu.html
(() => {
  const searchInput = document.getElementById('menuSearch');
  const chips       = document.querySelectorAll('.chip');
  const menuCards   = document.querySelectorAll('#menuCards .card');
  const emptyMsg    = document.getElementById('menuEmpty');
  const countMsg    = document.getElementById('menuCount');

  if (!searchInput || !menuCards.length) return;

  let activeFilter = 'all';

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    let visible = 0;

    menuCards.forEach(card => {
      const nameMatch = (card.dataset.name || '').toLowerCase().includes(q);
      const textMatch = card.textContent.toLowerCase().includes(q);
      const catMatch  = activeFilter === 'all' || card.dataset.cat === activeFilter;
      const show      = (nameMatch || textMatch) && catMatch;

      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (emptyMsg) emptyMsg.hidden = visible > 0;
    if (countMsg) {
      countMsg.textContent = visible > 0
        ? `Viser ${visible} av ${menuCards.length} retter`
        : '';
    }
  }

  chips.forEach(btn => {
    btn.addEventListener('click', () => {
      chips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  searchInput.addEventListener('input', applyFilters);
  applyFilters();
})();


// ── 8) TAKK-SIDE — AUTOMATISK NEDTELLING ─────────
// Gjelder thanks.html
(() => {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;

  let seconds = 10;
  const timer = setInterval(() => {
    seconds--;
    countdownEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(timer);
      window.location.href = 'index.html';
    }
  }, 1000);
})();


// ── 9) "LES MER"-KNAPP (om nødvendig) ────────────
(() => {
  const btn = document.getElementById('toggleAbout') ||
              document.getElementById('toggleBtn');
  const content = document.getElementById('moreContent');
  if (!btn || !content) return;

  btn.addEventListener('click', () => {
    const hidden = content.classList.toggle('hidden');
    btn.textContent = hidden ? 'Les mer' : 'Skjul';
    if (!hidden) content.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();


// ── 10) LIVE BESTILLINGSBOBLE ─────────────────────
// Vises på alle sider. Menyretter kan legges til.
// Bestillingen lagres i sessionStorage.
(() => {
  const bubbleBtn  = document.getElementById('orderBubbleBtn');
  const panel      = document.getElementById('orderPanel');
  const badge      = document.getElementById('orderBadge');
  const listEl     = document.getElementById('orderList');
  const totalEl    = document.getElementById('orderTotal');
  const totalPrice = document.getElementById('orderTotalPrice');
  const clearBtn   = document.getElementById('orderClearBtn');
  const sendBtn    = document.getElementById('orderSendBtn');

  if (!bubbleBtn) return;

  const KEY = 'fireflyOrder';

  // -- Hjelpefunksjoner --
  function loadOrder() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function saveOrder(order) {
    sessionStorage.setItem(KEY, JSON.stringify(order));
  }

  function renderOrder() {
    const order = loadOrder();
    const count = order.length;
    const total = order.reduce((sum, i) => sum + i.price, 0);

    // Badge
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }

    // List
    if (count === 0) {
      listEl.innerHTML = '<p class="orderEmpty">Ingen retter lagt til ennå.<br/>Gå til menyen og trykk «Legg til».</p>';
      totalEl.style.display  = 'none';
      sendBtn.style.display  = 'none';
    } else {
      listEl.innerHTML = order.map((item, idx) => `
        <div class="orderItem">
          <span class="orderItemName">${item.name}</span>
          <span class="orderItemPrice">${item.price} kr</span>
          <button class="orderItemRemove" data-idx="${idx}" aria-label="Fjern ${item.name}">✕</button>
        </div>
      `).join('');
      totalPrice.textContent = total + ' kr';
      totalEl.style.display  = 'flex';
      sendBtn.style.display  = 'block';

      // Remove buttons
      listEl.querySelectorAll('.orderItemRemove').forEach(btn => {
        btn.addEventListener('click', () => {
          const order2 = loadOrder();
          order2.splice(Number(btn.dataset.idx), 1);
          saveOrder(order2);
          renderOrder();
        });
      });
    }
  }

  // -- Toggle panel --
  bubbleBtn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    bubbleBtn.classList.toggle('open', open);
    bubbleBtn.setAttribute('aria-expanded', String(open));
    if (open) renderOrder();
  });

  // -- Clear all --
  clearBtn.addEventListener('click', () => {
    saveOrder([]);
    renderOrder();
  });

  // -- "Legg til"-knapper på menykortet --
  // Konverter alle "Bestill mat"-lenker på menysiden til "Legg til"-knapper
  document.querySelectorAll('#menuCards .card').forEach(card => {
    const actionDiv = card.querySelector('.cardActions');
    if (!actionDiv) return;

    const oldLink = actionDiv.querySelector('a.btn');
    if (!oldLink) return;

    const nameEl  = card.querySelector('h3');
    const priceEl = card.querySelector('.price');
    const name    = nameEl  ? nameEl.textContent.trim()  : 'Rett';
    const priceStr = priceEl ? priceEl.textContent.trim() : '0 kr';
    const price   = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

    const addBtn = document.createElement('button');
    addBtn.className = 'btn ghost btn-sm';
    addBtn.textContent = '+ Legg til';
    addBtn.type = 'button';

    addBtn.addEventListener('click', () => {
      const order = loadOrder();
      order.push({ name, price });
      saveOrder(order);
      renderOrder();

      // Bump animation
      badge.classList.remove('bump');
      void badge.offsetWidth; // reflow
      badge.classList.add('bump');
      setTimeout(() => badge.classList.remove('bump'), 300);

      // Knapp feedback
      addBtn.textContent = '✓ Lagt til';
      addBtn.disabled = true;
      setTimeout(() => {
        addBtn.textContent = '+ Legg til';
        addBtn.disabled = false;
      }, 1500);
    });

    oldLink.replaceWith(addBtn);
  });

  // Initial render (for badge on page load)
  renderOrder();
})();