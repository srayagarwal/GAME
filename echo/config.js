/* ECHO settings. Rooms are stored separately (games/echo2-<room>), so the other games are untouched. */
window.TYCOON_CONFIG = {
  firebase: { databaseURL: 'https://agent-tycoon-c2e33-default-rtdb.europe-west1.firebasedatabase.app', projectId: 'agent-tycoon-c2e33' },
  hostKey: 'echo-7421',   // host page: ?host=echo-7421 · change before a client session
  room: 'main',           // default room; add ?room=xyz for a separate game
};
