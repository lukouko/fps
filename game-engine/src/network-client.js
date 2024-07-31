
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
  };
};