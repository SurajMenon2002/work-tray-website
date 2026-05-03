/* Nestly — Razorpay Payment Integration
 * ============================================
 * Integrates Razorpay Checkout with the Nestly
 * marketing website. Handles plan selection,
 * order creation, payment verification, and
 * redirects users after successful payment.
 *
 * Webhook URL (server-side verification):
 *   https://worktray-api.vercel.app/payments/webhook
 */

const WorkTrayPay = (() => {
  'use strict';

  // ── Configuration ──────────────────────────────────
  const CONFIG = {
    // Backend API base URL — creates orders & verifies payments
    API_BASE: 'https://worktray-api.vercel.app',

    // Plans and their prices (in paise for INR, cents for USD)
    PLANS: {
      pro: {
        key: 'pro',
        name: 'Nestly Pro',
        description: 'Unlimited tasks, unlimited AI, all features',
        amount: 599,           // $5.99 in cents (or ₹599 in paise)
        currency: 'USD',       // Change to 'INR' if using Indian Rupees
        interval: 'monthly',
        trial_days: 14,
      },
    },

    // Theme matches the Nestly brand
    THEME: {
      color: '#f59e0b',       // Amber — matches brand accent
      backdrop_color: '#0a0a0f',
      font_family: "'Syne', 'DM Sans', sans-serif",
    },
  };

  // ── State ──────────────────────────────────────────
  let _currentPlan = null;
  let _isProcessing = false;

  // ── Helpers ────────────────────────────────────────

  /** Show a simple loading overlay while payment is processing */
  function showLoading(message = 'Preparing checkout…') {
    const existing = document.getElementById('wtp-loading');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'wtp-loading';
    overlay.innerHTML = `
      <div style="
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(10,10,15,0.85);
        backdrop-filter: blur(8px);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: 'Syne', sans-serif;
        color: #f0f0f8;
      ">
        <div style="
          width: 40px; height: 40px;
          border: 3px solid rgba(245,158,11,0.2);
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: wtp-spin 0.8s linear infinite;
          margin-bottom: 16px;
        "></div>
        <div style="font-size: 1rem; color: #a0a0c0;">${message}</div>
      </div>
      <style>
        @keyframes wtp-spin { to { transform: rotate(360deg); } }
      </style>
    `;
    document.body.appendChild(overlay);
  }

  function hideLoading() {
    const el = document.getElementById('wtp-loading');
    if (el) el.remove();
  }

  /** Show a toast notification */
  function showToast(message, type = 'error') {
    const existing = document.getElementById('wtp-toast');
    if (existing) existing.remove();

    const bg = type === 'error' ? '#f87171' : type === 'success' ? '#4ade80' : '#f59e0b';
    const toast = document.createElement('div');
    toast.id = 'wtp-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      background: bg,
      color: '#0a0a0f',
      fontFamily: "'DM Sans', sans-serif",
      fontWeight: '600',
      fontSize: '0.9rem',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      maxWidth: '90vw',
      textAlign: 'center',
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ── Core API Calls ─────────────────────────────────

  /**
   * Create a Razorpay order on the backend.
   * POST /payments/create-order
   */
  async function createOrder(planKey) {
    const plan = CONFIG.PLANS[planKey];
    if (!plan) throw new Error(`Unknown plan: "${planKey}"`);

    const response = await fetch(`${CONFIG.API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planKey,
        amount: plan.amount,
        currency: plan.currency,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Failed to create order (${response.status}): ${errBody}`);
    }

    return response.json(); // { order_id, amount, currency, receipt, ... }
  }

  /**
   * Verify payment on the backend after successful checkout.
   * POST /payments/verify
   */
  async function verifyPayment(payload) {
    const response = await fetch(`${CONFIG.API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Payment verification failed (${response.status}): ${errBody}`);
    }

    return response.json();
  }

  // ── Razorpay Checkout Handler ──────────────────────

  /**
   * Open the Razorpay checkout modal for a given plan.
   * Called from HTML: onclick="WorkTrayPay.open('pro')"
   */
  async function open(planKey) {
    // Prevent double-clicks / concurrent payments
    if (_isProcessing) return;
    _isProcessing = true;

    const plan = CONFIG.PLANS[planKey];
    if (!plan) {
      showToast(`Unknown plan: "${planKey}"`, 'error');
      _isProcessing = false;
      return;
    }

    _currentPlan = planKey;
    showLoading('Creating your order…');

    try {
      // 1. Create an order on the backend
      const order = await createOrder(planKey);

      hideLoading();

      // 2. Configure Razorpay checkout options
      const options = {
        key: order.key_id,                    // Razorpay Key ID from backend
        amount: order.amount,                 // Amount in paise/cents
        currency: order.currency,
        name: 'Nestly',
        description: plan.description,
        image: 'assets/worktray-logo.png',    // Relative to site root
        order_id: order.order_id,
        handler: onPaymentSuccess,
        modal: {
          ondismiss: onPaymentDismiss,
          backdropclose: false,
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        notes: {
          plan: planKey,
          source: 'nestly-website',
        },
        theme: CONFIG.THEME,
      };

      const rzp = new Razorpay(options);

      // Handle payment failures / errors inside the modal
      rzp.on('payment.failed', onPaymentFailed);

      rzp.open();

    } catch (err) {
      hideLoading();
      console.error('[WorkTrayPay] Error:', err);
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
      _isProcessing = false;
    }
  }

  // ── Razorpay Callbacks ─────────────────────────────

  /**
   * Called when payment is successful.
   * Sends the payment details to the backend for verification.
   */
  async function onPaymentSuccess(response) {
    showLoading('Verifying payment…');

    try {
      // Send the full Razorpay response to backend for verification
      const verification = await verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        plan: _currentPlan,
      });

      hideLoading();

      // Payment verified — redirect user to success / onboarding
      if (verification.success || verification.status === 'captured') {
        showToast('Payment successful! Welcome to Nestly Pro 🎉', 'success');

        // Redirect to the app or a success page after a brief delay
        setTimeout(() => {
          const redirectUrl = verification.redirect_url
            || `${CONFIG.API_BASE}/payment/success?plan=${_currentPlan}&payment_id=${response.razorpay_payment_id}`;
          window.location.href = redirectUrl;
        }, 1500);
      } else {
        showToast('Payment verification pending. We\'ll notify you shortly.', 'warning');
      }

    } catch (err) {
      hideLoading();
      console.error('[WorkTrayPay] Verification error:', err);
      showToast('Payment received! We\'re confirming it now. You\'ll hear from us shortly.', 'success');
      // Even if verification API fails, the webhook will handle it
      setTimeout(() => {
        window.location.href = `${CONFIG.API_BASE}/payment/success?plan=${_currentPlan}&payment_id=${response.razorpay_payment_id}`;
      }, 2000);
    } finally {
      _isProcessing = false;
    }
  }

  /**
   * Called when the Razorpay modal is closed without payment.
   */
  function onPaymentDismiss() {
    showToast('Payment cancelled. You can upgrade anytime.', 'warning');
    _isProcessing = false;
  }

  /**
   * Called when a payment fails inside the Razorpay modal.
   */
  function onPaymentFailed(response) {
    console.error('[WorkTrayPay] Payment failed:', response);
    const reason = response.error?.description || 'Payment failed. Please try again.';
    showToast(reason, 'error');
    _isProcessing = false;
  }

  // ── Public API ─────────────────────────────────────

  return {
    open,
    // Expose config for debugging / theming
    getConfig: () => ({ ...CONFIG }),
  };
})();