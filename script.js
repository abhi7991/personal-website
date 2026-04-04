(() => {
  "use strict";

  // ── Navbar scroll effect ──────────────────────────────────
  const navbar = document.getElementById("navbar");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  });

  // ── Mobile menu toggle ────────────────────────────────────
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  navToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });

  // ── Active nav link on scroll ─────────────────────────────
  const sections = document.querySelectorAll("section[id]");

  function highlightNav() {
    const scrollY = window.scrollY + 120;

    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");
      const link = navLinks.querySelector(`a[href="#${id}"]`);

      if (link) {
        link.classList.toggle("active", scrollY >= top && scrollY < top + height);
      }
    });
  }

  window.addEventListener("scroll", highlightNav);
  highlightNav();

  // ── Fade-in on scroll (Intersection Observer) ─────────────
  const fadeEls = document.querySelectorAll(".fade-in");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  fadeEls.forEach((el) => observer.observe(el));

  // ── Timeline "View more" toggle ───────────────────────────
  const piToggle = document.getElementById("pi-toggle");
  const piDetails = document.getElementById("pi-details");

  if (piToggle && piDetails) {
    piToggle.addEventListener("click", () => {
      const isOpen = !piDetails.hidden;
      piDetails.hidden = isOpen;
      piToggle.setAttribute("aria-expanded", !isOpen);
      piToggle.textContent = isOpen ? "View more" : "View less";
    });
  }

  const adqvestToggle = document.getElementById("adqvest-toggle");
  const adqvestDetails = document.getElementById("adqvest-details");
  if (adqvestToggle && adqvestDetails) {
    adqvestToggle.addEventListener("click", () => {
      const isOpen = !adqvestDetails.hidden;
      adqvestDetails.hidden = isOpen;
      adqvestToggle.setAttribute("aria-expanded", !isOpen);
      adqvestToggle.textContent = isOpen ? "View more" : "View less";
    });
  }

  const neuToggle = document.getElementById("neu-toggle");
  const neuDetails = document.getElementById("neu-details");
  if (neuToggle && neuDetails) {
    neuToggle.addEventListener("click", () => {
      const isOpen = !neuDetails.hidden;
      neuDetails.hidden = isOpen;
      neuToggle.setAttribute("aria-expanded", !isOpen);
      neuToggle.textContent = isOpen ? "View more" : "View less";
    });
  }

  const rhythmToggle = document.getElementById("rhythm-toggle");
  const rhythmDetails = document.getElementById("rhythm-details");
  if (rhythmToggle && rhythmDetails) {
    rhythmToggle.addEventListener("click", () => {
      const isOpen = !rhythmDetails.hidden;
      rhythmDetails.hidden = isOpen;
      rhythmToggle.setAttribute("aria-expanded", !isOpen);
      rhythmToggle.textContent = isOpen ? "View more" : "View less";
    });
  }

  const boehringerToggle = document.getElementById("boehringer-toggle");
  const boehringerDetails = document.getElementById("boehringer-details");
  if (boehringerToggle && boehringerDetails) {
    boehringerToggle.addEventListener("click", () => {
      const isOpen = !boehringerDetails.hidden;
      boehringerDetails.hidden = isOpen;
      boehringerToggle.setAttribute("aria-expanded", !isOpen);
      boehringerToggle.textContent = isOpen ? "View more" : "View less";
    });
  }
})();
