const KEEP_ALIVE_INTERVAL_MS = 5000;

const serverMessageTypes = Object.freeze({
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED',
});

const clientMessageTypes = Object.freeze({
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
});

module.exports = {
  KEEP_ALIVE_INTERVAL_MS,
  serverMessageTypes,
  clientMessageTypes,
};
