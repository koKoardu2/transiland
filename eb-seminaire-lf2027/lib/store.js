'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(__dirname, '..', 'data', 'registrations.json');

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    cache = [];
  }
  return cache;
}

function persist() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, FILE);
}

function newRef() {
  const all = load();
  let ref;
  do {
    ref = 'LF27-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  } while (all.some((r) => r.ref === ref));
  return ref;
}

function all() {
  return load();
}

function get(ref) {
  return load().find((r) => r.ref === ref) || null;
}

function create(data) {
  const reg = {
    ...data,
    ref: newRef(),
    token: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toISOString(),
    history: [{ at: new Date().toISOString(), event: 'Inscription créée' }],
  };
  load().push(reg);
  persist();
  return reg;
}

function update(ref, fn) {
  const reg = get(ref);
  if (!reg) return null;
  fn(reg);
  reg.updatedAt = new Date().toISOString();
  refreshStatus(reg);
  persist();
  return reg;
}

function refreshStatus(reg) {
  if (reg.status === 'annule') return;
  const paid = reg.participants.filter((p) => p.paymentStatus === 'paid').length;
  reg.status = paid === 0 ? 'en_attente' : paid < reg.participants.length ? 'partiel' : 'paye';
}

module.exports = { all, get, create, update, refreshStatus };
