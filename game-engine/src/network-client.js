import * as Types from './types';

export const initialise = ({  }) => {
  const wsClient = new WebSocket(
    'ws://localhost:8080',
  );

  wsClient.onopen = (event) => {

    console.log('Opened connection to the server!');
    wsClient.send('I am a client reporting for duty');
  };

  wsClient.onmessage = (msg) => {
    console.log('Received message: ', msg);
  };

  return {
    wsClient,
    ticksSinceLastPing: 0,
  };
};

/**
 * "Renders" the network client, effectively sends any necessary traffic to the server.
 * @param {Object} params
 * @param {Types.NetworkClientState} params.networkClientState
 */
export const render = ({ networkClientState }) => {
  networkClientState.ticksSinceLastPing = networkClientState.ticksSinceLastPing + 1;

  // If we are dead, let the server know.

  // If we have moved a sufficient distance to be interesting, let the server know.

  // If we have reached the maximum number of ticks since last ping, let the server know.
  

  const { wsClient } = networkClientState;

  
};