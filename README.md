# OdysseyArena — project page

Source for the OdysseyArena homepage: *OdysseyArena: Benchmarking Large
Language Models For Long-Horizon, Active and Inductive Interactions*
([arXiv:2602.05843](https://arxiv.org/abs/2602.05843)).

Static HTML, CSS and vanilla JS. No build step, no framework, no CDN scripts
beyond Google Fonts; open `index.html` or serve the directory and it runs.

```bash
python3 -m http.server 8899   # then http://localhost:8899
```

## Layout

```
index.html               the page
404.html                 not-found page (root-absolute paths, see Deploying)
static/css/main.css      design tokens for both themes + all page styles
static/css/hero.css      the arena tiles, the bulb material and the playable console
static/js/
  odyssey-tables.js      GENERATED: every table in the paper (tools/parse_paper_tables.py)
  odyssey-curves.js      GENERATED: step curves and loop-ratio points (tools/build_curves.py)
  odyssey-data.js        the environment and model catalogues, the four replayed
                         trajectories, chart settings; reads the two files above
  hero.js                the hero: four tiles, a scripted agent playing each environment
  lights.js              Turn On Lights: the instance generator and solver (shared with
                         the hero) and the playable console
  envs.js                environment walkthroughs (four tabs, replayed trajectories,
                         "Play it yourself" for Turn On Lights)
  charts.js              dependency-free SVG charts
  leaderboard.js         Table 1, sortable
  main.js                theme toggle, nav, reveal-on-scroll, BibTeX copy
  page.js                mounts every component on its element
public/
  logo.svg               the mark (nav, footer); logo.png and the favicons derive from it
  favicon*.png .ico, apple-touch-icon.png
  social/og-image.png    1200x630 social card (tools/build_social.py)
  logos/                 model-family marks used in the leaderboard and charts
  logos/projects/        marks for the "More research" menu
tools/
  parse_paper_tables.py  paper LaTeX -> static/js/odyssey-tables.js
  build_curves.py        tools/digitize/*.json -> static/js/odyssey-curves.js
  digitize/              the figure digitization: scripts, their JSON output, and
                         build_final.py, which checks every value against Table 1
  build_icons.py         logo.svg -> logo.png and every favicon
  build_social.py        the social card
figure/                  local-only working material (gitignored)
```

## Numbers

Nothing numeric is typed into the HTML. The two generated files are the source
of truth and each block in `odyssey-data.js` names the paper table or figure it
comes from.

- `tools/parse_paper_tables.py <paper-dir>` reads `Sections/5Experiments.tex`,
  `Sections/B_more_analysis.tex`, `Sections/6Analysis.tex` and
  `Tables/comparison.tex` and writes `odyssey-tables.js`: the main results, the
  rules-given comparison, the memory-window and in-context tables, the failure
  modes, the benchmark comparison and the trading strategies.
- `tools/digitize/` holds the extraction of the two figures that have no table:
  success rate against step (from the matplotlib paths in the PDF) and loop
  ratio against success rate (from the raster embedded in the figure, with the
  broken x-axis of the Repo System panel handled per segment). Every curve end
  and every point was checked against Table 1; the curves end up to 0.04 below
  the table for a few model and environment pairs, which is in the paper's
  figure, not the extraction. `tools/build_curves.py` writes
  `odyssey-curves.js` from the JSON.

Rerun the first script on a new paper draft, rerun the digitization only if
the figures change.

## The hero and the playable environment

`hero.js` runs the four environments live, one tile each, with a scripted agent
on a fresh instance every episode: Turn On Lights (an explorer that probes a
light or two before each successful move), AI Trading and Energy Dispatch
(small simulations after Section 3 of the paper: latent factors under noise,
hidden periodic efficiencies), Repo System (a typed trajectory). Hovering a
tile pauses it; clicking one selects that environment in the Environments
section. Nothing in the tiles is a paper result.

`lights.js` is a faithful miniature of the Turn On Lights environment in
Appendix A.1: N lights, a hidden partial order, one activation condition per
light over lights earlier in the order (AND, OR, NOT), one toggle per step, a
generic failure message when the condition does not hold. Every instance is
checked solvable by breadth-first search and the shortest solution is kept.
It backs both the hero tile and the "Play it yourself" mode of the Environments
section, where "Reveal rules" shows the conditions, which is the deductive
setting the paper compares against.

## Themes and deep links

Light is the default; `:root[data-theme="dark"]` overrides the same tokens,
and the inline script in `<head>` sets the theme before first paint (URL
parameter, then localStorage, then light). `?theme=dark` forces dark, for
screenshots. Chart colours for models come from the catalogue in
`odyssey-data.js`; everything else reads CSS custom properties, so the charts
need no redraw when the theme flips.

## What is still parked

Search `TODO` in `index.html`:

- **Affiliations** under the author names, once the list is settled.
- **Venue line** and further news items.

The paper, code (`xufangzhi/Odyssey-Arena`) and benchmark (the repository's
`test_data/`) links are live.

## Deploying

GitHub Pages from a branch, folder `/ (root)`, served at
`https://os-copilot.github.io/OdysseyArena-Home/`. Nothing in the tree starts
with an underscore, so no `.nojekyll` is needed.

Two things hardcode that address. The Open Graph tags in `<head>` are absolute,
because social scrapers do not resolve relative URLs. And `404.html` uses
root-absolute `/OdysseyArena-Home/…` paths, because Pages serves it for a miss
at any depth below the project path. Everything else is relative. Change those
two together if the site is hosted elsewhere.
