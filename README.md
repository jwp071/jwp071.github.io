# jeffpettyjohn.com

Personal landing page, served by GitHub Pages. Plain static files, no build step.

The page is a playable court with the name built into it. Four games, picked from the chips at
the top (or by URL: `/#hoops`, `/#baseball`, `/#tennis`, `/#mixed`). Quit (or Esc) leaves a game
early without it counting as a loss; your score still counts toward your best.

- **Basketball** – a hardwood court. The painted name is solid and the dot after it is a ball (on a
  tall phone it rests on top of the name instead): pull back and let go to shoot at a hoop a drone lifts off the court. The letters are a drum kit.
- **Mixed** – the same, but the drone swaps between a hoop, a glove (no bounces allowed) and a
  racket (must bounce first).
- **Baseball** – the drone pitches, a tap swings, and J-E-F-F field the infield. Timing sets
  direction and distance. PETTYJOHN is mown into the outfield grass.

Tennis and baseball fit their field around the page's own boxes, and re-centre it (with a quick fade)
when a game starts and the words make way for the scoreboard.
- **Tennis** – one service game against the drone, scored like tennis (15, 30, 40, deuce, advantage),
  over a net that spells PETTYJOHN, with JEFF behind each baseline. The racket follows the pointer.
  Drone shots heading out are marked and left alone; sharp angles and hard swings can beat the drone.

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
