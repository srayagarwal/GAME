/* DELTA settings. DELTA rooms are stored separately (games/delta-<room>), so Agent Tycoon and Gamma are untouched. */
window.TYCOON_CONFIG = {
  firebase: { databaseURL: 'https://agent-tycoon-c2e33-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'agent-tycoon-c2e33' },
  hostKey: 'delta-7421',  // host page: ?host=delta-7421
  room: 'dnb',            // default room; add ?room=xyz for a separate game
  shopMinutes: 2,         // default time to fix weak spots and launch, per project
};
