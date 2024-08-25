const KEEP_ALIVE_INTERVAL_MS = 5000;
const SERVER_GAME_STATE_INTERVAL_MS = 100;

const serverMessageTypes = Object.freeze({
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED',
  SERVER_GAME_STATE_UPDATE: 'SERVER_GAME_STATE_UPDATE',
});

const clientMessageTypes = Object.freeze({
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
});

module.exports = {
  KEEP_ALIVE_INTERVAL_MS,
  SERVER_GAME_STATE_INTERVAL_MS,
  serverMessageTypes,
  clientMessageTypes,
};
