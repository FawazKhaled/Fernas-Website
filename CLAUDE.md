# CLAUDE.md

Guidance for Claude when working on the Fernas website. Read this before changing anything.

## What this is

A static, multi-page site for Fernas, a student-founded venture studio in Dhahran, Saudi Arabia. It is hosted on GitHub Pages at fernasteam.com (see `CNAME`). It is plain HTML, CSS, and JavaScript: no framework, no package manager, no build step.

## Hard rules for this folder

- **Keep the folder clean.** The only things allowed at the root are the eight HTML pages, `assets/`, `CNAME`, `_config.yml`, `robots.txt`, `sitemap.xml`, `README.md`, and this file. Do not add other folders or tooling files.
- **No `.claude/` folder in this project.** Do not create `.claude/launch.json`, `.claude/settings.json`, or anything else under `.claude/` here.
- **No git worktrees.** Work directly in this folder.
- **No build step or dependencies.** Do not add npm, a bundler, a framework, or CDN scripts. If generating repetitive HTML would help, run the generator from the session scratchpad and commit only its output.
- **Assets live flat in `assets/`.** No subfolders. Name files in kebab case by purpose, for example `team-yasr.webp` or `poster-laptop.jpg`.

To preview, serve the folder from the shell (`python -m http.server 8765 --directory <this folder>`) and open the URL in the browser pane. That writes nothing into the project.

## Structure

- Pages: `index.html`, `about.html`, `projects.html`, `team.html`, `contact.html`, `terms.html`, `privacy.html`, `404.html`.
- `assets/site.css` is the only stylesheet. `assets/site.js` is the only script.
- The `<head>`, header, CTA band, and footer are duplicated in every page. When you change one, change it in all pages that have it. The CTA band is left out of `contact.html` and `404.html`.
- `404.html` uses root-absolute paths (`/assets/...`, `/about.html`) because GitHub Pages serves it at any depth. Every other page uses relative paths so the site also works when opened from disk.
- `fernas-mobile.html` no longer exists. The site is responsive, and `404.html` redirects that old URL to `/`.

## Design system

All values come from tokens at the top of `assets/site.css`. Use a token; never hard-code a new value.

- **Spacing:** 8pt scale with a 4pt half-step: `--space-1` (4px) to `--space-12` (128px). No other margins, paddings, or gaps. The only exception is the comic pages (`.cp`), which use `em` so they scale with the page.
- **Type roles:**
  - Sora 800 for headings: `.display` (page h1), `.h2`, `.h3`.
  - Plus Jakarta Sans for body text: `.lead`, `.body-text`, `.small-text`.
  - IBM Plex Mono 600, uppercase, `0.16em` tracking for labels, buttons, nav, and tags. Only the 600 weight is loaded, so never ask for 700.
  - VT323 only in the Team dialogue. Aref Ruqaa only for the Arabic logotype.
- **Type ramp:** `--fs-display`, `--fs-h2`, `--fs-h3`, `--fs-lead`, `--fs-body` (16), `--fs-small` (14), `--fs-label` (12), `--fs-micro` (11). Nothing smaller than 11px.
- **Color:** ink `#14120F`, paper `#E2D3B4` (page background), cream `#EBDFC5`, card `#F4EBD9`, green `#416B4A` (brand). Small green text on light surfaces uses `--green-text` (`#37603F`) for AA contrast. `--mint` is for text on ink only. Never put green text on ink. Check that any new pairing reaches 4.5:1.
- **Shape:** square corners everywhere. The only round elements are the comic `#13` burst, the video play button, and the spinner. Borders are `var(--border)` (2px ink).
- **Elevation:** hard offset shadows only: `--shadow-sm` (4px) for buttons and chips, `--shadow-md` (8px) for cards, `--shadow-lg` (16px) for hero features. No blurred shadows.
- **Components:** reuse `.btn` (`--primary`, `--secondary`, `--outline-light`, `--sm`), `.icon-btn`, `.card` (`--cream`, `--dark`), `.tag`, `.chip`, `.meta`, `.eyebrow`, `.text-link`, `.link`, `.framed`, `.field`. Do not create a near-duplicate.
- **Section rhythm:** each page opens with a `.hero` section, then alternates `.section--cream` and `.section--paper`. Heroes use the `.section--grid` graph-paper background.

## Motion and interaction

- Hover: buttons move `-2px, -2px` and the shadow grows to 6px. Nothing scales, and nothing moves more than that.
- Scroll reveal: add `data-reveal` to a section's content blocks. Do not put it on hero content.
- Images that load lazily get `data-fade` so they fade in instead of popping.
- Everything respects `prefers-reduced-motion`.
- No scroll hijacking, no cursor-driven tilt or parallax, and no autoplaying sound. Team sound is off until the visitor turns it on.
- Anything async needs a visible state. The contact form button shows a spinner and "Sending…", and errors appear inline with an email fallback.

## JavaScript conventions

- One IIFE in `site.js`. Each module (`initMenu`, `initComic`, `initCarousel`, `initTeam`, `initContact`, `initReveal`) finds its own markup and returns early if the page doesn't have it.
- Progressive enhancement: every page must be readable and usable with JavaScript off. CSS gates enhanced layouts behind `.js` (set inline in `<head>`), `.is-ready`, or `.reveal-ready`.
- For buttons that can't act right now, set `aria-disabled="true"` rather than `disabled`, so keyboard focus is never lost.
- No dependencies.

## Checklist for any new or changed page

- `<html lang="en">`, a `<title>` in the form `Page · Fernas`, and a unique meta description of 160 characters or fewer.
- Canonical URL, Open Graph and Twitter tags, the three favicon links, font preloads, and `site.css` and `site.js`: copy the `<head>` from an existing page.
- Skip link, exactly one `<h1>`, and headings that don't skip levels.
- Every `<img>` has `alt` (empty only when decorative), `width`, and `height`. Use `loading="lazy"` below the first screen.
- External links use `target="_blank" rel="noopener"` and say they open in a new tab.
- Add the page to `sitemap.xml` and to the footer's Pages list.
- Check it at 375px and 1280px wide with no horizontal scroll.

## Content rules

- Write specific, plain copy about what Fernas actually does. No filler slogans, invented stats, or made-up testimonials.
- People's names are spelled as they appear on `team.html`, for example "Abdalaziz Bin Asraj".
- The contact form posts to FormSubmit for `contact@fernasteam.com`. **Never submit a test message to the real endpoint.** To test the form, stub `fetch` in the browser console.
