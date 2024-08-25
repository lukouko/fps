const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuid } = require('uuid');
const messageFactory = require('./message-factory');
const constants = require('./constants');

const fpsServer = new WebSocketServer({ port: 8080 });

const serverGameState = {
  players: {},
};

fpsServer.on('connection', (fpsClient, req) => {
  const clientId = uuid();

  const clientInfo = {
    clientId,
    isAlive: true,
  };

  serverGameState.players[clientId] = {};

  fpsClient.on('error', console.error);

  fpsClient.on('message', (message) => {
    try {
      clientInfo.isAlive = true;
      const parsedMessage = JSON.parse(message.toString());
      handleClientMessage(parsedMessage, fpsClient, fpsServer, clientInfo);
    } catch (err) {
      clientInfo.isAlive = false;
      console.error(`${clientId}: Received bad message from client`, err);
    }
  });

  fpsClient.send(messageFactory.connectionEstablished({ clientId: clientInfo.clientId, serverGameState }));

  // Start sending game state data to the client.
  setInterval(() => {
    fpsServer.clients.forEach((fpsClient) => {
      if (fpsClient.readyState === WebSocket.OPEN) {
        fpsClient.send(messageFactory.serverGameStateUpdate({ serverGameState }));
      }
    }, constants.SERVER_GAME_STATE_INTERVAL_MS);
  });

  // Start tracking client activity and terminate connection if the client dies
  const activityInterval = setInterval(() => {
    if (!clientInfo.isAlive) {
      console.log(`${clientInfo.clientId}: disconnecting due to activity timeout`);
      delete serverGameState[clientId];
      fpsClient.terminate();
      return;
    }

    clientInfo.isAlive = false;
  }, constants.KEEP_ALIVE_INTERVAL_MS);

  fpsClient.on('close', function close() {
    console.log(`${clientInfo.clientId}: closed by the client`);
    delete serverGameState[clientId];

    // @ts-ignore
    clearInterval(activityInterval);
  });
});

fpsServer.on('listening', () => {
  console.log('FPS server is listening for client connections');
});


const handleClientMessage = (clientMessage, fpsClient, fpsServer, clientInfo) => {
  const { clientId } = clientInfo;

  if (!clientMessage) {
    throw new Error(`${clientId}: Cannot process undefined client message`);
  }

  const { messageType, payload } = clientMessage;

  if (!messageType) {
    console.error(clientMessage);
    throw new Error(`${clientId}: Cannot process malformed client message - no messageType provided`);
  }

  const { clientMessageTypes } = constants;

  switch (messageType) {
    case clientMessageTypes.GAME_STATE_UPDATE:
      serverGameState.players[clientId].playerPosition = payload.playerPosition;
      console.log(`${clientId}: Received game status update`, payload);
    break;

    default:
      throw new Error(`${clientId}: No message handler for client message type '${messageType}'`);
  }
};
