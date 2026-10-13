'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

process.env.CHARIOW_PULSE_SECRET = 'whsec_test';
const { toWords, totals } = require('../lib/format');
const chariow = require('../lib/chariow');
const { validateRegistration } = require('../server');

test('montants en toutes lettres', () => {
  assert.strictEqual(toWords(1252125), 'un million deux cent cinquante-deux mille cent vingt-cinq');
  assert.strictEqual(toWords(80000), 'quatre-vingt mille');
  assert.strictEqual(toWords(71), 'soixante et onze');
  assert.strictEqual(toWords(200), 'deux cents');
});

test('totaux avec TVA 19,25 %', () => {
  const t = totals({ priceHT: 350000 }, 3, 0.1925);
  assert.deepStrictEqual([t.ht, t.tva, t.ttc, t.unitTTC], [1050000, 202125, 1252125, 417375]);
});

test('normalisation téléphone Cameroun', () => {
  assert.deepStrictEqual(chariow.splitPhone('+237 699 05 94 53'), { number: '699059453', country_code: '+237' });
  assert.deepStrictEqual(chariow.splitPhone('699059453'), { number: '699059453', country_code: '+237' });
});

test('signature des Pulses Chariow', () => {
  const body = Buffer.from('{"event":"successful.sale"}');
  const sig = 'sha256=' + crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex');
  assert.ok(chariow.verifyPulse(body, { 'x-pulse-signature': sig }));
  assert.ok(!chariow.verifyPulse(body, { 'x-pulse-signature': 'sha256=deadbeef' }));
});

test('validation des inscriptions', () => {
  const ok = validateRegistration({
    formule: 'standard',
    company: { raisonSociale: 'ACME SA' },
    contact: { prenom: 'A', nom: 'B', email: 'a@b.cm', telephone: '699000000' },
    participants: [{ prenom: 'A', nom: 'B', email: 'a@b.cm' }],
    acceptTerms: true,
    signName: 'A B',
  });
  assert.ok(ok.data);
  assert.strictEqual(ok.data.totals.ttc, 298125);
  assert.ok(validateRegistration({}).errors.length > 3);
});
