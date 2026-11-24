/* Agent Tycoon GAMMA+ settings. Gamma+ rooms are stored separately (games/gammaplus-<room>), so the original game is untouched.
   FIREBASE: paste the config from Firebase console → Project settings → Your apps → Web app.
   Leave it as null to run in demo mode (works across tabs of ONE browser only, for testing). */
window.TYCOON_CONFIG = {
  firebase: { databaseURL: 'https://agent-tycoon-c2e33-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'agent-tycoon-c2e33' },
  hostKey: 'gammaplus-7421',   // host page: ?host=gammaplus-7421
  room: 'dnb',          // default game room; add ?room=xyz to run a separate game
  shopMinutes: 6,       // default countdown for each shop round
};
