const { WebSocketServer } = require('ws');

const fpsServer = new WebSocketServer({ port: 8080 });

fpsServer.on('connection', (fpsClient) => {
  fpsClient.on('error', console.error);

  fpsClient.on('message', (data) => {
    console.log('received: %s', data);
  });

  fpsClient.send('something');
});

fpsServer.on('listening', () => {
  console.log('FPS server is listening for client connections');
});

