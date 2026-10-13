(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DRAFT_KEY = 'lf2027-draft';

  let CFG = null;
  const state = { step: 1, formule: 'premium', qty: 1, participants: [] };

  // ---------- Navigation ----------
  const topbar = $('.topbar');
  const onScroll = () => topbar.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const burger = $('.burger');
  burger.addEventListener('click', () => {
    const open = $('.nav').classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav a').forEach((a) => a.addEventListener('click', () => $('.nav').classList.remove('open')));

  // ---------- Programme tabs ----------
  $$('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
      $$('.timeline').forEach((tl) => (tl.hidden = tl.dataset.day !== t.dataset.day));
    })
  );

  // ---------- Reveal on scroll ----------
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
    { threshold: 0.12 }
  );
  const observe = () => $$('.feature, .speaker, .price-card, .timeline li, .faq details, .audience').forEach((el) => { el.classList.add('reveal'); io.observe(el); });

  // ---------- Countdown ----------
  function countdown(target) {
    const end = new Date(target).getTime();
    const tick = () => {
      let d = Math.max(0, end - Date.now()) / 1000;
      const v = { d: Math.floor(d / 86400), h: Math.floor((d % 86400) / 3600), m: Math.floor((d % 3600) / 60), s: Math.floor(d % 60) };
      for (const k in v) $(`[data-cd="${k}"]`).textContent = String(v[k]).padStart(2, '0');
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------- Render dynamic blocks ----------
  function renderSpeakers() {
    $('#speakers').innerHTML = CFG.speakers
      .map((s) => `<article class="speaker"><div class="name">${esc(s.first)}<b>${esc(s.last)}</b></div><div class="frame"><img src="${esc(s.photo)}" alt="${esc(s.first)} ${esc(s.last)}" loading="lazy"></div></article>`)
      .join('');
  }

  function renderPricing() {
    $('#pricing').innerHTML = CFG.formules
      .map(
        (f) => `<article class="price-card ${f.highlight ? 'highlight' : ''}">
        ${f.highlight ? '<span class="tag">RECOMMANDÉ</span>' : ''}
        <h3>${esc(f.name)}</h3>
        <div class="amount">${fmt(f.priceHT).replace(' FCFA', '')} <small>FCFA HT</small></div>
        <div class="ttc">soit ${fmt(f.priceTTC)} TTC / participant</div>
        <ul>${f.features.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <a href="#inscription" class="btn" data-choose="${f.id}">Choisir ${esc(f.name)}</a>
      </article>`
      )
      .join('');
    $$('[data-choose]').forEach((b) => b.addEventListener('click', () => setFormule(b.dataset.choose)));

    $('#formule-pick').innerHTML = CFG.formules
      .map(
        (f) => `<label class="fp"><input type="radio" name="formule" value="${f.id}"><div><b>${esc(f.name)}</b><span class="p">${fmt(f.priceHT)}</span><small>HT / participant · ${fmt(f.priceTTC)} TTC</small></div></label>`
      )
      .join('');
    $$('input[name="formule"]').forEach((r) => r.addEventListener('change', () => setFormule(r.value)));
  }

  // ---------- Wizard ----------
  const form = $('#wizard');

  function setFormule(id) {
    state.formule = id;
    const r = $(`input[name="formule"][value="${id}"]`);
    if (r) r.checked = true;
    updateSummary();
    saveDraft();
  }

  function setQty(n) {
    state.qty = Math.min(50, Math.max(1, Number(n) || 1));
    $('#qty').value = state.qty;
    renderParticipants();
    updateSummary();
    saveDraft();
  }

  $$('.stepper button').forEach((b) => b.addEventListener('click', () => setQty(state.qty + Number(b.dataset.q))));
  $('#qty').addEventListener('change', (e) => setQty(e.target.value));

  function totals() {
    const f = CFG.formules.find((x) => x.id === state.formule);
    const ht = f.priceHT * state.qty;
    const tva = Math.round(ht * CFG.vatRate);
    return { f, ht, tva, ttc: ht + tva };
  }

  function updateSummary() {
    if (!CFG) return;
    const t = totals();
    $('#s-formule').textContent = t.f.name;
    $('#s-qty').textContent = state.qty;
    $('#s-unit').textContent = fmt(t.f.priceHT);
    $('#s-ht').textContent = fmt(t.ht);
    $('#s-tva').textContent = fmt(t.tva);
    $('#s-ttc').textContent = fmt(t.ttc);
  }

  function collectParticipants() {
    $$('.participant').forEach((el, i) => {
      state.participants[i] = Object.fromEntries($$('[data-k]', el).map((x) => [x.dataset.k, x.value.trim()]));
    });
  }

  function renderParticipants() {
    collectParticipants();
    const box = $('#participants');
    box.innerHTML = Array.from({ length: state.qty }, (_, i) => {
      const p = state.participants[i] || {};
      const v = (k) => esc(p[k] || '');
      return `<div class="participant">
        <h5><span>${i + 1}</span>Participant ${i + 1}</h5>
        <div class="grid-2">
          <div class="field"><label>Civilité</label><select data-k="civilite"><option ${p.civilite === 'M.' ? 'selected' : ''}>M.</option><option ${p.civilite === 'Mme' ? 'selected' : ''}>Mme</option></select></div>
          <div class="field"><label>Prénom *</label><input data-k="prenom" value="${v('prenom')}" required></div>
          <div class="field"><label>Nom *</label><input data-k="nom" value="${v('nom')}" required></div>
          <div class="field"><label>Fonction</label><input data-k="fonction" value="${v('fonction')}"></div>
          <div class="field"><label>Email *</label><input type="email" data-k="email" value="${v('email')}" required></div>
          <div class="field"><label>Téléphone</label><input type="tel" data-k="telephone" value="${v('telephone')}" placeholder="+237"></div>
        </div></div>`;
    }).join('');
    $$('input, select', box).forEach((x) => x.addEventListener('input', () => { collectParticipants(); saveDraft(); }));
  }

  $('#contact-is-participant').addEventListener('change', (e) => {
    if (!e.target.checked) return;
    const c = contact();
    state.participants[0] = { civilite: c.civilite, prenom: c.prenom, nom: c.nom, fonction: c.fonction, email: c.email, telephone: c.telephone };
    const first = $('.participant');
    if (first) $$('[data-k]', first).forEach((x) => (x.value = state.participants[0][x.dataset.k] || ''));
  });

  const val = (name) => (form.elements[name]?.value || '').trim();
  const contact = () => ({
    civilite: val('contact.civilite'), prenom: val('contact.prenom'), nom: val('contact.nom'),
    fonction: val('contact.fonction'), email: val('contact.email'), telephone: val('contact.telephone'),
  });
  const company = () => ({
    type: form.elements.ctype.value, raisonSociale: val('company.raisonSociale'), niu: val('company.niu'), rccm: val('company.rccm'),
    secteur: val('company.secteur'), ville: val('company.ville'), adresse: val('company.adresse'),
  });

  // Particulier : la raison sociale devient optionnelle
  $$('input[name="ctype"]').forEach((r) =>
    r.addEventListener('change', () => {
      const perso = form.elements.ctype.value === 'particulier';
      $$('.company-fields .field').forEach((f, i) => (f.style.display = perso && i > 0 && i < 4 ? 'none' : ''));
      const rs = form.elements['company.raisonSociale'];
      rs.required = !perso;
      rs.previousElementSibling.textContent = perso ? 'Nom complet / structure (facultatif)' : 'Raison sociale *';
    })
  );

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateStep(n) {
    const errs = [];
    const box = $(`.step[data-step="${n}"]`);
    $$('.invalid', box).forEach((x) => x.classList.remove('invalid'));
    $$('input[required]', box).forEach((i) => {
      const bad = i.type === 'checkbox' ? !i.checked : !i.value.trim() || (i.type === 'email' && !EMAIL.test(i.value.trim()));
      if (bad) {
        (i.type === 'checkbox' ? i.closest('.check') : i).classList.add('invalid');
        errs.push(i);
      }
    });
    if (n === 2) {
      const tel = form.elements['contact.telephone'];
      if (tel.value.replace(/\D/g, '').length < 8) { tel.classList.add('invalid'); errs.push(tel); }
    }
    if (n === 3) {
      const emails = $$('[data-k="email"]').map((x) => x.value.trim().toLowerCase());
      const dups = $$('[data-k="email"]').filter((x, i) => emails[i] && emails.indexOf(emails[i]) !== i);
      if (!errs.length && dups.length) {
        dups.forEach((x) => x.classList.add('invalid'));
        dups[0].focus();
        return showError('Chaque participant doit avoir une adresse email distincte (elle sert au paiement individuel).'), false;
      }
    }
    if (errs.length) {
      showError('Merci de compléter les champs signalés.');
      errs[0].focus();
      return false;
    }
    showError('');
    return true;
  }
  function showError(m) { $('#form-error').textContent = m; }

  function goto(n) {
    state.step = n;
    $$('.step').forEach((s) => s.classList.toggle('active', Number(s.dataset.step) === n));
    $$('#steps li').forEach((li, i) => { li.classList.toggle('active', i + 1 === n); li.classList.toggle('done', i + 1 < n); });
    $('#prev').hidden = n === 1;
    $('#next').hidden = n === 4;
    $('#submit').hidden = n !== 4;
    if (n === 4) renderRecap();
    const top = $('#inscription').getBoundingClientRect().top + scrollY - 70;
    if (scrollY > top + 200) scrollTo({ top, behavior: 'smooth' });
  }
  $('#next').addEventListener('click', () => validateStep(state.step) && goto(state.step + 1));
  $('#prev').addEventListener('click', () => goto(state.step - 1));
  $$('#steps li').forEach((li, i) => li.addEventListener('click', () => { if (i + 1 < state.step) goto(i + 1); }));

  function renderRecap() {
    collectParticipants();
    const t = totals();
    const co = company();
    const c = contact();
    $('#recap').innerHTML = `<div class="recap">
      <div><span>Formule</span><b>${esc(t.f.name)} × ${state.qty}</b></div>
      <div><span>Organisation</span><b>${esc(co.raisonSociale || 'Particulier')}</b></div>
      <div><span>Contact</span><b>${esc(c.prenom)} ${esc(c.nom)} · ${esc(c.email)}</b></div>
      <div><span>Participants</span><b>${state.participants.slice(0, state.qty).map((p) => esc(`${p.prenom} ${p.nom}`)).join(', ')}</b></div>
      <div><span>Total TTC</span><b>${fmt(t.ttc)}</b></div></div>`;
    if (!form.elements.signName.value) form.elements.signName.value = `${c.prenom} ${c.nom}`.trim();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(4)) return;
    const btn = $('#submit');
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';
    collectParticipants();
    const payload = {
      formule: state.formule,
      company: company(),
      contact: contact(),
      participants: state.participants.slice(0, state.qty),
      paymentMode: form.elements.paymentMode.value,
      acceptTerms: form.elements.acceptTerms.checked,
      signName: val('signName'),
    };
    try {
      const r = await fetch('/api/inscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Une erreur est survenue.');
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      location.href = j.url;
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'Valider mon inscription';
    }
  });

  // ---------- Brouillon local ----------
  function saveDraft() {
    try {
      const fields = Object.fromEntries($$('input[name^="company."], input[name^="contact."], select[name^="contact."]').map((x) => [x.name, x.value]));
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ formule: state.formule, qty: state.qty, participants: state.participants, fields }));
    } catch {}
  }
  function loadDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (!d) return;
      state.participants = d.participants || [];
      Object.entries(d.fields || {}).forEach(([k, v]) => form.elements[k] && (form.elements[k].value = v));
      if (CFG.formules.some((f) => f.id === d.formule)) state.formule = d.formule;
      state.qty = d.qty || 1;
    } catch {}
  }
  form.addEventListener('input', (e) => { if (e.target.name) saveDraft(); });

  // ---------- Init ----------
  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      CFG = cfg;
      renderSpeakers();
      renderPricing();
      loadDraft();
      setFormule(state.formule);
      setQty(state.qty);
      countdown(cfg.event.startDate);
      observe();
    })
    .catch(() => showError('Impossible de charger la configuration. Rechargez la page.'));
})();
