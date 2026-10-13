'use strict';
const config = require('./config');
const { esc, money, dateFr } = require('./format');

const STATUS = {
  en_attente: ['En attente de paiement', 'warn'],
  partiel: ['Partiellement réglé', 'info'],
  paye: ['Inscription confirmée', 'ok'],
  annule: ['Annulé', 'muted'],
};

function layout(title, body, { bodyClass = '' } = {}) {
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · LF 2027 · EB-Partners Group</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css">
</head><body class="inner ${bodyClass}">
<header class="topbar solid">
  <a href="/" class="brand"><img src="/assets/logo-eb.jpg" alt="EB-Partners Group"><span class="sep"></span><img src="/assets/logo-lf2027.jpg" alt="LF 2027"></a>
  <nav><a href="/#programme">Programme</a><a href="/#tarifs">Tarifs</a><a href="/#inscription" class="btn btn-sm">S’inscrire</a></nav>
</header>
<main class="page">${body}</main>
<footer class="foot-mini">© ${new Date().getFullYear()} ${esc(config.organizer.name)} · ${config.organizer.phones.map(esc).join(' · ')}</footer>
</body></html>`;
}

function dossier(reg, { flash } = {}) {
  const f = config.formuleById(reg.formule);
  const [label, tone] = STATUS[reg.status] || STATUS.en_attente;
  const q = `?t=${reg.token}`;
  const unpaid = reg.participants.filter((p) => p.paymentStatus !== 'paid').length;
  const body = `
  <section class="dossier">
    ${flash ? `<div class="flash ${esc(flash.tone)}">${esc(flash.text)}</div>` : ''}
    <div class="dossier-head">
      <div>
        <span class="eyebrow">Votre dossier d’inscription</span>
        <h1>${esc(reg.ref)}</h1>
        <p class="lead">${esc(reg.company.raisonSociale)} · Formule <b>${esc(f.name)}</b> · ${reg.participants.length} participant(s)</p>
      </div>
      <span class="badge ${tone}">${label}</span>
    </div>

    <div class="dossier-grid">
      <div class="card">
        <h3>Participants & paiements</h3>
        <ul class="plist">
          ${reg.participants
            .map(
              (p, i) => `<li>
            <div class="avatar">${esc((p.prenom[0] || '') + (p.nom[0] || '')).toUpperCase()}</div>
            <div class="who"><b>${esc(p.civilite)} ${esc(p.prenom)} ${esc(p.nom)}</b><small>${[p.fonction, p.email].filter(Boolean).map(esc).join(' · ')}</small></div>
            ${
              p.paymentStatus === 'paid'
                ? '<span class="badge ok">Réglé</span>'
                : reg.paymentMode === 'virement'
                ? '<span class="badge warn">Virement attendu</span>'
                : `<button class="btn btn-sm pay" data-i="${i}">Payer ${money(reg.totals.unitTTC)}</button>`
            }
          </li>`
            )
            .join('')}
        </ul>
        ${
          reg.paymentMode === 'chariow' && unpaid
            ? `<p class="hint">Paiement sécurisé par <b>Chariow</b> : MTN Mobile Money, Orange Money ou carte bancaire. Chaque place est réglée individuellement ; le reçu est envoyé à l’adresse email du participant.</p>`
            : ''
        }
        ${
          reg.paymentMode === 'virement' && unpaid
            ? `<p class="hint">Merci d’effectuer le virement de <b>${money(reg.totals.ttc)}</b> en rappelant la référence <b>${esc(reg.ref)}</b>, puis d’envoyer le devis signé à ${esc(config.organizer.emails[0])}. <br>Vous préférez finalement payer en ligne ? <button class="link-btn" id="switch-chariow">Passer au paiement Chariow</button></p>`
            : ''
        }
      </div>

      <aside class="card docs">
        <h3>Documents</h3>
        <a class="doc-link" href="/devis/${esc(reg.ref)}${q}" target="_blank"><span class="ico">₣</span><span><b>Devis</b><small>DEV-${esc(reg.ref)}</small></span></a>
        <a class="doc-link" href="/contrat/${esc(reg.ref)}${q}" target="_blank"><span class="ico">§</span><span><b>Convention de formation</b><small>CONV-${esc(reg.ref)}</small></span></a>
        <a class="doc-link" href="/facture/${esc(reg.ref)}${q}" target="_blank"><span class="ico">✓</span><span><b>${reg.status === 'paye' ? 'Facture acquittée' : 'Facture'}</b><small>FAC-${esc(reg.ref)}</small></span></a>
        <div class="sum">
          <div><span>Total HT</span><b>${money(reg.totals.ht)}</b></div>
          <div><span>TVA 19,25 %</span><b>${money(reg.totals.tva)}</b></div>
          <div class="grand"><span>Total TTC</span><b>${money(reg.totals.ttc)}</b></div>
        </div>
        <p class="hint small">Conservez ce lien : il donne accès à votre dossier.<br><input class="copy-link" readonly value="${esc(config.publicUrl)}/dossier/${esc(reg.ref)}${q}" onclick="this.select()"></p>
      </aside>
    </div>

    <div class="card event-recap">
      <div><span class="eyebrow">Quand</span><b>${esc(config.event.dates)}</b><small>${esc(config.event.hours)}</small></div>
      <div><span class="eyebrow">Où</span><b>${esc(config.event.venue)}</b><small>${esc(config.event.venueCity)}</small></div>
      <div><span class="eyebrow">Contact</span><b>${config.organizer.phones.map(esc).join('<br>')}</b></div>
    </div>
  </section>
  <script>
  const REF=${JSON.stringify(reg.ref)}, TOKEN=${JSON.stringify(reg.token)};
  document.querySelectorAll('.pay').forEach(b=>b.addEventListener('click',async()=>{
    b.disabled=true;const t=b.textContent;b.textContent='Redirection…';
    try{const r=await fetch('/api/paiement/'+REF+'/'+b.dataset.i+'?t='+TOKEN,{method:'POST'});const j=await r.json();
      if(!r.ok)throw new Error(j.error||'Erreur');
      if(j.completed){location.reload();return;}
      location.href=j.checkoutUrl;}
    catch(e){alert(e.message);b.disabled=false;b.textContent=t;}
  }));
  const sw=document.getElementById('switch-chariow');
  if(sw)sw.addEventListener('click',async()=>{const r=await fetch('/api/dossier/'+REF+'/mode?t='+TOKEN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'chariow'})});if(r.ok)location.reload();});
  </script>`;
  return layout(`Dossier ${reg.ref}`, body);
}

function simulation(reg, i) {
  const p = reg.participants[i];
  const body = `
  <section class="sim card">
    <span class="badge info">Mode simulation – aucun débit réel</span>
    <h1>Paiement Chariow</h1>
    <p>${esc(p.prenom)} ${esc(p.nom)} · ${esc(reg.ref)}</p>
    <div class="sim-amount">${money(reg.totals.unitTTC)}</div>
    <form method="post" action="/paiement/simulation?ref=${esc(reg.ref)}&i=${i}&t=${esc(reg.token)}">
      <button class="btn" name="result" value="success">Simuler un paiement réussi</button>
      <button class="btn ghost" name="result" value="fail">Simuler un échec</button>
    </form>
    <p class="hint small">Renseignez CHARIOW_API_KEY et CHARIOW_MODE=live pour activer les paiements réels.</p>
  </section>`;
  return layout('Simulation de paiement', body);
}

function message(title, text, tone = 'info') {
  return layout(title, `<section class="sim card"><span class="badge ${tone}">${esc(title)}</span><p>${esc(text)}</p><a class="btn" href="/">Retour à l’accueil</a></section>`);
}

function admin(regs) {
  const totalSeats = regs.reduce((s, r) => s + (r.status === 'annule' ? 0 : r.participants.length), 0);
  const paidSeats = regs.reduce((s, r) => s + r.participants.filter((p) => p.paymentStatus === 'paid').length, 0);
  const cashed = regs.reduce((s, r) => s + r.participants.filter((p) => p.paymentStatus === 'paid').length * r.totals.unitTTC, 0);
  const pipeline = regs.reduce((s, r) => s + (r.status === 'annule' ? 0 : r.totals.ttc), 0);
  const rows = regs
    .slice()
    .reverse()
    .map((r) => {
      const [label, tone] = STATUS[r.status] || STATUS.en_attente;
      const q = `?t=${r.token}`;
      return `<tr>
      <td><b>${esc(r.ref)}</b><small>${esc(dateFr(r.createdAt))}</small></td>
      <td>${esc(r.company.raisonSociale)}<small>${esc(r.contact.prenom)} ${esc(r.contact.nom)} · ${esc(r.contact.telephone)}</small></td>
      <td>${esc(config.formuleById(r.formule).name)}</td>
      <td>${r.participants.filter((p) => p.paymentStatus === 'paid').length}/${r.participants.length}</td>
      <td>${r.paymentMode === 'virement' ? 'Virement' : 'Chariow'}</td>
      <td class="num">${money(r.totals.ttc)}</td>
      <td><span class="badge ${tone}">${label}</span></td>
      <td class="actions">
        <a href="/dossier/${esc(r.ref)}${q}" target="_blank">Dossier</a>
        <a href="/devis/${esc(r.ref)}${q}" target="_blank">Devis</a>
        <a href="/contrat/${esc(r.ref)}${q}" target="_blank">Contrat</a>
        ${r.status !== 'paye' && r.status !== 'annule' ? `<form method="post" action="/admin/${esc(r.ref)}/paid"><button>Marquer payé</button></form>` : ''}
        ${r.status !== 'annule' ? `<form method="post" action="/admin/${esc(r.ref)}/cancel" onsubmit="return confirm('Annuler ce dossier ?')"><button class="danger">Annuler</button></form>` : ''}
      </td></tr>`;
    })
    .join('');
  const body = `
  <section class="admin">
    <div class="dossier-head"><div><span class="eyebrow">Back-office</span><h1>Inscriptions LF 2027</h1></div><a class="btn" href="/admin/export.csv">Exporter CSV</a></div>
    <div class="kpis">
      <div class="card"><span>Dossiers</span><b>${regs.length}</b></div>
      <div class="card"><span>Places réservées</span><b>${totalSeats}</b></div>
      <div class="card"><span>Places payées</span><b>${paidSeats}</b></div>
      <div class="card"><span>Encaissé</span><b>${money(cashed)}</b><small>sur ${money(pipeline)} TTC</small></div>
    </div>
    <div class="card table-wrap"><table class="admin-table">
      <thead><tr><th>Réf.</th><th>Entreprise</th><th>Formule</th><th>Payés</th><th>Mode</th><th class="num">TTC</th><th>Statut</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" class="empty">Aucune inscription pour le moment.</td></tr>'}</tbody>
    </table></div>
  </section>`;
  return layout('Back-office', body, { bodyClass: 'wide' });
}

module.exports = { dossier, simulation, message, admin };
