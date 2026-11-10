# Road to Turkey

A dark, hand-drawn-style mobile comedy adventure. Barry Thinley, 35, is going bald and
needs €3,000 for a hair transplant in Istanbul.

**Phase 1** contains the title screen and Level 1, *The Mirror Incident*: explore Barry's
flat, face the bathroom mirror, scrape together cash, and make it to the pharmacy.

## Play

Open `index.html` in a browser. There is nothing to install or build.
It is designed for a phone held upright (Chrome on Android).

- **Move:** drag anywhere on the game area (a joystick appears under your thumb)
- **Interact:** the round button, bottom right (LOOK / SEARCH / TALK / OPEN)
- **Top bar:** Hair, Confidence and Turkey Fund meters, pause, bag, sound
- **Yellow strip:** your current mission — tap it for the full list
- Progress saves automatically on your device. *Continue* on the title screen resumes it.
- Desktop: arrow keys / WASD to move, Space or E to interact, Esc to pause.

The original lane-runner is still here as a bonus: `runner.html` ("Street Run").

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page: canvas, HUD, dialogue box, menus |
| `css/style.css` | All styling |
| `js/core.js` | Helpers, saving to the browser, settings, sound |
| `js/art.js` | All artwork, drawn in code (characters, hair stages, props, map) |
| `js/level1.js` | Level 1 data: map, objects, dialogue, items, missions |
| `js/dialogue.js` | Dialogue box with branching choices |
| `js/ui.js` | Menus, meters, mission tracker, bag |
| `js/game.js` | Movement, collision, camera, saving, drawing, touch input |
| `runner.html` | The original Street Run arcade game |
| `tests/` | Automated checks (see `tests/README.md`) |

No frameworks, no build step, no external services or keys. Works on GitHub Pages as-is.
