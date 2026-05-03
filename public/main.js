/* Nestly Website — main.js */

// ── NAV SCROLL ────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── MOBILE MENU ───────────────────────────────────────
const burger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');
burger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
document.querySelectorAll('.mm-link').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── USE CASES TABS ────────────────────────────────────
document.querySelectorAll('.uc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.uc-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.uc-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.tab;
    document.querySelector(`[data-panel="${target}"]`).classList.add('active');
  });
});

// ── MASCOT STAGE INTERACTION ──────────────────────────
const mascotStates = {
  idle: {
    body: 'assets/front-idle.png',
    eyes: 'assets/neutral-dot.png',
    speech: '"Hi! I\'m Puff. I\'ll keep your tasks in check while you browse."'
  },
  thinking: {
    body: 'assets/thinking.png',
    eyes: 'assets/busy-spin.png',
    speech: '"Hmm, let me analyse your tasks and figure out what needs attention first…"'
  },
  alert: {
    body: 'assets/front-alert.png',
    eyes: 'assets/neutral-dot.png',
    speech: '"Hey! You have 3 new tasks and a standup due in 10 minutes. Want help?"'
  },
  happy: {
    body: 'assets/front-happy.png',
    eyes: 'assets/happy-arc.png',
    speech: '"You finished the task! That\'s what I\'m talking about. Keep it up! 🎉"'
  },
  rest: {
    body: 'assets/side-rest.png',
    eyes: 'assets/sleep-closed.png',
    speech: '"Zzz… I\'ll be right here when you need me."'
  }
};

window.setMascotState = function(state) {
  const s = mascotStates[state];
  if (!s) return;
  const body = document.getElementById('mascotBody');
  const eyes = document.getElementById('mascotEyes');
  const speech = document.getElementById('stageSpeech');
  if (body) { body.style.opacity = '0'; setTimeout(() => { body.src = s.body; body.style.opacity = '1'; }, 200); }
  if (eyes) { eyes.style.opacity = '0'; setTimeout(() => { eyes.src = s.eyes; eyes.style.opacity = '1'; }, 200); }
  if (speech) { speech.style.opacity = '0'; setTimeout(() => { speech.textContent = s.speech; speech.style.opacity = '1'; }, 200); }
};

// Make mascot state items clickable
document.querySelectorAll('.state-item').forEach(item => {
  item.addEventListener('click', () => {
    const st = item.dataset.state;
    if (st) setMascotState(st);
  });
});

// Add CSS transition for mascot swap
const addMascotTransitions = () => {
  const body = document.getElementById('mascotBody');
  const eyes = document.getElementById('mascotEyes');
  const speech = document.getElementById('stageSpeech');
  if (body) body.style.transition = 'opacity 0.2s';
  if (eyes) eyes.style.transition = 'opacity 0.2s';
  if (speech) speech.style.transition = 'opacity 0.2s';
};
addMascotTransitions();

// ── ANIMATED SEARCH DEMO ──────────────────────────────
const searchPhrases = [
  'what was the API migration task?',
  'find that design review thing',
  'the bug about user sessions',
  'client feedback from last week',
];
let searchIdx = 0;
const searchEl = document.getElementById('searchDemo');
if (searchEl) {
  setInterval(() => {
    searchIdx = (searchIdx + 1) % searchPhrases.length;
    const phrase = searchPhrases[searchIdx];
    searchEl.style.opacity = '0';
    setTimeout(() => {
      searchEl.textContent = phrase;
      searchEl.style.opacity = '1';
    }, 300);
    searchEl.style.transition = 'opacity 0.3s';
  }, 3000);
}

// ── SCROLL REVEAL ─────────────────────────────────────
const revealEls = document.querySelectorAll(
  '.feature-card, .trait-card, .int-card, .pricing-card, .faq-item, .flow-node, .uc-list li'
);
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${(i % 6) * 0.07}s`;
      entry.target.classList.add('revealed');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

revealEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  revealObs.observe(el);
});

document.querySelectorAll('.revealed').forEach = undefined; // avoid double process
// Override via class instead
const styleReveal = document.createElement('style');
styleReveal.textContent = `.revealed { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(styleReveal);

// ── STANDUP COPY BUTTON ───────────────────────────────
const standupCopy = document.querySelector('.standup-copy');
if (standupCopy) {
  standupCopy.addEventListener('click', () => {
    const text = `Yesterday: Shipped login page redesign, closed 3 bugs\nToday: Auth flow fix, design review, docs update\nBlockers: None`;
    navigator.clipboard.writeText(text).then(() => {
      standupCopy.textContent = '✓ Copied!';
      standupCopy.style.background = '#4ade80';
      setTimeout(() => {
        standupCopy.textContent = 'Copy to Slack →';
        standupCopy.style.background = '';
      }, 2000);
    }).catch(() => {
      standupCopy.textContent = '✓ Done!';
      setTimeout(() => { standupCopy.textContent = 'Copy to Slack →'; }, 2000);
    });
  });
}

// ── SMOOTH ANCHOR SCROLL ──────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ── AUTO-CYCLE MASCOT STATE ───────────────────────────
const stateOrder = ['idle', 'thinking', 'alert', 'happy', 'idle'];
let stateIdx = 0;
setInterval(() => {
  stateIdx = (stateIdx + 1) % stateOrder.length;
  setMascotState(stateOrder[stateIdx]);
}, 4000);
