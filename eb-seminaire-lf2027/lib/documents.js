'use strict';
const config = require('./config');
const { esc, money, dateFr, toWords } = require('./format');

const org = config.organizer;
const ev = config.event;

function shell(title, body, { watermark } = {}) {
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/print.css">
</head><body>
<div class="toolbar no-print">
  <a href="javascript:history.back()" class="tb-btn ghost">← Retour</a>
  <span class="tb-title">${esc(title)}</span>
  <button class="tb-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
</div>
<main class="sheet">${watermark ? `<div class="watermark">${esc(watermark)}</div>` : ''}${body}</main>
</body></html>`;
}

function header(docType, number, date) {
  return `
  <header class="doc-head">
    <div class="brand">
      <img src="/assets/logo-eb.jpg" alt="EB-Partners Group">
      <div class="org">
        <strong>${esc(org.name)}</strong>
        <span>${esc(org.tagline)}</span>
        <span>${esc(org.address)}</span>
        <span>${org.phones.map(esc).join(' · ')}</span>
        <span>${esc(org.emails[0])}</span>
        <span>NIU : ${esc(org.niu)} · RCCM : ${esc(org.rccm)}</span>
      </div>
    </div>
    <div class="doc-id">
      <img src="/assets/logo-lf2027.jpg" alt="LF 2027" class="lf">
      <h1>${esc(docType)}</h1>
      <div class="meta">N° <b>${esc(number)}</b></div>
      <div class="meta">Date : <b>${esc(dateFr(date))}</b></div>
    </div>
  </header>`;
}

function clientBlock(reg, label = 'Client') {
  const co = reg.company;
  const ct = reg.contact;
  return `
  <section class="parties">
    <div class="party">
      <h3>${esc(label)}</h3>
      <strong>${esc(co.raisonSociale)}</strong>
      ${co.adresse ? `<span>${esc(co.adresse)}${co.ville ? ', ' + esc(co.ville) : ''}</span>` : ''}
      ${co.niu ? `<span>NIU : ${esc(co.niu)}</span>` : ''}
      ${co.rccm ? `<span>RCCM : ${esc(co.rccm)}</span>` : ''}
      <span>Contact : ${esc(ct.civilite)} ${esc(ct.prenom)} ${esc(ct.nom)}${ct.fonction ? ' – ' + esc(ct.fonction) : ''}</span>
      <span>${esc(ct.email)} · ${esc(ct.telephone)}</span>
    </div>
    <div class="party event">
      <h3>Formation</h3>
      <strong>${esc(ev.title)} – ${esc(ev.subtitle)}</strong>
      <span>${esc(ev.dates)} · ${esc(ev.hours)}</span>
      <span>${esc(ev.venue)}, ${esc(ev.venueCity)}</span>
      <span>Durée : ${esc(ev.duration)}</span>
      <span>Référence dossier : <b>${esc(reg.ref)}</b></span>
    </div>
  </section>`;
}

function linesTable(reg) {
  const f = config.formuleById(reg.formule);
  const t = reg.totals;
  return `
  <table class="lines">
    <thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">P.U. HT</th><th class="num">Montant HT</th></tr></thead>
    <tbody>
      <tr>
        <td><b>${esc(ev.title)} « ${esc(ev.subtitle)} » – Formule ${esc(f.name)}</b>
          <div class="sub">${esc(ev.dates)} – ${esc(ev.venue)}, ${esc(ev.venueCity)}</div>
          <div class="sub">Inclus : ${f.features.map(esc).join(' · ')}</div>
        </td>
        <td class="num">${t.count}</td>
        <td class="num">${money(t.unitHT)}</td>
        <td class="num">${money(t.ht)}</td>
      </tr>
    </tbody>
  </table>
  <div class="totals-wrap">
    <div class="in-words">Arrêté le présent document à la somme de <b>${esc(toWords(t.ttc))} francs CFA</b> toutes taxes comprises.</div>
    <table class="totals">
      <tr><td>Total HT</td><td class="num">${money(t.ht)}</td></tr>
      <tr><td>TVA (19,25 %)</td><td class="num">${money(t.tva)}</td></tr>
      <tr class="grand"><td>Total TTC</td><td class="num">${money(t.ttc)}</td></tr>
    </table>
  </div>`;
}

function participantsTable(reg, withStatus) {
  return `
  <table class="lines compact">
    <thead><tr><th>#</th><th>Participant</th><th>Fonction</th><th>Email</th><th>Téléphone</th>${withStatus ? '<th>Règlement</th>' : ''}</tr></thead>
    <tbody>${reg.participants
      .map(
        (p, i) => `<tr><td>${i + 1}</td><td>${esc(p.civilite)} ${esc(p.prenom)} ${esc(p.nom)}</td><td>${esc(p.fonction)}</td><td>${esc(p.email)}</td><td>${esc(p.telephone)}</td>${
          withStatus ? `<td>${p.paymentStatus === 'paid' ? '<span class="ok">Réglé</span>' : 'En attente'}</td>` : ''
        }</tr>`
      )
      .join('')}</tbody>
  </table>`;
}

function paymentInfo() {
  return `
  <section class="pay-info">
    <div>
      <h4>Paiement en ligne</h4>
      <p>Mobile Money (MTN MoMo, Orange Money) ou carte bancaire via <b>Chariow</b>, depuis votre espace dossier.</p>
    </div>
    <div>
      <h4>Virement bancaire</h4>
      <p>Banque : ${esc(org.bank.name)}<br>Titulaire : ${esc(org.bank.holder)}<br>Compte : ${esc(org.bank.iban)}<br>SWIFT : ${esc(org.bank.swift)}</p>
    </div>
  </section>`;
}

function devis(reg) {
  const validUntil = new Date(new Date(reg.createdAt).getTime() + 30 * 864e5);
  const body = `
  ${header('Devis', 'DEV-' + reg.ref, reg.createdAt)}
  ${clientBlock(reg)}
  ${linesTable(reg)}
  <h3 class="sec">Participants inscrits</h3>
  ${participantsTable(reg, false)}
  ${paymentInfo()}
  <section class="conditions">
    <p><b>Validité :</b> devis valable jusqu’au ${esc(dateFr(validUntil))}, dans la limite des places disponibles. Clôture des inscriptions le ${esc(dateFr(ev.registrationDeadline))}.</p>
    <p><b>Conditions :</b> règlement intégral avant le début de la formation. L’inscription devient ferme à réception du paiement ou du bon de commande signé.</p>
  </section>
  <section class="signs">
    <div><span>Bon pour accord – Le Client</span><small>(Date, cachet et signature, précédés de la mention « Bon pour accord »)</small></div>
    <div><span>Pour ${esc(org.name)}</span><small>${esc(org.signatory)}</small></div>
  </section>
  ${footer()}`;
  return shell(`Devis DEV-${reg.ref}`, body);
}

function facture(reg) {
  const paid = reg.status === 'paye';
  const body = `
  ${header(paid ? 'Facture acquittée' : 'Facture', 'FAC-' + reg.ref, reg.paidAt || reg.updatedAt || reg.createdAt)}
  ${clientBlock(reg)}
  ${linesTable(reg)}
  <h3 class="sec">Détail des règlements</h3>
  ${participantsTable(reg, true)}
  ${paid ? '<div class="stamp">PAYÉ</div>' : paymentInfo()}
  ${footer()}`;
  return shell(`Facture FAC-${reg.ref}`, body);
}

function contrat(reg) {
  const f = config.formuleById(reg.formule);
  const t = reg.totals;
  const co = reg.company;
  const sig = reg.signature || {};
  const body = `
  ${header('Convention de formation', 'CONV-' + reg.ref, reg.createdAt)}
  <p class="legal-intro">Convention de formation professionnelle conclue entre les soussignés :</p>
  <section class="parties">
    <div class="party">
      <h3>L’organisme de formation</h3>
      <strong>${esc(org.name)}</strong>
      <span>${esc(org.address)}</span>
      <span>NIU : ${esc(org.niu)} · RCCM : ${esc(org.rccm)}</span>
      <span>Représenté par : ${esc(org.signatory)}</span>
      <span class="muted">ci-après « l’Organisme »</span>
    </div>
    <div class="party">
      <h3>Le bénéficiaire</h3>
      <strong>${esc(co.raisonSociale)}</strong>
      ${co.adresse ? `<span>${esc(co.adresse)}${co.ville ? ', ' + esc(co.ville) : ''}</span>` : ''}
      <span>NIU : ${esc(co.niu || '—')} · RCCM : ${esc(co.rccm || '—')}</span>
      <span>Représenté par : ${esc(reg.contact.civilite)} ${esc(reg.contact.prenom)} ${esc(reg.contact.nom)}${reg.contact.fonction ? ', ' + esc(reg.contact.fonction) : ''}</span>
      <span class="muted">ci-après « le Client »</span>
    </div>
  </section>

  <article class="articles">
    <h4>Article 1 – Objet</h4>
    <p>La présente convention a pour objet la participation du personnel désigné par le Client au <b>${esc(ev.title)} portant sur la ${esc(ev.subtitle)}</b>, organisé par l’Organisme, formule <b>${esc(f.name)}</b>.</p>

    <h4>Article 2 – Nature et caractéristiques de l’action</h4>
    <p>Dates : <b>${esc(ev.dates)}</b> – Horaires : ${esc(ev.hours)} – Durée : ${esc(ev.duration)}.<br>
    Lieu : <b>${esc(ev.venue)}, ${esc(ev.venueCity)}</b>.<br>
    Objectifs : maîtriser les principales dispositions fiscales et douanières introduites par la Loi de Finances 2027, en mesurer l’impact sur l’entreprise et sécuriser leur mise en œuvre.<br>
    Moyens pédagogiques : exposés d’experts, cas pratiques, échanges, support de cours. Une attestation de participation est remise à chaque participant ayant suivi la formation.</p>

    <h4>Article 3 – Participants</h4>
    <p>Le Client inscrit les ${t.count} participant(s) suivant(s) :</p>
    ${participantsTable(reg, false)}
    <p>Le Client peut remplacer un participant par une autre personne de son organisation jusqu’à la veille de la formation, sans frais, sur simple notification écrite.</p>

    <h4>Article 4 – Prix et modalités de paiement</h4>
    <p>Le prix de la formation s’élève à <b>${money(t.unitHT)} HT</b> par participant, soit pour ${t.count} participant(s) : <b>${money(t.ht)} HT</b>, TVA 19,25 % : ${money(t.tva)}, soit un total de <b>${money(t.ttc)} TTC</b> (${esc(toWords(t.ttc))} francs CFA).<br>
    Le règlement intervient avant le début de la formation, en ligne via Chariow (Mobile Money, carte bancaire) ou par virement bancaire sur le compte de l’Organisme. Mode choisi : <b>${reg.paymentMode === 'virement' ? 'virement bancaire / bon de commande' : 'paiement en ligne Chariow'}</b>.</p>

    <h4>Article 5 – Annulation et report</h4>
    <p>Toute annulation par le Client doit être notifiée par écrit. Annulation reçue plus de 15 jours avant la formation : remboursement intégral, sous déduction de 10 % de frais de dossier. Entre 15 et 7 jours : 50 % du montant reste dû. Moins de 7 jours ou absence : la totalité du montant reste due.<br>
    En cas de force majeure ou d’un nombre insuffisant de participants, l’Organisme se réserve le droit de reporter la formation ; les sommes versées sont alors reportées sur la nouvelle session ou intégralement remboursées, au choix du Client.</p>

    <h4>Article 6 – Propriété intellectuelle et confidentialité</h4>
    <p>Les supports remis restent la propriété de l’Organisme et ne peuvent être reproduits ou diffusés sans son accord écrit. Les parties s’engagent à garder confidentielles les informations échangées dans le cadre de la formation.</p>

    <h4>Article 7 – Données personnelles</h4>
    <p>Les données collectées sont utilisées exclusivement pour la gestion de l’inscription, la facturation et la délivrance des attestations.</p>

    <h4>Article 8 – Règlement des litiges</h4>
    <p>La présente convention est régie par le droit camerounais et les Actes uniformes OHADA. À défaut de règlement amiable, tout litige relèvera de la compétence des juridictions de Douala.</p>
  </article>

  <p class="done-at">Fait à Douala, le ${esc(dateFr(reg.createdAt))}, en deux exemplaires originaux.</p>
  <section class="signs">
    <div><span>Pour le Client</span><small>« Lu et approuvé » – cachet et signature</small>${
      sig.name ? `<em class="esign">Accepté électroniquement par ${esc(sig.name)}<br>le ${esc(new Date(sig.at).toLocaleString('fr-FR', { timeZone: 'Africa/Douala' }))}</em>` : ''
    }</div>
    <div><span>Pour ${esc(org.name)}</span><small>${esc(org.signatory)}</small></div>
  </section>
  ${footer()}`;
  return shell(`Convention CONV-${reg.ref}`, body);
}

function footer() {
  return `<footer class="doc-foot">${esc(org.name)} · ${esc(org.address)} · ${org.phones.map(esc).join(' / ')} · ${esc(org.website.replace(/^https?:\/\//, ''))}</footer>`;
}

module.exports = { devis, contrat, facture };
