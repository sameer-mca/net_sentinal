/**
 * In-memory capture engine state service
 */

const engine = {
  lastHeartbeat: null,
  running: false,
  mode: null,
  interfaces: [],
  lastError: null,
};

/**
 * Returns true if the capture engine reported a heartbeat within the last 10 seconds
 * @returns {boolean}
 */
function isEngineOnline() {
  if (!engine.lastHeartbeat) return false;
  const elapsed = Date.now() - new Date(engine.lastHeartbeat).getTime();
  return elapsed >= 0 && elapsed <= 10000;
}

/**
 * Returns the current engine status representation matching the Data Contract
 */
function getEngine() {
  return {
    running: engine.running,
    mode: engine.mode,
    interfaces: engine.interfaces,
    last_error: engine.lastError,
  };
}

/**
 * Returns interfaces list
 */
function getInterfaces() {
  return engine.interfaces || [];
}

/**
 * Updates engine status from incoming heartbeat.
 * Returns true if running, mode, or online-ness state changed.
 * @param {object} param0
 * @returns {boolean} changed
 */
function updateHeartbeat({ running, mode, interfaces, last_error }) {
  const wasOnline = isEngineOnline();
  const wasRunning = engine.running;
  const previousMode = engine.mode;

  engine.lastHeartbeat = new Date();
  engine.running = Boolean(running);
  engine.mode = mode !== undefined ? mode : engine.mode;
  if (Array.isArray(interfaces)) {
    engine.interfaces = interfaces;
  }
  engine.lastError = last_error !== undefined ? last_error : null;

  const isOnline = isEngineOnline();
  const changed = wasOnline !== isOnline || wasRunning !== engine.running || previousMode !== engine.mode;

  return changed;
}

/**
 * Reset or set engine state directly
 */
function setEngine(updates) {
  Object.assign(engine, updates);
}

module.exports = {
  engine,
  isEngineOnline,
  getEngine,
  getInterfaces,
  updateHeartbeat,
  setEngine,
};
