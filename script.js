// ===============================
// FireFly - script.js (Final)
// ===============================
function getCurrentPageName() {
  const p = location.pathname.split("/").pop();
  return (p && p.length) ? p : "index.html";
}

function normalizeHref(href) {
  if (!href) return "";
  // remove trailing slash
  let h = href.trim();

  // ignore external links
  if (/^https?:\/\//i.test(h)) return h;

  // convert empty/ #... to index.html
  if (h === "" || h.startsWith("#")) return "index.html";

  // remove hash part for page compare
  return h.split("#")[0];
}

// ===============================
// 1) Active navigation link (multi-page + anchors)
// ===============================
(() => {
  const navLinks = document.querySelectorAll(".navigation a");
  const currentPage = getCurrentPageName();

  navLinks.forEach(link => {
    const href = link.getAttribute("href") || "";
    const normalized = normalizeHref(href);

    // mark active if same page
    const isActive = (!/^https?:\/\//i.test(normalized)) && (normalized === currentPage);
    link.classList.toggle("active", isActive);
  });
})();

// ===============================
// 2) "Les mer" toggle (supports both ids)
// - Works if button exists and #moreContent exists
// ===============================
(() => {
  const btn =
    document.getElementById("toggleAbout") ||   // if you used this id
    document.getElementById("toggleBtn");       // your current id

  const content = document.getElementById("moreContent");

  if (!btn || !content) return;

  btn.addEventListener("click", () => {
    content.classList.toggle("hidden");

    const isHidden = content.classList.contains("hidden");
    btn.textContent = isHidden ? "Les mer" : "Skjul";

    // optional: scroll nicely to the content when opened
    if (!isHidden) {
      content.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
})();

(() => {
  const openBooking = document.getElementById("openBooking");
  const closeBooking = document.getElementById("closeBooking");
  const bookingModal = document.getElementById("bookingModal");
  const bookingForm = document.getElementById("bookingForm");
  const bookingMsg = document.getElementById("bookingMsg");

  if (!bookingModal) return; // modal not on this page

  function openModal() {
    bookingModal.classList.add("open");
    bookingModal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    bookingModal.classList.remove("open");
    bookingModal.setAttribute("aria-hidden", "true");
    if (bookingMsg) bookingMsg.textContent = "";
  }

  openBooking?.addEventListener("click", openModal);
  closeBooking?.addEventListener("click", closeModal);

  bookingModal.addEventListener("click", (e) => {
    if (e.target === bookingModal) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bookingModal.classList.contains("open")) closeModal();
  });

  // Prevent submit if no real action (e.g. Formspree) and show thank you message
  bookingForm?.addEventListener("submit", (e) => {
    const action = bookingForm.getAttribute("action");
    const isRealSubmit = action && action.trim().length > 0;

    if (!isRealSubmit) {
      e.preventDefault();
      if (bookingMsg) bookingMsg.textContent = "Takk! Bestillingen din er mottatt ✅";
      bookingForm.reset();
    }
  });
})();

// ===============================
// 4) Small UX: disable submit button while submitting (Formspree friendly)
// - Works for any form with a submit button having class .btn.primary
// ===============================
(() => {
  const forms = document.querySelectorAll("form");
  forms.forEach(form => {
    form.addEventListener("submit", () => {
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return;
      btn.disabled = true;
      btn.style.opacity = "0.75";
      btn.textContent = "Sender...";
    });
  });
})();

(() => {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const KEY = "fireflyTheme"; // "dark" | "light"

  function apply(theme) {
    document.body.classList.toggle("lightMode", theme === "light");
    toggle.checked = theme === "light";
  }

  // init from saved
  const saved = localStorage.getItem(KEY);
  apply(saved || "dark");

  toggle.addEventListener("change", () => {
    const theme = toggle.checked ? "light" : "dark";
    localStorage.setItem(KEY, theme);
    apply(theme);
  });
})();


