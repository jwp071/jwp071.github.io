# jeffpettyjohn.com

Personal landing page, served by GitHub Pages. Plain static files, no build step.

The page is a hardwood basketball court seen from above, with the name painted on it. The
name is solid and the dot after it is a ball. Pull back and let go to shoot at
whatever the drone is holding: a hoop (basketball), a glove (baseball, must arrive without a
bounce) or a racket (tennis, must bounce first). Three misses end the run.

- `index.html`, `404.html` – the pages
- `assets/game.js` – everything: layout, physics, the drone, drawing, sound. Before the drone
  moves to a new spot the game test-fires a couple of hundred shots at it and only uses spots
  that can be hit.
- `assets/site.css`, `assets/fonts/` – styling and self-hosted fonts (Anton, Fraunces, IBM Plex Mono; all OFL)
- `assets/og.png` – link-preview image

Preview locally with `python3 -m http.server` in this folder.

Other folders (`buzz-in-article/`, `projects/`, `trivia-images/`, `img/`, `bootstrap/`, `mock/`) are older
standalone pages and their files; the home page does not link to them.
