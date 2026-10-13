'use strict';
/**
 * Intégration Chariow (https://chariow.dev)
 *  - POST /v1/checkout       : création d'une session de paiement (Mobile Money, carte…)
 *  - GET  /v1/sales/{id}     : vérification d'une vente
 *  - Pulses (webhooks)       : signature HMAC-SHA256 "sha256=<hex>" du corps brut
 */
const crypto = require('crypto');
const config = require('./config');

const c = config.chariow;

function isMock() {
  return c.mode === 'mock';
}

async function api(method, path, body) {
  const res = await fetch(c.apiUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${c.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json.message || json.error || `HTTP ${res.status}`;
    const err = new Error(`Chariow : ${msg}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  // Les réponses peuvent être enveloppées dans { data: … }
  return json.data ?? json;
}

/** Normalise un numéro camerounais : renvoie { number, country_code } */
function splitPhone(raw) {
  let digits = String(raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+237')) digits = digits.slice(4);
  else if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.startsWith('237') && digits.length === 12) digits = digits.slice(3);
  return { number: digits.replace(/\D/g, ''), country_code: '+237' };
}

/**
 * Crée un checkout pour un participant.
 * Retourne { checkoutUrl, saleId, step }.
 */
async function createCheckout({ formuleId, participant, reg, index, ip }) {
  const redirectUrl = `${config.publicUrl}/paiement/retour?ref=${reg.ref}&i=${index}&t=${reg.token}`;

  if (isMock()) {
    return {
      step: 'payment',
      saleId: 'sal_mock_' + crypto.randomBytes(4).toString('hex'),
      checkoutUrl: `${config.publicUrl}/paiement/simulation?ref=${reg.ref}&i=${index}&t=${reg.token}`,
    };
  }

  const productId = c.products[formuleId];
  if (!productId) throw new Error(`Aucun produit Chariow configuré pour la formule « ${formuleId} ».`);

  const payload = {
    product_id: productId,
    email: participant.email,
    first_name: participant.prenom,
    last_name: participant.nom,
    phone: splitPhone(participant.telephone || reg.contact.telephone),
    payment_currency: config.currency,
    redirect_url: redirectUrl,
    custom_metadata: { reference: reg.ref, participant_index: String(index) },
  };
  if (ip) payload.customer_ip = ip;

  const data = await api('POST', '/checkout', payload);
  const sale = data.sale || data.purchase || {};
  return {
    step: data.step || 'payment',
    saleId: sale.id || data.sale_id || data.purchase_id || null,
    checkoutUrl: data.payment?.checkout_url || data.checkout_url || null,
  };
}

/** Renvoie true si la vente est confirmée côté Chariow. */
async function isSaleCompleted(saleId) {
  if (!saleId) return false;
  if (isMock()) return false; // en mode simulation, la confirmation se fait via la page de simulation
  const sale = await api('GET', `/sales/${encodeURIComponent(saleId)}`);
  const status = String(sale.status || sale.payment?.status || '').toLowerCase();
  return ['completed', 'paid', 'success', 'successful', 'succeeded'].includes(status);
}

/** Vérifie la signature d'un Pulse (webhook) Chariow. */
function verifyPulse(rawBody, headers) {
  if (!c.pulseSecret) return false;
  const sig =
    headers['x-pulse-signature'] ||
    headers['x-chariow-signature'] ||
    headers['x-signature'] ||
    headers['x-webhook-signature'] ||
    '';
  const expected = 'sha256=' + crypto.createHmac('sha256', c.pulseSecret).update(rawBody).digest('hex');
  const a = Buffer.from(String(sig).startsWith('sha256=') ? sig : 'sha256=' + sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { createCheckout, isSaleCompleted, verifyPulse, isMock, splitPhone };
