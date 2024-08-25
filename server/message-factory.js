const { serverMessageTypes } = require('./constants');

const connectionEstablished = ({ clientId }) => {
  if (!clientId || typeof clientId !== 'string') {
    throw new Error('clientId must be a non-zero length string');
  }
  
  return JSON.stringify({
    messageType: serverMessageTypes.CONNECTION_ESTABLISHED,
    payload: {
      clientId,
    },
  });
};

module.exports = {
  connectionEstablished,
}