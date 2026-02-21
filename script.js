// ===== Active link (multi-page) =====
const navLinks = document.querySelectorAll(".navigation a");
const currentPage = location.pathname.split("/").pop() || "index.html";

navLinks.forEach(link => {
  const href = link.getAttribute("href");
  if (href === currentPage) {
    link.classList.add("active");
  } else {
    link.classList.remove("active");
  }
});

// ===== Booking modal (works only if modal exists) =====
const openBooking = document.getElementById("openBooking");
const closeBooking = document.getElementById("closeBooking");
const bookingModal = document.getElementById("bookingModal");
const bookingForm = document.getElementById("bookingForm");
const bookingMsg = document.getElementById("bookingMsg");

function openModal(){
  if (!bookingModal) return;
  bookingModal.classList.add("open");
  bookingModal.setAttribute("aria-hidden", "false");
}

function closeModal(){
  if (!bookingModal) return;
  bookingModal.classList.remove("open");
  bookingModal.setAttribute("aria-hidden", "true");
  if (bookingMsg) bookingMsg.textContent = "";
}

openBooking?.addEventListener("click", openModal);
closeBooking?.addEventListener("click", closeModal);

bookingModal?.addEventListener("click", (e) => {
  if (e.target === bookingModal) closeModal();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && bookingModal?.classList.contains("open")) closeModal();
});

bookingForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (bookingMsg) bookingMsg.textContent = "Takk! Bestillingen din er mottatt ✅";
  bookingForm.reset();
});