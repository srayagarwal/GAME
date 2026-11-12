# Agent Tycoon · phone edition

A poker-table card game for the NBD Bank × Nova workshop. One QR code, every player on their own phone, one host laptop, one projector.

| View | Link |
|---|---|
| Players (put this in the QR) | `https://<user>.github.io/agent-tycoon/` |
| Projector | `…/agent-tycoon/?board` |
| Host | `…/agent-tycoon/?host=<hostKey>` |

Add `&room=xyz` (or `?room=xyz`) to run a separate game; each room is independent.

## Files
- `index.html`, `style.css`, `app.js` – the three views
- `game.js` – rules and scoring (same maths as the v4 Google Sheet: verified on the 12 Nov results, 35/35 identical)
- `db.js` – Firebase Realtime Database, or a demo store when no config is set
- `config.js` – Firebase config, host key, default room, shop timer

## One-off setup
1. **Firebase** (free): console.firebase.google.com → Add project → Build → Realtime Database → Create (Europe-west1) → start in locked mode → Rules tab: paste `database.rules.json` → Publish. Then Project settings → Your apps → Web (`</>`) → register → copy the `firebaseConfig` object into `config.js` (`firebase: {...}`).
2. **GitHub Pages**: push this folder to a repo → Settings → Pages → Deploy from branch `main` / root.
3. Change `hostKey` in `config.js` (currently set).

## Running a session
Host: Open Part 1 → Close Part 1 → Reveal Day 1 → Open Part 2 → Close Part 2 → Reveal Day 6 → CFO review → Export results (CSV).
Closing a shop locks every hand automatically. Incidents are picked the same way as the sheet: the two most-exposed of the pool; both sleepers always fire on Day 6.
"Start a new game" clears the room. "Go back one step" undoes a mis-click.

Without Firebase config the game runs in **demo mode**: open several tabs of one browser (host, board, players) to try it.
