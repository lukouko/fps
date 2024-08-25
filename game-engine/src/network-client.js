import * as Types from './types';
import { serverMessageTypes, clientMessageTypes, NETWORK_DATA_INTERVAL_TICKS, MAX_RADIO_SILENCE_TICKS } from './constants';

export const initialise = () => {
  const wsClient = new WebSocket(
    'ws://localhost:8080',
  );

  const stateData = {
    wsClient,
    ticksSinceLastPing: 0,
  };

  wsClient.onopen = (event) => {
    console.log('Opened connection to the server!');
  };

  wsClient.onmessage = (serverMessage) => onServerMessage({ serverMessage, wsClient });

  return stateData;
};

const onServerMessage = ({ serverMessage, wsClient }) => {
  try {
    const { messageType, payload } = JSON.parse(serverMessage.data);
  
    if (!messageType) {
      throw new Error(`Ignoring malformed server message: no messageType property provided`);
    }

    switch (messageType) {
      case serverMessageTypes.CONNECTION_ESTABLISHED:
        handleConnectionEstablished({ payload, wsClient });
        break;
      default:
        throw new Error(`Server message with type '${messageType}' has no associated message handler`);
    }

  } catch (err) {
    console.error('Ignoring bad message from server', err);
  }
};

const handleConnectionEstablished = ({ payload, wsClient }) => {
  console.log('Received connection established from server', payload);
  wsClient.send(JSON.stringify({ messageType: clientMessageTypes.GAME_STATE_UPDATE, payload: { game: 'yes' } }));
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