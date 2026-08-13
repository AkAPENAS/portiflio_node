/* =========================================================
   CONFIG
   ========================================================= */
const CONFIG = {
  startDate: "2023-01-01", // 🔧 data usada no process.uptime() do rodapé
  orbitPeriodSeconds: 46,  // tempo para uma volta completa da órbita
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   NAV — scroll state, menu mobile
   ========================================================= */
const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 20);
}, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("is-open");
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

/* =========================================================
   NAVEGAÇÃO UNIFICADA — usada por nav, botões do hero e nós da órbita
   ========================================================= */
function goToSection(targetId) {
  const section = document.getElementById(targetId);
  if (!section) return;
  navLinks.classList.remove("is-open");
  navToggle.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
}

document.querySelectorAll("[data-target]").forEach((el) => {
  el.addEventListener("click", (e) => {
    const targetId = el.getAttribute("data-target");
    if (!targetId) return;
    // nós da órbita disparam a animação do sinal antes de navegar (ver mais abaixo)
    if (!el.classList.contains("orbit-node")) {
      e.preventDefault();
      goToSection(targetId);
    }
  });
});

/* =========================================================
   LOG PANEL — console reativo às interações
   ========================================================= */
const logBody = document.getElementById("logBody");
let logCount = 0;

function pushLog(text, ok = false) {
  const line = document.createElement("p");
  line.className = "log-line";
  const time = (performance.now() / 1000).toFixed(2);
  line.innerHTML = `<span class="t">[${time}s]</span> ${text}${ok ? ' <span class="ok">✓</span>' : ""}`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;

  logCount++;
  if (logCount > 8) {
    const first = logBody.querySelector(".log-line");
    if (first) first.remove();
  }
}

// linhas iniciais, com pequeno intervalo entre elas
const bootLines = [
  "server.listen(3000)",
  "event loop iniciado",
  "aguardando interação do usuário...",
];
bootLines.forEach((text, i) => {
  setTimeout(() => pushLog(text, i === 1), 400 + i * 500);
});

/* =========================================================
   DIAGRAMA — órbita contínua via requestAnimationFrame
   ========================================================= */
const diagram = document.getElementById("loopDiagram");
const orbitNodes = Array.from(document.querySelectorAll(".orbit-node"));
const signalDot = document.getElementById("signalDot");

let radius = 0;
let isOrbitPaused = false;
let orbitStart = performance.now();
let pausedAt = 0;

function measureRadius() {
  const size = diagram.clientWidth;
  const nodeSize = 108; // deve bater com a largura do .orbit-node no CSS
  radius = size / 2 - nodeSize / 2 - 6;
}
measureRadius();
window.addEventListener("resize", measureRadius);

const baseAngles = [ -90, 0, 90, 180 ]; // graus: topo, direita, baixo, esquerda
let currentPositions = orbitNodes.map(() => ({ x: 0, y: 0 }));

function placeNodesStatic() {
  orbitNodes.forEach((node, i) => {
    const rad = (baseAngles[i] * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    node.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    currentPositions[i] = { x, y };
  });
}

function orbitLoop(now) {
  if (!isOrbitPaused) {
    const elapsed = (now - orbitStart) / 1000;
    const angleOffset = (elapsed / CONFIG.orbitPeriodSeconds) * 360;

    orbitNodes.forEach((node, i) => {
      const rad = ((baseAngles[i] + angleOffset) * Math.PI) / 180;
      const x = Math.cos(rad) * radius;
      const y = Math.sin(rad) * radius;
      node.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      currentPositions[i] = { x, y };
    });
  }
  requestAnimationFrame(orbitLoop);
}

if (prefersReducedMotion) {
  placeNodesStatic();
} else {
  requestAnimationFrame(orbitLoop);
}

function pauseOrbit() { isOrbitPaused = true; }
function resumeOrbit() {
  // realinha o "relógio" da órbita para não dar salto ao retomar
  isOrbitPaused = false;
}

diagram.addEventListener("mouseenter", pauseOrbit);
diagram.addEventListener("mouseleave", resumeOrbit);
diagram.addEventListener("focusin", pauseOrbit);
diagram.addEventListener("focusout", resumeOrbit);

/* =========================================================
   SINAL VIAJANDO — animação de clique nos nós da órbita
   ========================================================= */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function fireSignal(node) {
  const idx = orbitNodes.indexOf(node);
  if (idx === -1) return;
  const { x: targetX, y: targetY } = currentPositions[idx];
  const targetId = node.getAttribute("data-target");
  const fnLabel = node.getAttribute("data-fn");
  const sectionLabel = node.getAttribute("data-label");

  pauseOrbit();
  node.classList.add("is-active");
  pushLog(`${fnLabel} <span class="t">→</span> ${sectionLabel.toLowerCase()}`, false);

  const duration = 650;
  const start = performance.now();
  signalDot.style.opacity = "1";

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const x = targetX * eased;
    const y = targetY * eased;
    signalDot.style.transform = `translate(${x}px, ${y}px) scale(${1 + eased * 0.4})`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      pushLog(`${fnLabel} resolvido`, true);
      signalDot.style.opacity = "0";
      signalDot.style.transform = "translate(0, 0) scale(1)";
      goToSection(targetId);
      setTimeout(resumeOrbit, 300);
    }
  }
  requestAnimationFrame(step);
}

orbitNodes.forEach((node) => {
  node.addEventListener("click", () => fireSignal(node));
});

/* =========================================================
   SCROLL — destaca nav ativo e nó da órbita correspondente
   ========================================================= */
const sections = document.querySelectorAll("main section[id]");
const navAnchors = document.querySelectorAll(".nav__links a[data-target]");

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;

      navAnchors.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("data-target") === id);
      });
      orbitNodes.forEach((n) => {
        n.classList.toggle("is-active", n.getAttribute("data-target") === id);
      });
    });
  },
  { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
);
sections.forEach((s) => sectionObserver.observe(s));

/* =========================================================
   SCROLL REVEAL
   ========================================================= */
const revealEls = document.querySelectorAll(".reveal");
if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

/* =========================================================
   STACK FRAMES — acordeão em "Sobre"
   ========================================================= */
document.querySelectorAll(".stack-frame").forEach((frame) => {
  frame.addEventListener("click", () => {
    const wasOpen = frame.classList.contains("is-open");
    document.querySelectorAll(".stack-frame").forEach((f) => f.classList.remove("is-open"));
    if (!wasOpen) frame.classList.add("is-open");
  });
});

/* =========================================================
   COPIAR E-MAIL
   ========================================================= */
const copyBtn = document.getElementById("copyEmailBtn");
const emailLink = document.getElementById("emailLink");
if (copyBtn && emailLink) {
  copyBtn.addEventListener("click", async () => {
    const email = emailLink.textContent.trim();
    try {
      await navigator.clipboard.writeText(email);
      copyBtn.textContent = "copiado";
      copyBtn.classList.add("is-copied");
      pushLog("email copiado para a área de transferência", true);
    } catch {
      copyBtn.textContent = "erro";
    }
    setTimeout(() => {
      copyBtn.textContent = "copiar";
      copyBtn.classList.remove("is-copied");
    }, 2000);
  });
}

/* =========================================================
   FORMULÁRIO DE CONTATO (visual — sem backend conectado)
   ========================================================= */
const contactForm = document.getElementById("contactForm");
const submitBtn = document.getElementById("submitBtn");
const formNote = document.getElementById("formNote");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const original = submitBtn.textContent;
    submitBtn.textContent = "resolvendo...";
    submitBtn.disabled = true;

    setTimeout(() => {
      formNote.textContent =
        "Meio de contato nao disponivel no momento, tente outra opçao.";
      formNote.style.color = "var(--success)";
      submitBtn.textContent = original;
      submitBtn.disabled = false;
      contactForm.reset();
      pushLog("resolve(mensagem)", true);
    }, 900);
  });
}

/* =========================================================
   RODAPÉ — process.uptime()
   ========================================================= */
const uptimeEl = document.getElementById("uptime");
if (uptimeEl) {
  const start = new Date(CONFIG.startDate);
  const days = Math.max(0, Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)));
  uptimeEl.textContent = `${days} dias em execução`;
}
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   LINK DO CURRÍCULO
   ========================================================= */
const resumeLink = document.getElementById("resumeLink");
if (resumeLink) {
  resumeLink.addEventListener("click", (e) => {
    // 🔧 Troque o href por um PDF real (ex: "cv.pdf") quando tiver o arquivo.
    if (resumeLink.getAttribute("href") === "#") {
      e.preventDefault();
      alert("Currículo não disponível no momento.");
    }
  });
}
