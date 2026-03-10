// ================================================
// FireFly — script.js
// Deles av: index / menu / about / contact /
//           booking / thanks / minkonto
// ================================================

// ── 1) TEMA (lys / mørk) ─────────────────────────
(() => {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  const KEY = 'fireflyTheme'; // Én nøkkel brukt overalt

  function applyTheme(theme) {
    const isLight = theme === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : '');
    document.body.classList.toggle('lightMode', isLight);
    toggle.checked = isLight;
  }

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

  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mainNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

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
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.navigation a').forEach(link => {
    const href = (link.getAttribute('href') || '').split('#')[0];
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
(() => {
  const dateInput = document.getElementById('dateInput');
  if (!dateInput) return;
  dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
})();


// ── 7) MENY — SØK OG FILTER ─────────────────────
(() => {
  const searchInput = document.getElementById('menuSearch');
  const chips       = document.querySelectorAll('.chip[data-filter]');
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


// ── 9) LIVE BESTILLINGSBOBLE ─────────────────────
// Vises på alle sider. Handlekurven lagres i sessionStorage.
// På menysiden erstattes "Bestill mat"-lenker med "Legg til"-knapper.
(() => {
  // Ikke init boblen på booking.html (har egen innebygd kurv)
  if (document.querySelector('script[data-no-cart]')) return;

  const bubbleBtn  = document.getElementById('orderBubbleBtn');
  const panel      = document.getElementById('orderPanel');
  const badge      = document.getElementById('orderBadge');
  const listEl     = document.getElementById('orderList');
  const totalEl    = document.getElementById('orderTotal');
  const totalPrice = document.getElementById('orderTotalPrice');
  const clearBtn   = document.getElementById('orderClearBtn');
  const sendBtn    = document.getElementById('orderSendBtn');

  if (!bubbleBtn) return;

  const CART_KEY = 'fireflyCart'; // Samme nøkkel som booking.html

  // -- Lagring (bruker object {id: qty} format som booking.html) --
  function loadCart() {
    try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || {}; }
    catch { return {}; }
  }
  function saveCart(cart) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  const MENU_DATA = [
    { id:1, name:'Burger',       price:150 },
    { id:2, name:'Kyllingpizza', price:200 },
    { id:3, name:'Frisk salat',  price:119 },
    { id:4, name:'Kremet pasta', price:179 },
    { id:5, name:'Dagens suppe', price:99  },
    { id:6, name:'Dessert',      price:89  },
    { id:7, name:'Brus / Vann',  price:45  },
    { id:8, name:'Kaffe',        price:55  },
  ];

  function cartCount(cart) {
    return Object.values(cart).reduce((s, q) => s + q, 0);
  }
  function cartTotal(cart) {
    return Object.entries(cart).reduce((s, [id, q]) => {
      const it = MENU_DATA.find(m => m.id === +id);
      return s + (it ? it.price * q : 0);
    }, 0);
  }

  function renderOrder() {
    const cart  = loadCart();
    const count = cartCount(cart);
    const total = cartTotal(cart);

    // Badge
    badge.textContent    = count;
    badge.style.display  = count > 0 ? 'flex' : 'none';

    // Liste
    if (count === 0) {
      listEl.innerHTML      = '<p class="orderEmpty">Ingen retter lagt til ennå.<br/>Gå til menyen og trykk «Legg til».</p>';
      totalEl.style.display = 'none';
      sendBtn.style.display = 'none';
    } else {
      const entries = Object.entries(cart).filter(([,q]) => q > 0);
      listEl.innerHTML = entries.map(([id, qty]) => {
        const it = MENU_DATA.find(m => m.id === +id);
        if (!it) return '';
        return `<div class="orderItem">
          <span class="orderItemName">${it.name} × ${qty}</span>
          <span class="orderItemPrice">${it.price * qty} kr</span>
          <button class="orderItemRemove" data-id="${id}" aria-label="Fjern ${it.name}">✕</button>
        </div>`;
      }).join('');

      totalPrice.textContent = total + ' kr';
      totalEl.style.display  = 'flex';
      sendBtn.style.display  = 'block';

      listEl.querySelectorAll('.orderItemRemove').forEach(btn => {
        btn.addEventListener('click', () => {
          const cart2 = loadCart();
          delete cart2[btn.dataset.id];
          saveCart(cart2);
          renderOrder();
          syncMenuButtons();
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

  // -- Lukk panel ved klikk utenfor --
  document.addEventListener('click', (e) => {
    const bubble = document.getElementById('orderBubble');
    if (bubble && !bubble.contains(e.target) && panel.classList.contains('open')) {
      panel.classList.remove('open');
      bubbleBtn.classList.remove('open');
      bubbleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // -- Tøm alt --
  clearBtn?.addEventListener('click', () => {
    saveCart({});
    renderOrder();
    syncMenuButtons();
  });

  // -- Konverter menykortkort til "Legg til"-knapper (på menu.html) --
  function syncMenuButtons() {
    const cart = loadCart();
    document.querySelectorAll('#menuCards .card').forEach(card => {
      const actionDiv = card.querySelector('.cardActions');
      if (!actionDiv) return;

      const nameEl   = card.querySelector('h3');
      const priceEl  = card.querySelector('.price');
      const name     = nameEl  ? nameEl.textContent.trim()  : 'Rett';
      const priceStr = priceEl ? priceEl.textContent.trim() : '0 kr';
      const price    = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;

      // Finn menyen basert på navn
      const menuItem = MENU_DATA.find(m => m.name === name);
      const itemId   = menuItem ? menuItem.id : null;
      const qty      = itemId ? (cart[itemId] || 0) : 0;

      // Finn eksisterende knapp eller lenke
      let btn = actionDiv.querySelector('.addToCartBtn');

      if (!btn) {
        // Fjern den gamle "Bestill mat"-lenken
        const oldLink = actionDiv.querySelector('a.btn');
        if (oldLink) oldLink.remove();

        btn = document.createElement('button');
        btn.className = 'btn ghost btn-sm addToCartBtn';
        btn.type = 'button';
        actionDiv.appendChild(btn);

        btn.addEventListener('click', () => {
          if (!itemId) return;
          const cart2 = loadCart();
          cart2[itemId] = (cart2[itemId] || 0) + 1;
          saveCart(cart2);
          renderOrder();
          syncMenuButtons();

          // Bump-animasjon
          badge.classList.remove('bump');
          void badge.offsetWidth;
          badge.classList.add('bump');
          setTimeout(() => badge.classList.remove('bump'), 300);
        });
      }

      // Oppdater knapp-tekst basert på antall i kurv
      if (qty > 0) {
        btn.textContent  = `✓ ${qty} i kurv`;
        btn.style.color  = 'var(--gold)';
        btn.style.borderColor = 'var(--gold-dim)';
      } else {
        btn.textContent = '+ Legg til';
        btn.style.color = '';
        btn.style.borderColor = '';
      }
    });
  }

  // Initialiser
  renderOrder();
  syncMenuButtons();
})();