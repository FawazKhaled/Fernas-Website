# Fernas Website

The website for [Fernas](https://fernasteam.com), a student-founded venture studio in Dhahran, Saudi Arabia. Fernas turns students' ideas into real projects, built by our own teams and backed by our own funding.

The site is plain HTML, CSS, and JavaScript. There is no frontend framework or JavaScript build step. GitHub Pages processes the page permalinks and redirects so clean URLs work while old `.html` links continue to redirect.

## Pages

| File | URL | What it shows |
| --- | --- | --- |
| `index.html` | `/` | Hero, how it works, and the latest news as a flip-through comic |
| `about.html` | `/about` | The story behind the name, our four principles, and the mascot |
| `projects.html` | `/projects` | Scalendars, LinkU, MenaBonka, and KFUPM Masar |
| `team.html` | `/team` | The six co-founders, introduced by the FERNAS mascot |
| `contact.html` | `/contact` | The "Send an idea" form |
| `terms.html` | `/terms` | Terms of Service |
| `privacy.html` | `/privacy` | Privacy Policy |
| `404.html` | any missing page | Not-found page (GitHub Pages serves it automatically) |

Each project has its own anchor, so `/projects#masar` opens on KFUPM Masar. The anchors are `#scalendars`, `#linku`, `#menabonka`, and `#masar`.

## Folder layout

```
Fernas-Website-main/
├── index.html, about.html, projects.html, team.html, contact.html, terms.html, privacy.html, 404.html
├── assets/          every stylesheet, script, font, image, and video
│   ├── site.css     the one stylesheet, design tokens at the top
│   └── site.js      the one script (menu, comic, carousel, team intro, form)
├── CNAME            custom domain for GitHub Pages (fernasteam.com)
├── _config.yml      configures GitHub Pages exclusions and legacy URL redirects
├── robots.txt
└── sitemap.xml
```

## Preview locally

GitHub Pages processes the Jekyll front matter that creates clean page URLs and redirects old `.html` links. Opening a source HTML file or serving the folder with a basic static server will not reproduce those routes; use the published GitHub Pages site to verify route behavior. The contact form only sends from the published site.

## Deploy

The site is hosted on GitHub Pages with the custom domain in `CNAME`. Push to the publishing branch and GitHub Pages serves the files as they are.

## Editing content

Text lives directly in the HTML files. The header and footer are repeated in every page, so a change to either must be made in all six files.

- **News comic** (`index.html`, the `.comic__book` element): each page is an `<article class="cp">`. Keep an even number of pages: the first is the cover and the last sits on the right of the final spread.
- **Projects** (`projects.html`): each project is a `.carousel__slide` with a matching `role="tab"` button. Give both the same id pair (`id="masar"` and `aria-controls="masar"`).
- **Team** (`team.html`): add a `.dialogue__row`, a `.roster__card`, and the lines in the `.dialogue__script` list. The script runs top to bottom: `data-enter` brings a speaker in, `data-say` is one line of dialogue, and `data-exit` sends the speaker into their roster card.
- **Contact form** (`contact.html`): submissions go through [FormSubmit](https://formsubmit.co) to `contact@fernasteam.com`. To change the address, update the form's `action`, `data-endpoint`, and `data-email` attributes.

## Images

Photos and artwork are JPEG or WebP and sized for how they are displayed. Add `width` and `height` attributes to every new `<img>` so the layout doesn't shift while it loads, and `loading="lazy"` for anything below the first screen.

The share image (`assets/og-image.jpg`, 1200 × 630) appears when a page link is posted on social media or in chat apps.
