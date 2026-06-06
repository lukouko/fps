import { loadTextures } from './textures';
import * as constants from './constants';
import * as inputsApi from './inputs';
import * as player from './player';
import * as map from './map';
import * as minimap from './mini-map';
import * as scene from './scene';
import * as helpers from './helpers';
import * as networkClient from './network-client';
import * as Types from './types';

let framesPerSecond = 0;
let gameLoopCycles = 0;
let gameLoopInterval;
let fpsInterval;

const initialise = async () => {
  const displayInfo = helpers.generateDisplayInfo({
    width: 800,
    height: 600,
    fieldOfView: 72,
  });

  const canvas = document.createElement('canvas');

  canvas.width = displayInfo.width;
  canvas.height = displayInfo.height;

  const inputCanvas = document.createElement('canvas');
  
  inputCanvas.width = displayInfo.width;
  inputCanvas.height = displayInfo.height;

  // Get the 2D rendering context of the canvas
  const canvasContext = canvas.getContext('2d');

  if (!canvasContext) {
    throw new Error('No canvasContext found');
  }

  const inputCanvasContext = inputCanvas.getContext('2d');

  document.body.appendChild(canvas);
  document.body.appendChild(inputCanvas);

  await loadTextures({ displayInfo });

  /** @type Types.GameState */
  const gameState = {
    mapState: await map.initialise(),
    playerState: await player.initialise(),
    inputState: await inputsApi.initialise({ inputCanvasContext, inputMethod: 'KEYBOARD' }),
    minimapState: await minimap.initialise(),
    sceneState: await scene.initialise({ displayInfo }),
    networkClientState: await networkClient.initialise({ onServerStateUpdate: ({ processedServerGameState }) => onServerStateUpdate({ processedServerGameState, gameState }) }),
  };

  if (helpers.isMobileDevice()) {
    await helpers.requestFullScreen();
  } 

  gameLoopInterval = setInterval(() => gameLoop({ canvasContext, gameState, displayInfo }), constants.GAME_LOOP_TICK_MS);
  fpsInterval = setInterval(trackFps, 1000);
};

/**
 * Processes updates of game state received by the network client.
 * @param {Object} params
 * @param {Types.ProcessedServerGameState} params.processedServerGameState
 * @param {Types.GameState} params.gameState
 */
const onServerStateUpdate = ({ processedServerGameState, gameState}) => {
  map.updateForServerGameState({ mapState: gameState.mapState, processedServerGameState });
};

const gameLoop = ({ canvasContext, gameState, displayInfo }) => {
  try {
    const { mapState, playerState, inputState, networkClientState } = gameState;

    ++gameLoopCycles;
    player.move({ playerState, inputState, mapState });
    
    const { wallRays } = scene.render({
      canvasContext,
      orientation: playerState.player.orientation,
      mapState,
      displayInfo,
    });

    networkClient.render({ playerState, networkClientState });
    
    if (gameState.inputState.enableMiniMap) {
      minimap.render({
        canvasContext,
        wallRays,
        mapLayout: mapState.currentMap.layout,
        playerOrientation: playerState.player.orientation,
      });
    }

    /*player.render({
      canvasContext,
      inputState,
      playerState,
      displayInfo,
    });*/

    canvasContext.fillStyle = 'white';
    canvasContext.font = '16px Monospace';
    canvasContext.fillText(`FPS: ${framesPerSecond}`, 25, 25);
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