import { loadTextures } from './textures';
import * as constants from './constants';
import * as inputs from './inputs';
import * as player from './player';
import * as map from './map';
import * as minimap from './mini-map';
import * as scene from './scene';

let framesPerSecond = 0;
let gameLoopCycles = 0;
let gameLoopInterval;
let fpsInterval;

const initialise = async () => {
  const canvas = document.createElement('canvas');
  canvas.width = constants.SCREEN_WIDTH;
  canvas.height = constants.SCREEN_HEIGHT;

  // Get the 2D rendering context of the canvas
  const canvasContext = canvas.getContext('2d');

  if (!canvasContext) {
    throw new Error('No canvasContext found');
  }

  document.body.appendChild(canvas);

  await loadTextures();
  await map.initialise();
  await player.initialise();
  await inputs.initialise();
  await minimap.initialise();
  await scene.initialise();

  gameLoopInterval = setInterval(() => gameLoop({ canvasContext }), constants.GAME_LOOP_TICK_MS);
  fpsInterval = setInterval(trackFps, 1000);
};

const clearScreen = ({ canvasContext }) => {
  canvasContext.fillStyle = 'black';
  canvasContext.fillRect(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT);
};

const gameLoop = ({ canvasContext }) => {
  try {
    ++gameLoopCycles;

    clearScreen({ canvasContext });
    player.move({ inputs: inputs.getCurrent() });
    
    const { wallRays } = scene.render({ canvasContext, player: player.getCurrent() });
    
    minimap.render({
      canvasContext,
      map: map.getCurrent(),
      wallRays,
      player: player.getCurrent(),
    });

    canvasContext.fillStyle = 'white';
    canvasContext.font = '16px Monospace';
    canvasContext.fillText(framesPerSecond, 25, 25);
  } catch (err) {
    console.error(err);
    clearInterval(gameLoopInterval);
    clearInterval(fpsInterval);
  }
};

const trackFps = () => {
  framesPerSecond = gameLoopCycles;
  gameLoopCycles = 0;
}

initialise();