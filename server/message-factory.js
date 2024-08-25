const { serverMessageTypes } = require('./constants');

const connectionEstablished = ({ clientId, serverGameState }) => {
  if (!clientId || typeof clientId !== 'string') {
    throw new Error('clientId must be a non-zero length string');
  }
  
  return JSON.stringify({
    messageType: serverMessageTypes.CONNECTION_ESTABLISHED,
    payload: {
      clientId,
      serverGameState,
    },
  });
};

const serverGameStateUpdate = ({ serverGameState }) => {
  if (!serverGameState || typeof serverGameState !== 'object') {
    throw new Error('serverGameState must be an object');
  }

  return JSON.stringify({
    messageType: serverMessageTypes.SERVER_GAME_STATE_UPDATE,
    payload: {
      serverGameState,
    },
  });
};

module.exports = {
  connectionEstablished,
  serverGameStateUpdate,
}