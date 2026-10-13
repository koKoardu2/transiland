# Plateforme d’inscription – Séminaire Loi de Finances 2027

**EB-PARTNERS GROUP** · 21 & 22 janvier 2027 · Hôtel Akwa Palace, Douala

Plateforme de souscription en ligne : présentation du séminaire, formulaire d’inscription en 4 étapes, **paiement Chariow** (MTN MoMo, Orange Money, carte), **devis, convention de formation et facture imprimables** (A4 / PDF), et back-office.

## Démarrage

Pré-requis : Node.js ≥ 18. Aucune dépendance npm.

```bash
cd eb-seminaire-lf2027
cp .env.example .env      # puis renseigner les valeurs
npm start                 # http://localhost:3000
npm run dev               # mode simulation de paiement, admin : admin / demo
npm test
```

## Fonctionnalités

| Page | Rôle |
|---|---|
| `/` | Site de l’événement : hero « Save the Date », programme, intervenants, tarifs, FAQ, formulaire d’inscription |
| `/dossier/:ref?t=…` | Espace client : statut, paiement par participant, documents |
| `/devis/:ref?t=…` | Devis imprimable (montant en lettres, TVA 19,25 %) |
| `/contrat/:ref?t=…` | Convention de formation professionnelle (8 articles, signature électronique) |
| `/facture/:ref?t=…` | Facture, tampon « PAYÉ » une fois réglée |
| `/admin` | Back-office (authentification basique) : KPI, marquer payé, annuler, export CSV |

Chaque dossier est protégé par un jeton secret contenu dans son lien.

## Configuration Chariow

1. **Clé API** : Chariow › Paramètres › Développeur › Clés API → `CHARIOW_API_KEY` dans `.env` (jamais dans le code ni dans Git).
2. **Produits** : créer un produit par formule dont le prix = **prix TTC par participant** affiché sur la plateforme (par défaut Standard 298 125 FCFA, Premium 417 375 FCFA). Renseigner `CHARIOW_PRODUCT_STANDARD` et `CHARIOW_PRODUCT_PREMIUM`.
3. **Pulse (webhook)** : Automatisations › Pulses → URL `https://<votre-domaine>/api/webhooks/chariow`, événement `successful.sale`. Copier le secret `whsec_…` dans `CHARIOW_PULSE_SECRET`.
4. `PUBLIC_URL` doit être l’URL publique HTTPS (sert à la redirection après paiement).

Flux : `POST /v1/checkout` (un checkout par participant, avec `redirect_url` et `custom_metadata.reference`) → redirection vers la page de paiement Chariow → retour sur le dossier (vérification `GET /v1/sales/{id}`) et confirmation par Pulse signé HMAC-SHA256.

Pour tester sans paiement réel : `CHARIOW_MODE=mock`.

## Personnalisation

`lib/config.js` (ou variables d’environnement) : tarifs (`PRICE_STANDARD_HT`, `PRICE_PREMIUM_HT`), NIU/RCCM (`ORG_NIU`, `ORG_RCCM`), adresse, coordonnées bancaires (`ORG_BANK_*`), signataire, programme, intervenants.

> Le programme et les clauses de la convention sont des modèles à valider par EB-Partners Group.

## Structure

```
server.js            serveur HTTP + routes
lib/config.js        événement, tarifs, organisateur
lib/chariow.js       intégration API Chariow + vérification des Pulses
lib/documents.js     devis, convention, facture
lib/pages.js         dossier client, simulation, back-office
lib/store.js         stockage JSON (data/registrations.json)
public/              site (HTML/CSS/JS) et visuels
```

Les inscriptions sont stockées dans `data/registrations.json` : à sauvegarder régulièrement (ou à remplacer par une base de données en production).
