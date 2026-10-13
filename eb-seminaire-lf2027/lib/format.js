'use strict';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function money(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

function dateFr(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Africa/Douala' });
}

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function below100(n) {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  let u = n % 10;
  if (t === 7 || t === 9) u += 10;
  let s = TENS[t];
  if (u === 0) return t === 8 ? s + 's' : s;
  if ((u === 1 || u === 11) && t !== 8 && t !== 9) return s + ' et ' + UNITS[u];
  return s + '-' + UNITS[u];
}

function below1000(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = '';
  if (h > 0) s = (h > 1 ? UNITS[h] + ' cent' : 'cent') + (h > 1 && r === 0 ? 's' : '');
  if (r > 0) s += (s ? ' ' : '') + below100(r);
  return s;
}

// Conversion d'un entier en toutes lettres (français)
function toWords(n) {
  n = Math.round(n);
  if (n === 0) return 'zéro';
  const parts = [];
  const scales = [[1e9, 'milliard'], [1e6, 'million'], [1e3, 'mille']];
  for (const [v, name] of scales) {
    const q = Math.floor(n / v);
    if (q > 0) {
      if (name === 'mille') parts.push(q === 1 ? 'mille' : below1000(q).replace(/(cent|vingt)s$/, '$1') + ' mille');
      else parts.push(below1000(q) + ' ' + name + (q > 1 ? 's' : ''));
      n %= v;
    }
  }
  if (n > 0) parts.push(below1000(n));
  return parts.join(' ');
}

function totals(formule, count, vatRate) {
  const ht = formule.priceHT * count;
  const tva = Math.round(ht * vatRate);
  return { unitHT: formule.priceHT, unitTTC: Math.round(formule.priceHT * (1 + vatRate)), ht, tva, ttc: ht + tva, count };
}

module.exports = { esc, money, dateFr, toWords, totals };
