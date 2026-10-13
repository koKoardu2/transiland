'use strict';
/**
 * Plateforme d'inscription – Séminaire Loi de Finances 2027 – EB-Partners Group
 * Serveur Node.js sans dépendance externe (Node >= 18).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('./lib/config');
const store = require('./lib/store');
const chariow = require('./lib/chariow');
const docs = require('./lib/documents');
const pages = require('./lib/pages');
const { totals } = require('./lib/format');

const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ---------- helpers ----------
function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
const redirect = (res, to) => send(res, 303, '', 'text/plain', { Location: to });

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('Requête trop volumineuse'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseForm(buf) {
  return Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
}

function serveStatic(res, urlPath) {
  const file = path.normalize(path.join(PUBLIC, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(PUBLIC)) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file);
  send(res, 200, fs.readFileSync(file), MIME[ext] || 'application/octet-stream', {
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  return true;
}

function authorized(reg, token) {
  if (!reg || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(reg.token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function adminAuth(req, res) {
  if (!config.admin.password) {
    send(res, 503, pages.message('Back-office désactivé', 'Définissez ADMIN_PASSWORD dans le fichier .env pour activer le back-office.', 'warn'));
    return false;
  }
  const [scheme, value] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Basic' && value) {
    const [u, ...p] = Buffer.from(value, 'base64').toString().split(':');
    const given = Buffer.from(`${u}:${p.join(':')}`);
    const expected = Buffer.from(`${config.admin.user}:${config.admin.password}`);
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return true;
  }
  send(res, 401, 'Authentification requise', 'text/plain', { 'WWW-Authenticate': 'Basic realm="LF2027 Admin"' });
  return false;
}

// ---------- validation ----------
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v, max = 160) => String(v ?? '').trim().slice(0, max);

function validateRegistration(input) {
  const errors = [];
  const formule = config.formuleById(input.formule);
  if (!formule) errors.push('Formule invalide.');

  const company = {
    raisonSociale: str(input.company?.raisonSociale),
    niu: str(input.company?.niu, 40),
    rccm: str(input.company?.rccm, 60),
    secteur: str(input.company?.secteur, 80),
    adresse: str(input.company?.adresse, 200),
    ville: str(input.company?.ville, 80),
  };
  if (input.company?.type === 'particulier') company.raisonSociale = company.raisonSociale || 'Particulier';
  if (!company.raisonSociale) errors.push('La raison sociale est obligatoire.');

  const person = (p = {}) => ({
    civilite: ['M.', 'Mme'].includes(p.civilite) ? p.civilite : 'M.',
    nom: str(p.nom, 80),
    prenom: str(p.prenom, 80),
    fonction: str(p.fonction, 100),
    email: str(p.email, 120).toLowerCase(),
    telephone: str(p.telephone, 30),
  });

  const contact = person(input.contact);
  if (!contact.nom || !contact.prenom) errors.push('Nom et prénom du contact obligatoires.');
  if (!EMAIL.test(contact.email)) errors.push('Email du contact invalide.');
  if (contact.telephone.replace(/\D/g, '').length < 8) errors.push('Téléphone du contact invalide.');

  const participants = (Array.isArray(input.participants) ? input.participants : []).slice(0, 50).map(person);
  if (!participants.length) errors.push('Au moins un participant est requis.');
  participants.forEach((p, i) => {
    if (!p.nom || !p.prenom) errors.push(`Participant ${i + 1} : nom et prénom obligatoires.`);
    if (!EMAIL.test(p.email)) errors.push(`Participant ${i + 1} : email invalide.`);
  });

  const paymentMode = input.paymentMode === 'virement' ? 'virement' : 'chariow';
  if (!input.acceptTerms) errors.push('Vous devez accepter les conditions générales.');
  const signName = str(input.signName, 120);
  if (!signName) errors.push('Merci de saisir votre nom pour la signature électronique.');

  if (errors.length) return { errors };
  return {
    data: {
      formule: formule.id,
      company,
      contact,
      participants: participants.map((p) => ({ ...p, paymentStatus: 'pending' })),
      paymentMode,
      status: 'en_attente',
      totals: totals(formule, participants.length, config.vatRate),
      signature: { name: signName, at: new Date().toISOString() },
    },
  };
}

// ---------- payment helpers ----------
function markPaid(ref, index, source, saleId) {
  return store.update(ref, (r) => {
    const p = r.participants[index];
    if (!p || p.paymentStatus === 'paid') return;
    p.paymentStatus = 'paid';
    p.paidAt = new Date().toISOString();
    if (saleId) p.saleId = saleId;
    r.history.push({ at: p.paidAt, event: `Paiement confirmé (${source}) – ${p.prenom} ${p.nom}` });
    if (r.participants.every((x) => x.paymentStatus === 'paid')) r.paidAt = p.paidAt;
  });
}

function csvExport(regs) {
  const head = ['Référence', 'Date', 'Entreprise', 'NIU', 'Contact', 'Email contact', 'Téléphone contact', 'Formule', 'Mode', 'Statut dossier', 'Participant', 'Fonction', 'Email', 'Téléphone', 'Paiement', 'Total TTC dossier'];
  const q = (v) => `"${String(v ?? '').replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"`;
  const lines = [head.map(q).join(';')];
  for (const r of regs)
    for (const p of r.participants)
      lines.push(
        [r.ref, r.createdAt, r.company.raisonSociale, r.company.niu, `${r.contact.prenom} ${r.contact.nom}`, r.contact.email, r.contact.telephone, config.formuleById(r.formule).name, r.paymentMode, r.status, `${p.civilite} ${p.prenom} ${p.nom}`, p.fonction, p.email, p.telephone, p.paymentStatus === 'paid' ? 'Payé' : 'En attente', r.totals.ttc]
          .map(q)
          .join(';')
      );
  return '﻿' + lines.join('\r\n');
}

// ---------- router ----------
async function handle(req, res) {
  const url = new URL(req.url, config.publicUrl);
  const p = url.pathname;
  const t = url.searchParams.get('t');
  let m;

  // API publique
  if (req.method === 'GET' && p === '/api/config') {
    return json(res, 200, {
      event: config.event,
      speakers: config.speakers,
      organizer: { name: config.organizer.name, emails: config.organizer.emails, phones: config.organizer.phones },
      vatRate: config.vatRate,
      formules: config.formules.map((f) => ({ ...f, priceTTC: Math.round(f.priceHT * (1 + config.vatRate)) })),
      paymentMock: chariow.isMock(),
    });
  }

  if (req.method === 'POST' && p === '/api/inscriptions') {
    let input;
    try {
      input = JSON.parse((await readBody(req)).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'Données invalides.' });
    }
    const { errors, data } = validateRegistration(input);
    if (errors) return json(res, 422, { error: errors[0], errors });
    const reg = store.create(data);
    console.log(`[inscription] ${reg.ref} – ${reg.company.raisonSociale} – ${reg.participants.length} place(s)`);
    return json(res, 201, { ref: reg.ref, token: reg.token, url: `/dossier/${reg.ref}?t=${reg.token}` });
  }

  if (req.method === 'POST' && (m = p.match(/^\/api\/paiement\/([\w-]+)\/(\d+)$/))) {
    const reg = store.get(m[1]);
    if (!authorized(reg, t)) return json(res, 403, { error: 'Accès refusé.' });
    if (reg.status === 'annule') return json(res, 409, { error: 'Ce dossier a été annulé.' });
    const i = Number(m[2]);
    const part = reg.participants[i];
    if (!part) return json(res, 404, { error: 'Participant introuvable.' });
    if (part.paymentStatus === 'paid') return json(res, 200, { completed: true });
    try {
      const out = await chariow.createCheckout({ formuleId: reg.formule, participant: part, reg, index: i, ip: req.socket.remoteAddress });
      store.update(reg.ref, (r) => {
        r.participants[i].saleId = out.saleId || r.participants[i].saleId;
        r.participants[i].checkoutAt = new Date().toISOString();
        r.history.push({ at: new Date().toISOString(), event: `Checkout Chariow initié – ${part.prenom} ${part.nom}` });
      });
      if (out.step === 'completed' || out.step === 'already_purchased') {
        markPaid(reg.ref, i, 'Chariow', out.saleId);
        return json(res, 200, { completed: true });
      }
      if (!out.checkoutUrl) throw new Error('Chariow n’a pas renvoyé d’URL de paiement.');
      return json(res, 200, { checkoutUrl: out.checkoutUrl });
    } catch (e) {
      console.error('[chariow]', e.message, e.details || '');
      return json(res, 502, { error: 'Le paiement en ligne est momentanément indisponible. Réessayez ou contactez-nous.' });
    }
  }

  if (req.method === 'POST' && (m = p.match(/^\/api\/dossier\/([\w-]+)\/mode$/))) {
    const reg = store.get(m[1]);
    if (!authorized(reg, t)) return json(res, 403, { error: 'Accès refusé.' });
    store.update(reg.ref, (r) => {
      r.paymentMode = 'chariow';
      r.history.push({ at: new Date().toISOString(), event: 'Mode de paiement : Chariow' });
    });
    return json(res, 200, { ok: true });
  }

  // Retour de Chariow après paiement
  if (req.method === 'GET' && p === '/paiement/retour') {
    const reg = store.get(url.searchParams.get('ref'));
    if (!authorized(reg, t)) return send(res, 403, pages.message('Accès refusé', 'Lien invalide.', 'warn'));
    const i = Number(url.searchParams.get('i'));
    const part = reg.participants[i];
    const saleId = url.searchParams.get('sale_id') || url.searchParams.get('sale') || part?.saleId;
    let flash = { tone: 'info', text: 'Paiement en cours de vérification. Le statut sera mis à jour dès la confirmation de Chariow.' };
    if (part && part.paymentStatus !== 'paid' && saleId) {
      try {
        if (await chariow.isSaleCompleted(saleId)) markPaid(reg.ref, i, 'Chariow', saleId);
      } catch (e) {
        console.error('[chariow] vérification', e.message);
      }
    }
    if (store.get(reg.ref).participants[i]?.paymentStatus === 'paid') flash = { tone: 'ok', text: 'Paiement confirmé. Merci ! Un reçu vous a été envoyé par email.' };
    return send(res, 200, pages.dossier(store.get(reg.ref), { flash }));
  }

  // Webhook (Pulse) Chariow
  if (req.method === 'POST' && p === '/api/webhooks/chariow') {
    const raw = await readBody(req, 1_000_000);
    if (!chariow.verifyPulse(raw, req.headers)) return json(res, 401, { error: 'Signature invalide' });
    let evt;
    try {
      evt = JSON.parse(raw.toString('utf8'));
    } catch {
      return json(res, 400, { error: 'JSON invalide' });
    }
    const type = evt.event || evt.type;
    const payload = evt.data || evt.payload || evt;
    if (type === 'successful.sale') {
      const sale = payload.sale || {};
      const meta = sale.custom_metadata || payload.custom_metadata || {};
      const email = String(payload.customer?.email || sale.customer?.email || '').toLowerCase();
      let reg = meta.reference && store.get(meta.reference);
      let idx = reg ? Number(meta.participant_index) : -1;
      // Repli : rapprochement via l'identifiant de vente ou l'email
      for (const r of reg ? [] : store.all()) {
        const k = r.participants.findIndex((x) => (sale.id && x.saleId === sale.id) || (x.paymentStatus !== 'paid' && x.email === email && r.paymentMode === 'chariow'));
        if (k >= 0) {
          reg = r;
          idx = k;
          break;
        }
      }
      if (reg && idx >= 0) {
        markPaid(reg.ref, idx, 'Pulse Chariow', sale.id);
        console.log(`[pulse] vente confirmée ${sale.id} → ${reg.ref}#${idx}`);
      } else console.warn('[pulse] vente non rapprochée', sale.id, email);
    }
    return json(res, 200, { received: true });
  }

  // Simulation (mode mock uniquement)
  if (p === '/paiement/simulation' && chariow.isMock()) {
    const reg = store.get(url.searchParams.get('ref'));
    const i = Number(url.searchParams.get('i'));
    if (!authorized(reg, t) || !reg.participants[i]) return send(res, 403, pages.message('Accès refusé', 'Lien invalide.', 'warn'));
    if (req.method === 'POST') {
      const { result } = parseForm(await readBody(req));
      if (result === 'success') {
        markPaid(reg.ref, i, 'Simulation', null);
        return send(res, 200, pages.dossier(store.get(reg.ref), { flash: { tone: 'ok', text: 'Paiement (simulé) confirmé.' } }));
      }
      return send(res, 200, pages.dossier(reg, { flash: { tone: 'warn', text: 'Le paiement a échoué ou a été annulé. Vous pouvez réessayer.' } }));
    }
    return send(res, 200, pages.simulation(reg, i));
  }

  // Dossier & documents imprimables
  if (req.method === 'GET' && (m = p.match(/^\/(dossier|devis|contrat|facture)\/([\w-]+)$/))) {
    const reg = store.get(m[2]);
    if (!authorized(reg, t)) return send(res, 403, pages.message('Accès refusé', 'Ce lien est invalide ou a expiré.', 'warn'));
    const render = { dossier: pages.dossier, devis: docs.devis, contrat: docs.contrat, facture: docs.facture }[m[1]];
    return send(res, 200, render(reg));
  }

  // Back-office
  if (p === '/admin' || p.startsWith('/admin/')) {
    if (!adminAuth(req, res)) return;
    if (req.method === 'GET' && p === '/admin') return send(res, 200, pages.admin(store.all()));
    if (req.method === 'GET' && p === '/admin/export.csv')
      return send(res, 200, csvExport(store.all()), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="inscriptions-lf2027.csv"' });
    if (req.method === 'POST' && (m = p.match(/^\/admin\/([\w-]+)\/(paid|cancel)$/))) {
      const reg = store.get(m[1]);
      if (reg && m[2] === 'paid') reg.participants.forEach((_, i) => markPaid(reg.ref, i, 'Back-office'));
      if (reg && m[2] === 'cancel')
        store.update(reg.ref, (r) => {
          r.status = 'annule';
          r.history.push({ at: new Date().toISOString(), event: 'Dossier annulé (back-office)' });
        });
      return redirect(res, '/admin');
    }
  }

  if (req.method === 'GET' && serveStatic(res, p)) return;
  send(res, 404, pages.message('Page introuvable', 'La page demandée n’existe pas.', 'warn'));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Erreur interne.' });
  });
});

if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`LF 2027 – plateforme d'inscription : ${config.publicUrl}`);
    console.log(`Paiement Chariow : mode ${chariow.isMock() ? 'SIMULATION' : 'LIVE'}`);
  });
}

module.exports = { server, validateRegistration };
