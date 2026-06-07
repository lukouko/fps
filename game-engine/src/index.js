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

// Render height in pixels — the single knob for resolution vs. performance.
// Width is derived from the window aspect ratio so the canvas fills the screen without distortion.
const RENDER_HEIGHT = 500;

let framesPerSecond = 0;
let renderFrameCount = 0;
let renderFrameId;
let gameLoopInterval;
let fpsInterval;
let lastLogicTickTime = 0;

const initialise = async () => {
  const renderWidth = Math.floor(RENDER_HEIGHT * (window.innerWidth / window.innerHeight));

  const displayInfo = helpers.generateDisplayInfo({
    width: renderWidth,
    height: RENDER_HEIGHT,
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

  // Logic tick: player movement and network sync at a fixed rate.
  gameLoopInterval = setInterval(() => logicTick({ gameState }), constants.GAME_LOOP_TICK_MS);

  // Render tick: scene rendering synced to vsync via rAF.
  const renderLoop = () => {
    try {
      ++renderFrameCount;
      const { mapState, playerState, inputState } = gameState;

      const { wallRays } = scene.render({
        canvasContext,
        orientation: playerState.player.orientation,
        mapState,
        displayInfo,
      });

      if (inputState.enableMiniMap) {
        minimap.render({
          canvasContext,
          wallRays,
          mapLayout: mapState.currentMap.layout,
          playerOrientation: playerState.player.orientation,
        });
      }

      canvasContext.fillStyle = 'white';
      canvasContext.font = '16px Monospace';
      canvasContext.fillText(`FPS: ${framesPerSecond}`, 25, 25);

      // Schedule next frame at the end of try — if anything above throws, the loop stops cleanly.
      renderFrameId = requestAnimationFrame(renderLoop);
    } catch (err) {
      console.error(err);
      clearInterval(gameLoopInterval);
      clearInterval(fpsInterval);
    }
  };
  renderFrameId = requestAnimationFrame(renderLoop);

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

/** Fixed-rate logic tick: player movement and network sync. */
const logicTick = ({ gameState }) => {
  try {
    const now = performance.now();
    // Measure actual elapsed time rather than assuming the interval fired on schedule.
    // Clamp to 3× the target to avoid a huge lurch after the browser was suspended.
    const deltaMs = lastLogicTickTime > 0
      ? Math.min(now - lastLogicTickTime, constants.GAME_LOOP_TICK_MS * 3)
      : constants.GAME_LOOP_TICK_MS;
    lastLogicTickTime = now;

    const { mapState, playerState, inputState, networkClientState } = gameState;
    player.move({ playerState, inputState, mapState, deltaMs });
    networkClient.render({ playerState, networkClientState });
  } catch (err) {
    console.error(err);
    clearInterval(gameLoopInterval);
    clearInterval(fpsInterval);
    cancelAnimationFrame(renderFrameId);
  }
};

const trackFps = () => {
  framesPerSecond = renderFrameCount;
  renderFrameCount = 0;
};

initialise();