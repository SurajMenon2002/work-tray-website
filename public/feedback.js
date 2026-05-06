/* ======================================
   Nestly — feedback.js
   Handles feedback form submission,
   stores data in Supabase feedback table
   ====================================== */

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Using the same Supabase project as the extension
const SUPABASE_URL = 'https://tqlbxtzjhdsvgohddolk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbGJ4dHpqaGRzdmdvaGRkb2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MTEwNzksImV4cCI6MjA5MzE4NzA3OX0.cLgDjh5PgfJGilQDrp5HjTmlD82dOAdqQGZnlD7cZ1U';

// ── STATE ─────────────────────────────────────────────────────────────────────
let currentRating = 5;
let currentTag = 'feature-request';
let isSubmitting = false;

// ── RATING ────────────────────────────────────────────────────────────────────
function setRating(rating, btn) {
  currentRating = rating;
  document.querySelectorAll('.ff-emoji-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── TAG ───────────────────────────────────────────────────────────────────────
function setTag(tag, btn) {
  currentTag = tag;
  document.querySelectorAll('.ff-tag-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── SUBMIT ────────────────────────────────────────────────────────────────────
async function submitFeedback() {
  if (isSubmitting) return;

  const message = document.getElementById('fbMessage').value.trim();
  const name    = document.getElementById('fbName').value.trim();
  const email   = document.getElementById('fbEmail').value.trim();

  // Validation
  if (!message || message.length < 5) {
    showFeedbackError('Please write at least a few words of feedback!');
    document.getElementById('fbMessage').focus();
    return;
  }

  hideFeedbackError();
  isSubmitting = true;

  const btn = document.getElementById('submitFeedback');
  btn.disabled = true;
  btn.innerHTML = `<span class="fb-spinner"></span> Sending…`;

  // Build payload matching the DB schema
  const payload = {
    rating:       currentRating,
    tag:          currentTag,
    message:      message,
    name:         name || null,
    email:        email || null,
    app_version:  'v1.0.0',
    source:       'website',
    user_agent:   navigator.userAgent.slice(0, 200),
    created_at:   new Date().toISOString(),
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Fallback: try the proxy server
      const fallback = await submitViaProxy(payload);
      if (!fallback) throw new Error(`HTTP ${res.status}`);
    }

    showFeedbackSuccess();

  } catch (err) {
    console.error('[Nestly Feedback]', err);
    // Even on error, store locally so we don't lose feedback
    storeFeedbackLocally(payload);
    // Still show success to user — we'll sync later
    showFeedbackSuccess();
  } finally {
    isSubmitting = false;
  }
}

// ── PROXY FALLBACK ─────────────────────────────────────────────────────────────
async function submitViaProxy(payload) {
  try {
    const res = await fetch('https://worktray-api.vercel.app/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── LOCAL STORAGE FALLBACK ────────────────────────────────────────────────────
function storeFeedbackLocally(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem('nestly_pending_feedback') || '[]');
    existing.push(payload);
    localStorage.setItem('nestly_pending_feedback', JSON.stringify(existing));
  } catch {}
}

// ── UI STATE ─────────────────────────────────────────────────────────────────
function showFeedbackSuccess() {
  document.getElementById('feedbackFormCard').querySelectorAll('.ff-group, .ff-row, .ff-actions, .ff-title').forEach(el => {
    el.style.display = 'none';
  });
  document.getElementById('fbSuccess').style.display = 'flex';
  document.getElementById('fbSuccess').style.flexDirection = 'column';
  document.getElementById('fbSuccess').style.alignItems = 'center';
}

function resetFeedbackForm() {
  // Reset fields
  document.getElementById('fbMessage').value = '';
  document.getElementById('fbName').value = '';
  document.getElementById('fbEmail').value = '';
  currentRating = 5;
  currentTag = 'feature-request';

  // Reset UI
  document.querySelectorAll('.ff-emoji-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  document.querySelectorAll('.ff-tag-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

  // Restore form
  document.getElementById('feedbackFormCard').querySelectorAll('.ff-group, .ff-row, .ff-actions, .ff-title').forEach(el => {
    el.style.display = '';
  });

  // Restore button
  const btn = document.getElementById('submitFeedback');
  btn.disabled = false;
  btn.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24" height="18px" width="18px" xmlns="http://www.w3.org/2000/svg">
      <path stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" stroke-width="1.5" d="M7.39999 6.32003L15.89 3.49003C19.7 2.22003 21.77 4.30003 20.51 8.11003L17.68 16.6C15.78 22.31 12.66 22.31 10.76 16.6L9.91999 14.08L7.39999 13.24C1.68999 11.34 1.68999 8.23003 7.39999 6.32003Z"></path>
      <path stroke="currentColor" stroke-linejoin="round" stroke-linecap="round" stroke-width="1.5" d="M10.11 13.6501L13.69 10.0601"></path>
    </svg>
    Send Feedback
  `;

  // Hide success
  document.getElementById('fbSuccess').style.display = 'none';
  hideFeedbackError();
}

function showFeedbackError(msg) {
  const el = document.getElementById('fbError');
  document.getElementById('fbErrorMsg').textContent = msg;
  el.style.display = 'block';
}

function hideFeedbackError() {
  document.getElementById('fbError').style.display = 'none';
}

// ── LOAD TESTIMONIALS FROM DB ─────────────────────────────────────────────────
async function loadPublicTestimonials() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/feedback?select=name,rating,message,tag,created_at&is_public=eq.true&order=created_at.desc&limit=6`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.length >= 2) {
      renderTestimonials(data);
    }
  } catch {
    // Keep static testimonials on error
  }
}

function renderTestimonials(items) {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid || !items.length) return;

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';

  grid.innerHTML = items.map(item => `
    <div class="testimonial-card">
      <div class="tc-rating">${stars(item.rating || 5)}</div>
      <p>"${escapeHtml(item.message)}"</p>
      <div class="tc-author">
        <div class="tc-avatar">${initials(item.name || 'Anonymous')}</div>
        <div>
          <div class="tc-name">${escapeHtml(item.name || 'Anonymous')}</div>
          <div class="tc-role">Nestly User</div>
        </div>
      </div>
      ${item.tag ? `<div class="tc-tag">${tagLabel(item.tag)}</div>` : ''}
    </div>
  `).join('');
}

function tagLabel(tag) {
  const map = {
    'feature-request': '💡 Feature request',
    'bug-report': '🐛 Bug report',
    'ux-feedback': '🎨 UX feedback',
    'performance': '⚡ Performance',
    'integration': '🔌 Integration',
    'ai-quality': '🧠 AI quality',
    'general': '💬 General',
  };
  return map[tag] || tag;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── SPINNER STYLE ─────────────────────────────────────────────────────────────
(function injectSpinnerStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .fb-spinner {
      display: inline-block;
      width: 14px; height: 14px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: #0a0a0f;
      border-radius: 50%;
      animation: fbSpin 0.7s linear infinite;
      vertical-align: middle;
    }
    @keyframes fbSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
})();

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Try to load real testimonials (silently falls back to static)
  loadPublicTestimonials();
});
