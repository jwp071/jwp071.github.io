# jeffpettyjohn.com

Personal landing page, served by GitHub Pages. Plain static files, no build step.

The page is a playable court with the name built into it. Four games, picked from the chips at
the top (or by URL: `/#hoops`, `/#baseball`, `/#tennis`, `/#mixed`):

- **Basketball** – a hardwood court. The painted name is solid and the dot after it is a ball:
  pull back and let go to shoot at a hoop a drone lifts off the court. The letters are a drum kit.
- **Mixed** – the same, but the drone swaps between a hoop, a glove (no bounces allowed) and a
  racket (must bounce first).
- **Baseball** – the drone pitches, a tap swings, and J-E-F-F field the infield. Timing sets
  direction and distance.
- **Tennis** – a rally with the drone over a net that spells PETTYJOHN; the racket follows the pointer.

Files:

- `index.html`, `404.html` – the pages
- `assets/core.js` – shared stage: canvases, scoreboard, sound, effects, input, frame loop
- `assets/sling.js` – Basketball and Mixed. Before the drone moves, the game test-fires a few
  hundred shots at each candidate spot and keeps only spots with forgiving answers.
- `assets/baseball.js`, `assets/tennis.js` – the other two games
- `assets/site.css`, `assets/fonts/` – styling and self-hosted fonts (Anton, Fraunces, IBM Plex Mono; all OFL)
- `assets/og.png` – link-preview image

Preview locally with `python3 -m http.server` in this folder.

Other folders (`buzz-in-article/`, `projects/`, `trivia-images/`, `img/`, `bootstrap/`, `mock/`) are older
standalone pages and their files; the home page does not link to them.
