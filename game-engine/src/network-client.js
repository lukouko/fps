import * as Types from './types';
import { serverMessageTypes, clientMessageTypes, NETWORK_DATA_INTERVAL_TICKS, MAX_RADIO_SILENCE_TICKS } from './constants';

const stateData = {};

/**
 * Initialises the network client state.
 * @param {Object} params
 * @param {Function} params.onServerStateUpdate Callback function that the game loop can use to update other game state based on server messages.
 * 
 * @returns {Types.NetworkClientState}
 */
export const initialise = ({ onServerStateUpdate }) => {
  const wsClient = new WebSocket(
    `ws://${window.location.hostname}:8082`,
  );

  wsClient.onopen = (event) => {
    console.log('Opened connection to the server!');
  };

  wsClient.onmessage = (serverMessage) => onServerMessage({ serverMessage, onServerStateUpdate });

  stateData.wsClient = wsClient;
  stateData.ticksSinceLastPing = 0;
  stateData.clientId = 'unknown';

  // @ts-ignore
  return stateData;
};

const onServerMessage = ({ serverMessage, onServerStateUpdate }) => {
  try {
    const { messageType, payload } = JSON.parse(serverMessage.data);
  
    if (!messageType) {
      throw new Error(`Ignoring malformed server message: no messageType property provided`);
    }

    switch (messageType) {
      case serverMessageTypes.CONNECTION_ESTABLISHED:
        handleConnectionEstablished({ payload, onServerStateUpdate });
        break;
      
      case serverMessageTypes.SERVER_GAME_STATE_UPDATE:
        handleGameStateUpdate({ payload, onServerStateUpdate });
        break;
      default:
        throw new Error(`Server message with type '${messageType}' has no associated message handler`);
    }

  } catch (err) {
    console.error('Ignoring bad message from server', err);
  }
};

/**
 * Handles a SERVER_GAME_STATE_UPDATE message from the server.
 * @param {Object} params
 * @param {Types.ServerConnectionEstablishedMessage} params.payload The message received from the server.
 * @param {Function} params.onServerStateUpdate Callback function allowing the game loop to apply the updated server data.
 */
const handleConnectionEstablished = ({ payload, onServerStateUpdate }) => {
  const { clientId, serverGameState } = payload;
  stateData.clientId = clientId;
  console.log(`Assigned client ID: ${clientId}`);

  const processedServerGameState = convertServerGameStateForClient({ clientId: stateData.clientId, serverGameState });
  onServerStateUpdate({ processedServerGameState });
};

/**
 * Handles a SERVER_GAME_STATE_UPDATE message from the server.
 * @param {Object} params
 * @param {Types.ServerGameStateMessage} params.payload The message received from the server.
 * @param {Function} params.onServerStateUpdate Callback function allowing the game loop to apply the updated server data.
 */
const handleGameStateUpdate = ({ payload, onServerStateUpdate }) => {
  const { serverGameState } = payload;
  const processedServerGameState = convertServerGameStateForClient({ clientId: stateData.clientId, serverGameState });
  onServerStateUpdate({ processedServerGameState });
};

/**
 * Converts a server game state update payload into a data structure consumable by onServerStateUpdate.
 * @param {Object} params
 * @param {string} params.clientId the client id of the current client.
 * @param {Types.ServerGameState} params.serverGameState
 * 
 * @returns {Types.ProcessedServerGameState}
 */
const convertServerGameStateForClient = ({ clientId, serverGameState }) => {
  const processedServerGameState = Object.entries(serverGameState.players).reduce((acc, [otherClientId, playerObject]) => {
    if (clientId === otherClientId) {
      // No client state is needed to be applied for the current client.
      // It's already managed in the client itself.
      return acc;
    }

    if (!playerObject.playerPosition) {
      // No player position received by server yet. All g.
      return acc;
    }

    acc.sprites.push({
      textureId: "better-looking-matt",
      position: playerObject.playerPosition,
    });

    return acc;
  }, {
    sprites: [],
  });

  return processedServerGameState;
};

/**
 * "Renders" the network client, effectively sends any necessary traffic to the server.
 * @param {Object} params
 * @param {Types.PlayerState} params.playerState
 * @param {Types.NetworkClientState} params.networkClientState
 */
export const render = ({ playerState, networkClientState }) => {
  const { wsClient } = networkClientState;

  if (wsClient.readyState === WebSocket.CLOSED) {
    // NOOP if socket is closed by server.
    return;
  }

  networkClientState.ticksSinceLastPing = networkClientState.ticksSinceLastPing + 1;

  if (!playerState.player.isMoving && networkClientState.ticksSinceLastPing < MAX_RADIO_SILENCE_TICKS) {
    // No need to update if the player isn't moving currently.
    return;
  }

  // Even if the player is moving, we don't always want to ping the server.
  // That seems bonkers. We try to keep up with a tick rate.
  if (networkClientState.ticksSinceLastPing >= NETWORK_DATA_INTERVAL_TICKS) {
    wsClient.send(JSON.stringify({
      messageType: clientMessageTypes.GAME_STATE_UPDATE,
      payload: {
        playerPosition: playerState.player.orientation.position,
      },
    }));

    networkClientState.ticksSinceLastPing = 0;
  }
};