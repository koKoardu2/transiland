# CLAUDE.md — TRANSILAND SA Website

This file provides context and guidance for AI assistants (Claude) working on this repository.

---

## Project Overview

**TRANSILAND SA** is a corporate marketing website for an international freight and logistics company based in Douala, Cameroon. The site is written entirely in French.

- **Type**: Static single-page website (no build step, no backend)
- **Language**: French (`lang="fr"`)
- **Single file**: Everything lives in `index.html` (2,111 lines)

---

## Repository Structure

```
transiland/
└── index.html   # The entire website (HTML + embedded CSS + embedded JS)
```

There are no separate CSS, JS, or asset files. No `package.json`, no `node_modules`, no build tooling.

---

## Technology Stack

### Loaded via CDN (no local install needed)

| Library | Version | Purpose |
|---|---|---|
| jQuery | 3.6.0 | DOM manipulation, event handling |
| AOS (Animate On Scroll) | 2.3.1 | Scroll-triggered animations |
| Font Awesome | 6.4.0 | Icons |
| Google Fonts (Poppins) | — | Typography |

### Images

All images are loaded from **Unsplash** (external). The company logo and favicon come from an external CDN.

---

## File Structure Inside `index.html`

```
<html lang="fr">
  <head>
    <!-- Meta tags, Open Graph, Google Fonts, Font Awesome, AOS CSS -->
    <style>
      <!-- All custom CSS (~600-700 lines) -->
    </style>
  </head>
  <body>
    <!-- Custom cursor elements -->
    <!-- Page loader / progress bar -->
    <header>  <!-- Fixed sticky navigation with hamburger menu -->

    <!-- Sections (in order): -->
    #home          — Hero / landing area
    #services      — 4 services (maritime, air, customs, storage)
    #about         — Company history and differentiators
    (stats)        — Animated counters for key metrics
    #tracking      — Shipment tracking form
    #blog          — 3 blog post cards
    (testimonials) — Customer reviews carousel
    #contact       — Contact form with validation
    (map)          — Embedded location map
    (newsletter)   — Email subscription form
    (partners)     — Infinite-scroll partner logo carousel
    (cta)          — Call-to-action banner
    <footer>       — Links, company info, social icons

    <!-- Scripts: jQuery, AOS init, inline JS (~150-200 lines) -->
  </body>
</html>
```

---

## Design System

### CSS Variables (defined in `:root`)

```css
--primary-blue:   #003366
--light-blue:     #0066cc
--medium-blue:    #004080
--dark-blue:      #002244
--accent-yellow:  #ffcc00
--light-yellow:   #ffdd66
--white:          #ffffff
--dark-gray:      #333333
```

Always use these variables rather than hardcoding color values.

### Layout

- Container max-width: **1200px**, centered with `margin: auto`
- Responsive breakpoints via CSS `@media` queries (mobile-first)
- Layout uses **CSS Flexbox** and **CSS Grid**
- Responsive hamburger menu for mobile

### Typography

- Font family: **Poppins** (Google Fonts) — weights 300, 400, 500, 600, 700

### Animations

- Scroll animations use **AOS** attributes (`data-aos`, `data-aos-delay`, `data-aos-duration`)
- CSS keyframe animations: `spin`, `fade-in-up`, `pulse`
- Dark mode toggle implemented via CSS class switching

---

## Key JavaScript Features

All JS is embedded at the bottom of `index.html` inside a `<script>` tag:

- **Sticky header**: changes style on scroll
- **Mobile menu**: hamburger toggle
- **Smooth scroll**: anchor link navigation
- **Custom cursor**: follows mouse pointer
- **Progress bar**: page load indicator
- **Scroll-to-top button**: appears after scrolling down
- **AOS init**: `AOS.init({ ... })`
- **Counter animations**: increment numbers when stats section enters viewport
- **Partner carousel**: infinite CSS-based scroll
- **Form handling**: client-side validation for contact and tracking forms
- **Newsletter subscription**: client-side only (no backend)

---

## Development Workflow

### Editing the site

Since there is no build process, editing is straightforward:

1. Open `index.html` in your editor
2. Make changes directly to the HTML, `<style>`, or `<script>` sections
3. Open `index.html` in a browser to preview (or use a local dev server like `python3 -m http.server`)

### Serving locally

```bash
# Python (no install needed)
python3 -m http.server 8080

# Node (if installed)
npx serve .
```

Then open `http://localhost:8080` in a browser.

### No build, lint, or test commands exist.

---

## Conventions for AI Assistants

### Making changes

- **Never split the file** into separate CSS/JS files unless the user explicitly requests a refactor. Keep everything in `index.html`.
- **Preserve the French language** throughout — all UI text must remain in French.
- **Use CSS variables** for colors; do not hardcode hex values.
- **Match the existing code style**: 2-space indentation, consistent BEM-like class names (e.g., `section-header`, `btn-primary`).
- **Do not add new CDN dependencies** without user approval — keep the dependency list minimal.

### Adding sections

- Follow the existing section pattern:
  ```html
  <section id="section-name" class="section-name-section">
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <h2>Title</h2>
        <p>Subtitle</p>
      </div>
      <!-- Content -->
    </div>
  </section>
  ```
- Add `data-aos` attributes for scroll animations on new content blocks.
- Update the `<nav>` links if a new navigable section is added.

### Forms

- Forms are currently **client-side only** (no backend endpoint).
- Form validation is done in the inline `<script>` using jQuery.
- If adding a real backend, a new JS file or fetch/XHR call should be added.

### Images

- Images are currently loaded from Unsplash URLs. If replacing with local images, place them in an `assets/images/` directory and update `src` attributes accordingly.

---

## Git Workflow

- **Main branch**: `master`
- **Development branches**: follow the pattern `claude/<task-id>`
- Commit messages should be descriptive and in English.
- Push with: `git push -u origin <branch-name>`

---

## Known Limitations / Future Improvements

- No accessibility audit has been performed (ARIA roles, keyboard navigation could be improved).
- Forms do not submit data anywhere — backend integration is pending.
- Images rely on external Unsplash URLs which may change or become unavailable.
- No favicon served locally (uses external CDN).
- No analytics or SEO meta tags beyond basic Open Graph.
