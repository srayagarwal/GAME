/* DELTA 2 settings. Rooms are stored separately (games/delta2-<room>), so Agent Tycoon, Gamma and DELTA are untouched. */
window.TYCOON_CONFIG = {
  firebase: { databaseURL: 'https://agent-tycoon-c2e33-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'agent-tycoon-c2e33' },
  hostKey: 'delta-7421',  // host page: ?host=delta-7421
  room: 'dnb',            // default room; add ?room=xyz for a separate game
  planMinutes: 3,         // default planning time per quarter
};
