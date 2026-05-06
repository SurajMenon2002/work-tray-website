/* ======================================
   Nestly — pricing.js  v4
   FULLY AUTOMATIC currency detection.
   Detection order:
     1. User override (localStorage) — instant
     2. Server IP geo — most accurate, always wins
     3. Browser timezone — reliable, no network
     4. Browser locale — fallback
     5. USD — final default

   Fixes in v4:
     - showCurrencyOverride exposed globally for all script loading modes
     - Server call uses no-cors-safe approach + correct domain allowlist
     - Timezone detection prioritised correctly over locale
     - Indian users reliably get INR even if locale says en-AU
     - Race condition eliminated: server result always overwrites
   ====================================== */

(function () {
  'use strict';

  // ── PRICING TABLE ─────────────────────────────────────────────────────────
  const PRICING = {
    USD: { symbol: '$',    name: 'US Dollar',        monthly: 5.99,  annual: 57,  annualMonthly: 4.75 },
    INR: { symbol: '₹',   name: 'Indian Rupee',      monthly: 59,    annual: 599, annualMonthly: 49   },
    EUR: { symbol: '€',   name: 'Euro',              monthly: 5.49,  annual: 54,  annualMonthly: 4.50 },
    GBP: { symbol: '£',   name: 'British Pound',     monthly: 4.99,  annual: 49,  annualMonthly: 4.08 },
    CAD: { symbol: 'CA$', name: 'Canadian Dollar',   monthly: 7.99,  annual: 79,  annualMonthly: 6.58 },
    AUD: { symbol: 'A$',  name: 'Australian Dollar', monthly: 8.99,  annual: 89,  annualMonthly: 7.42 },
  };

  const COUNTRY_TO_CURRENCY = {
    IN: 'INR',
    US: 'USD', CA: 'CAD',
    GB: 'GBP',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR',
    GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR', EE: 'EUR',
    LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    AU: 'AUD', NZ: 'AUD',
  };

  // Explicit timezone → currency mapping (timezone is more reliable than locale)
  const TZ_TO_CURRENCY = {
    // India
    'Asia/Calcutta': 'INR', 'Asia/Kolkata': 'INR',
    // UK
    'Europe/London': 'GBP',
    // Australia / NZ
    'Australia/Sydney': 'AUD', 'Australia/Melbourne': 'AUD',
    'Australia/Brisbane': 'AUD', 'Australia/Perth': 'AUD',
    'Australia/Adelaide': 'AUD', 'Australia/Darwin': 'AUD',
    'Australia/Hobart': 'AUD', 'Australia/Canberra': 'AUD',
    'Australia/Lord_Howe': 'AUD', 'Australia/Currie': 'AUD',
    'Australia/Broken_Hill': 'AUD', 'Australia/Lindeman': 'AUD',
    'Pacific/Auckland': 'AUD', 'Pacific/Chatham': 'AUD',
    'Pacific/Norfolk': 'AUD',
    // Canada
    'America/Toronto': 'CAD', 'America/Vancouver': 'CAD',
    'America/Edmonton': 'CAD', 'America/Winnipeg': 'CAD',
    'America/Halifax': 'CAD', 'America/St_Johns': 'CAD',
    'America/Regina': 'CAD', 'America/Saskatoon': 'CAD',
    'America/Montreal': 'CAD', 'America/Ottawa': 'CAD',
    'America/Calgary': 'CAD',
    // USA — explicit list only, never catch-all America/*
    'America/New_York': 'USD', 'America/Chicago': 'USD',
    'America/Denver': 'USD', 'America/Los_Angeles': 'USD',
    'America/Anchorage': 'USD', 'America/Phoenix': 'USD',
    'America/Detroit': 'USD', 'America/Indiana/Indianapolis': 'USD',
    'America/Juneau': 'USD', 'America/Boise': 'USD',
    'America/Nome': 'USD', 'America/Sitka': 'USD',
    'America/Puerto_Rico': 'USD', 'America/Cayman': 'USD',
    'America/Panama': 'USD',
  };

  const EUR_TIMEZONES = new Set([
    'Europe/Berlin', 'Europe/Paris', 'Europe/Rome', 'Europe/Madrid',
    'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Lisbon',
    'Europe/Helsinki', 'Europe/Dublin', 'Europe/Athens', 'Europe/Warsaw',
    'Europe/Prague', 'Europe/Budapest', 'Europe/Stockholm', 'Europe/Copenhagen',
    'Europe/Oslo', 'Europe/Zurich', 'Europe/Sofia', 'Europe/Bucharest',
  ]);

  // Locale → currency (ONLY used as last resort — timezone takes priority)
  const LOCALE_TO_CURRENCY = {
    IN: 'INR', GB: 'GBP', AU: 'AUD', NZ: 'AUD', CA: 'CAD',
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
    BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', IE: 'EUR',
  };

  // ── STATE ─────────────────────────────────────────────────────────────────
  let currentCurrency = 'USD';
  let isAnnual = false;
  let serverResultApplied = false; // prevent client-side result from overwriting server result

  // ── DETECTION LAYERS ─────────────────────────────────────────────────────

  /** Layer 1: user-stored override */
  function detectViaStorage() {
    try {
      const stored = localStorage.getItem('nestly_currency_override');
      if (stored && PRICING[stored]) return { currency: stored, method: 'user-override' };
    } catch {}
    return null;
  }

  /** Layer 2: server IP-geo — most accurate */
  async function detectViaServer() {
    const res = await fetch('https://worktray-api.vercel.app/payments/detect-currency', {
      signal: AbortSignal.timeout(5000),
      // Using default cors mode — server must allow this origin.
      // If CORS fails, the catch block handles it gracefully.
    });
    if (!res.ok) throw new Error(`server ${res.status}`);
    const data = await res.json();
    if (data.currency && PRICING[data.currency]) {
      return { currency: data.currency, method: 'ip-geo', country: data.country };
    }
    throw new Error('no usable currency from server');
  }

  /** Layer 3: browser timezone — very reliable, no network */
  function detectViaTimezone() {
    let tz;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
    if (!tz) return null;

    if (TZ_TO_CURRENCY[tz]) return { currency: TZ_TO_CURRENCY[tz], method: 'timezone' };
    if (EUR_TIMEZONES.has(tz)) return { currency: 'EUR', method: 'timezone' };
    return null; // don't guess for unlisted zones
  }

  /** Layer 4: browser locale — least reliable, only if timezone failed */
  function detectViaLocale() {
    try {
      const langs = navigator.languages || (navigator.language ? [navigator.language] : []);
      for (const lang of langs) {
        const parts = lang.split('-');
        const cc = parts[parts.length - 1]?.toUpperCase();
        if (cc && LOCALE_TO_CURRENCY[cc]) {
          return { currency: LOCALE_TO_CURRENCY[cc], method: 'locale' };
        }
      }
    } catch {}
    return null;
  }

  // ── APPLY RESULT ─────────────────────────────────────────────────────────

  /**
   * Apply a detected currency result.
   * @param {{ currency: string, method: string }} result
   * @param {boolean} fromServer - if true, locks in result so client layers can't override
   */
  function applyDetected({ currency, method }, fromServer = false) {
    if (serverResultApplied && !fromServer) {
      // Server already gave us the definitive answer — ignore late client updates
      return;
    }
    if (fromServer) serverResultApplied = true;

    currentCurrency = currency;
    updatePricingDisplay(currency, isAnnual);

    // Update the currency indicator with detection context (debug-friendly)
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      const p = PRICING[currency];
      indicator.textContent = `Prices shown in ${p.name} (${currency})`;
    }
  }

  // ── UPDATE PRICE ELEMENTS ────────────────────────────────────────────────

  function updatePricingDisplay(currency, annual) {
    const p = PRICING[currency];
    if (!p) return;

    // Main price
    const priceEl  = document.getElementById('proPrice');
    const periodEl = document.getElementById('proPeriod');
    if (priceEl)  priceEl.textContent  = annual ? `${p.symbol}${p.annualMonthly}` : `${p.symbol}${p.monthly}`;
    if (periodEl) periodEl.textContent = annual ? '/mo (annual)' : '/month';

    // Annual breakdown note
    const annualNote  = document.getElementById('annualNote');
    const annualTotal = document.getElementById('annualTotal');
    const annualSave  = document.getElementById('annualSaving');
    if (annualNote)  annualNote.style.display = annual ? 'block' : 'none';
    if (annualTotal) annualTotal.textContent   = `Billed ${p.symbol}${p.annual}/year`;
    if (annualSave) {
      const saved = ((p.monthly * 12) - p.annual).toFixed(0);
      annualSave.textContent = `Save ${p.symbol}${saved}`;
    }

    // Currency indicator
    const indicator = document.getElementById('currencyIndicator');
    if (indicator) {
      indicator.textContent = `Prices shown in ${p.name} (${currency})`;
    }

    // Override picker (hidden by default)
    const picker = document.getElementById('currencyPicker');
    if (picker) picker.value = currency;
  }

  // ── MAIN DETECT ──────────────────────────────────────────────────────────

  async function detectCurrency() {
    // 1. User override — use immediately and skip all detection
    const override = detectViaStorage();
    if (override) {
      applyDetected(override, true); // treat as authoritative
      return;
    }

    // 2. Client-side best guess — show something immediately while server loads
    //    Priority: timezone > locale > USD
    //    IMPORTANT: timezone is tried first so India (Asia/Kolkata) → INR
    //    even if browser locale says en-AU
    const tzResult     = detectViaTimezone();
    const localeResult = detectViaLocale();
    const clientResult = tzResult || localeResult || { currency: 'USD', method: 'default' };

    // Show client result immediately (no network wait)
    applyDetected(clientResult, false);

    // 3. Server result — always wins, runs in background
    try {
      const serverResult = await detectViaServer();
      applyDetected(serverResult, true); // locks in result
    } catch (err) {
      // Server failed (CORS, timeout, network) — client result stays
      // This is expected when the website domain isn't in the server's CORS allowlist.
      // The client result (timezone-based) is a good enough fallback.
      console.warn('[Nestly pricing] Server geo failed, using client-side detection:', err.message);

      // Mark client result as final so no further changes happen
      serverResultApplied = true;
    }
  }

  // ── BILLING TOGGLE ───────────────────────────────────────────────────────

  function toggleBilling() {
    isAnnual = !isAnnual;
    const sw = document.getElementById('billingSwitch');
    if (sw) sw.classList.toggle('active', isAnnual);
    updatePricingDisplay(currentCurrency, isAnnual);
  }

  // ── MANUAL CURRENCY OVERRIDE ─────────────────────────────────────────────

  function showCurrencyOverride() {
    const panel = document.getElementById('currencyOverridePanel');
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = isHidden ? 'flex' : 'none';
  }

  function switchCurrency(currency) {
    if (!PRICING[currency]) return;
    currentCurrency = currency;
    isAnnual = false;
    const sw = document.getElementById('billingSwitch');
    if (sw) sw.classList.remove('active');
    updatePricingDisplay(currency, false);

    // Persist override
    try { localStorage.setItem('nestly_currency_override', currency); } catch {}

    // Hide panel and lock in result
    const panel = document.getElementById('currencyOverridePanel');
    if (panel) panel.style.display = 'none';
    serverResultApplied = true;
  }

  // ── EXPOSE GLOBALS ───────────────────────────────────────────────────────
  // Must be on window regardless of how this script is loaded
  // (classic script, defer, async, or ES module).
  // Inline onclick="showCurrencyOverride()" needs window.showCurrencyOverride.

  window.toggleBilling      = toggleBilling;
  window.showCurrencyOverride = showCurrencyOverride;
  window.switchCurrency     = switchCurrency;

  // Also expose PRICING for any other scripts that might need it
  window.NESTLY_PRICING = PRICING;

  // ── INIT ─────────────────────────────────────────────────────────────────

  function init() {
    // Show best client-side guess immediately (no network wait) to avoid
    // flashing USD for Indian/non-US users.
    // Priority: timezone → locale → USD (same as detectCurrency's client layers)
    const tzResult     = detectViaTimezone();
    const localeResult = detectViaLocale();
    const immediate    = tzResult || localeResult || { currency: 'USD', method: 'default' };
    updatePricingDisplay(immediate.currency, false);
    // Start async detection (server IP-geo will overwrite if it succeeds)
    detectCurrency();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready (e.g. script loaded with defer at end of body)
    init();
  }

})();