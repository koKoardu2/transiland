'use strict';
const fs = require('fs');
const path = require('path');

// Chargement minimal d'un fichier .env (sans dépendance)
(function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

const env = process.env;

const config = {
  port: Number(env.PORT) || 3000,
  publicUrl: (env.PUBLIC_URL || `http://localhost:${Number(env.PORT) || 3000}`).replace(/\/$/, ''),

  chariow: {
    apiKey: env.CHARIOW_API_KEY || '',
    apiUrl: (env.CHARIOW_API_URL || 'https://api.chariow.com/v1').replace(/\/$/, ''),
    pulseSecret: env.CHARIOW_PULSE_SECRET || '',
    mode: env.CHARIOW_MODE || (env.CHARIOW_API_KEY ? 'live' : 'mock'),
    products: {
      standard: env.CHARIOW_PRODUCT_STANDARD || '',
      premium: env.CHARIOW_PRODUCT_PREMIUM || '',
    },
  },

  admin: {
    user: env.ADMIN_USER || 'admin',
    password: env.ADMIN_PASSWORD || '',
  },

  // TVA au Cameroun : 17,5 % + 10 % de CAC = 19,25 %
  vatRate: 0.1925,
  currency: 'XAF',

  organizer: {
    name: 'EB-PARTNERS GROUP',
    tagline: 'Conseil juridique, fiscal & formation',
    city: 'Douala',
    country: 'Cameroun',
    address: env.ORG_ADDRESS || 'Douala, Cameroun',
    niu: env.ORG_NIU || '—',
    rccm: env.ORG_RCCM || '—',
    emails: ['cenyegue@eb-partnersgroup.cm', 'ehagbe@eb-partnersgroup.cm'],
    phones: ['+237 699 059 453', '+237 655 589 506'],
    website: 'https://www.eb-partnersgroup.cm',
    signatory: env.ORG_SIGNATORY || 'La Direction Générale',
    bank: {
      name: env.ORG_BANK_NAME || '— à compléter —',
      holder: 'EB-PARTNERS GROUP',
      iban: env.ORG_BANK_ACCOUNT || '— à compléter —',
      swift: env.ORG_BANK_SWIFT || '—',
    },
  },

  event: {
    code: 'LF2027',
    title: 'Séminaire de formation',
    subtitle: 'Loi de Finances pour l’exercice 2027',
    dates: '21 & 22 janvier 2027',
    startDate: '2027-01-21T08:00:00+01:00',
    endDate: '2027-01-22T17:30:00+01:00',
    duration: '2 jours (16 heures)',
    hours: '08h00 – 17h30',
    venue: 'Hôtel Akwa Palace',
    venueCity: 'Douala – Cameroun',
    registrationDeadline: '2027-01-14',
  },

  speakers: [
    { first: 'Emile', last: 'Bitoungui', photo: '/assets/speaker-bitoungui.jpg' },
    { first: 'Ashley', last: 'Elang', photo: '/assets/speaker-elang.jpg' },
    { first: 'Samson', last: 'Bilangna', photo: '/assets/speaker-bilangna.jpg' },
    { first: 'Alvine', last: 'Oum', photo: '/assets/speaker-oum.jpg' },
  ],

  // Tarifs HT par participant (FCFA) — à ajuster. Le prix TTC du produit Chariow doit correspondre.
  formules: [
    {
      id: 'standard',
      name: 'Standard',
      priceHT: Number(env.PRICE_STANDARD_HT) || 250000,
      features: [
        'Accès aux 2 jours de formation',
        'Support de cours imprimé',
        'Pauses-café & déjeuners',
        'Attestation de participation',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      highlight: true,
      priceHT: Number(env.PRICE_PREMIUM_HT) || 350000,
      features: [
        'Tout le contenu Standard',
        'Recueil commenté de la LF 2027',
        'Supports numériques & modèles pratiques',
        'Session questions-réponses privée',
        'Places réservées aux premiers rangs',
      ],
    },
  ],
};

config.formuleById = (id) => config.formules.find((f) => f.id === id);

module.exports = config;
