# Continuum — handoff notes

Static site (`index.html`, Tailwind CDN) published by GitHub Pages, plus a print pipeline that renders the same HTML to a print-on-demand PDF.

## Rules
- Screen layout: every story is a centered 9:16-wide column (see the `@media screen` block in index.html), all text centered, even on desktop.
- Screen UI is the design. Don't restyle it unless asked; content goes into the existing article blocks.
- Print changes live in `print.css` (loaded with `media="print"`) and the hidden colophon `<section class="print-page">` at the end of `<main>`.

## Print pipeline
- `print.css`: page 1 = cover image, page 2 = contents (sidebar), then one article per page, then colophon. Currently 9 pages; saddle-stitch needs a multiple of 4, so pad to 12 as articles grow. Audio/canvas controls are hidden in print.
- `build-pdf.mjs`: Playwright/Chromium -> `dist/continuum-issue-01.pdf`.
  - Local: `npm install && npx playwright install chromium && npm run pdf`
  - Size: `TRIM_W=5.5 TRIM_H=8.5 BLEED=0.125 npm run pdf` (inches; page = trim + 2x bleed). Default 10.75x14.375 (Domebook 2 / Whole Earth catalog trim). Type scales with page width via `--s`. Nearest stock option seen: Newspaper Club tabloid, 289x380 mm (~11.38x14.96 in); confirm the printer accepts a custom trim, bleed and page counts before ordering.
  - `STRICT=1` fails the build if any image is missing or still a placeholder.
- `.github/workflows/print-pdf.yml`: builds the PDF on push; download it from the Actions run (Artifacts). The PDF is never published to the site.
- `.github/workflows/pages.yml`: deploys index.html, print.css and volumes/ to GitHub Pages on every push to main (repo Settings > Pages > Source must be "GitHub Actions"). Site URL: https://terratian.github.io/continuum-zine/
- Adding an article adds a page; keep the total a multiple of 4 (use the colophon/extra pages to pad).
- Output is RGB. Check the chosen printer's spec (Lulu, Mixam, KDP, IngramSpark) for trim sizes, page minimums, bleed and color handling, and order one proof (umber and `#00FF66` shift in CMYK).

## Open items
- Images: only `volumes/issue-01/media/cover.jpg` exists (768x1376 px; export larger for print). The article images are missing, so the page falls back to Unsplash stock photos. Replace with licensed/own images before publishing or printing.
- Rights: artwork, photographs and audio by/of Dial, Maier, Herrera, Bradley, Fukui, Cotten need licensing for web and print. Fill the credits lines on the colophon page.
- Fonts: surname overlays use Anton, bundled locally (`fonts/`, SIL OFL). Tailwind config names Playfair Display but it is not loaded, so serif headings render in Georgia; add it if Playfair is the intent.
- Bradley audio: the screen panel links to the Free Music Archive track page (licence shown there: FMA-Limited, Download Only). Paste FMA's own player embed code into the marked slot in `#bradley-stream`. No audio is hosted in the repo; `bradley-session.ogg` is not present.
- Bourdain page (`#anthony-bourdain`, not in the sidebar nav): the 25,000 first-printing figure in the dedication is unverified (no source found; check the copyright page or a publisher record). The 1985 Lish workshop, 1990 Random House advance, 1995 Villard publication, self-funded tour and 2000 Kitchen Confidential facts come from Wikipedia.
- Art slots (all articles use the split layout, art left / text right; a missing file shows an "ARTWORK PENDING" panel instead of stock photos): `volumes/issue-01/media/` dial-assemblage.jpg, maier-roll.jpg, herrera-geom.jpg, fukui-scenery.jpg, cotten-guitar.jpg, bourdain.jpg (present), cover.jpg (present). Bradley's left panel is the audio spectrum.
- Persistent player: `#now-playing` (fixed dock outside `<main>`) embeds archive.org's player for the Bradley live recording; it keeps playing while the reader scrolls. Untested from the build sandbox; swap the iframe for FMA's own embed code if preferred. Hidden in print.
- Licence: original text/design are CC BY 4.0 (see `LICENSE.md`, editor's note and colophon). Third-party works are excluded and keep their own rights. The Bourdain page byline credits Claude (AI) as writer, directed and edited by the editor.
- Credits: all art is credited to the editor's pen name (per-article line, colophon, JSON-LD). Third-party audio credits remain (Bradley: Free Music Archive / KEXP).
- SEO: title, description, canonical, Open Graph, JSON-LD, robots.txt, sitemap.xml (deployed by pages.yml). The canonical URL assumes https://terratian.github.io/continuum-zine/.
- Facts to verify: Cotten's Grammy age, Maier's photo count.
- Tailwind CDN is prototype-only; compile Tailwind before heavy production use.
- `resizeCanvas()` stacks `ctx.scale` on each resize (waveform).
- Added Issue 01 text: "The Gala Dissection" (fiction) and "The Latency Blueprint" (essay), both written by Claude, directed/edited by the pen name; art slots `gala-dissection.jpg`, `latency-blueprint.jpg` are pending. Each creator page got a short "The Ledger" paragraph tying it to the editor's note. Facts in those paragraphs (Dial, Bradley, Maier, Fukui, Herrera, Cotten) are from general knowledge and still need checking. Page count is now 13 for print; pad to 16.
