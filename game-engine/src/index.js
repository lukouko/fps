import { loadTextures } from './textures';
import * as constants from './constants';
import * as inputsApi from './inputs';
import * as player from './player';
import * as map from './map';
import * as minimap from './mini-map';
import * as scene from './scene';
import * as helpers from './helpers';
import * as networkClient from './network-client';
import * as doors from './doors';
import * as Types from './types';

// Render height in pixels — the single knob for resolution vs. performance.
// Width is derived from the window aspect ratio so the canvas fills the screen without distortion.
const RENDER_HEIGHT = 550;

let framesPerSecond = 0;
let renderFrameCount = 0;
let renderFrameId;
let gameLoopInterval;
let fpsInterval;
let lastLogicTickTime = 0;
let sharedDisplayInfo = null;

const showMobileSplashScreen = () => {
  const splash = document.createElement('div');
  splash.id = 'mobile-splash-screen';
  splash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: Arial, sans-serif;
    color: white;
    padding: 20px;
    box-sizing: border-box;
  `;

  const title = document.createElement('h1');
  title.textContent = 'FPS Raycaster';
  title.style.cssText = 'font-size: 3em; margin-bottom: 20px; text-align: center;';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'For the best experience on mobile:';
  subtitle.style.cssText = 'font-size: 1.2em; margin-bottom: 30px; text-align: center;';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-width: 400px;
  `;

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.textContent = '📱 Request Fullscreen';
  fullscreenBtn.id = 'fullscreen-btn';
  fullscreenBtn.style.cssText = `
    padding: 20px;
    font-size: 1.2em;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s;
  `;
  fullscreenBtn.onmouseover = () => fullscreenBtn.style.background = '#c0392b';
  fullscreenBtn.onmouseout = () => fullscreenBtn.style.background = '#e74c3c';

  const landscapeBtn = document.createElement('button');
  landscapeBtn.textContent = '🔄 Request Landscape';
  landscapeBtn.id = 'landscape-btn';
  landscapeBtn.style.cssText = `
    padding: 20px;
    font-size: 1.2em;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s;
  `;
  landscapeBtn.onmouseover = () => landscapeBtn.style.background = '#2980b9';
  landscapeBtn.onmouseout = () => landscapeBtn.style.background = '#3498db';

  const startBtn = document.createElement('button');
  startBtn.textContent = '▶️ Start Game';
  startBtn.id = 'start-game-btn';
  startBtn.style.cssText = `
    padding: 20px;
    font-size: 1.2em;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s;
    margin-top: 20px;
  `;
  startBtn.onmouseover = () => startBtn.style.background = '#229954';
  startBtn.onmouseout = () => startBtn.style.background = '#27ae60';

  const statusDiv = document.createElement('div');
  statusDiv.id = 'splash-status';
  statusDiv.style.cssText = `
    margin-top: 30px;
    font-size: 0.9em;
    text-align: center;
    color: #bdc3c7;
    min-height: 40px;
  `;

  buttonContainer.appendChild(fullscreenBtn);
  buttonContainer.appendChild(landscapeBtn);
  buttonContainer.appendChild(startBtn);
  buttonContainer.appendChild(statusDiv);

  splash.appendChild(title);
  splash.appendChild(subtitle);
  splash.appendChild(buttonContainer);

  document.body.appendChild(splash);

  return { splash, fullscreenBtn, landscapeBtn, startBtn, statusDiv };
};

const setupMobileSplashScreen = ({ isMobile }) => {
  if (!isMobile) {
    return Promise.resolve();  // Desktop, skip splash screen
  }

  return new Promise((resolve) => {
    const { splash, fullscreenBtn, landscapeBtn, startBtn, statusDiv } = showMobileSplashScreen();

    const updateStatus = (msg) => {
      statusDiv.textContent = msg;
    };

    fullscreenBtn.addEventListener('click', async () => {
      fullscreenBtn.disabled = true;
      fullscreenBtn.style.opacity = '0.5';
      updateStatus('Requesting fullscreen...');

      try {
        await helpers.requestFullScreen({ canvas: document.documentElement });
        updateStatus('✓ Fullscreen enabled');
        fullscreenBtn.textContent = '✓ Fullscreen enabled';
        fullscreenBtn.style.background = '#27ae60';
      } catch (err) {
        updateStatus('Fullscreen request denied (may not be available)');
        fullscreenBtn.textContent = '✗ Not available';
        fullscreenBtn.style.background = '#95a5a6';
      }
    });

    landscapeBtn.addEventListener('click', async () => {
      landscapeBtn.disabled = true;
      landscapeBtn.style.opacity = '0.5';
      updateStatus('Requesting landscape orientation...');

      try {
        helpers.requestLandscapeOrientation();
        updateStatus('✓ Landscape orientation requested');
        landscapeBtn.textContent = '✓ Landscape requested';
        landscapeBtn.style.background = '#27ae60';
      } catch (err) {
        updateStatus('Orientation request failed');
        landscapeBtn.textContent = '✗ Failed';
        landscapeBtn.style.background = '#95a5a6';
      }
    });

    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.5s ease-out';

      setTimeout(() => {
        splash.remove();
        resolve();
      }, 500);
    });
  });
};

const recalculateCanvasSize = ({ canvas, inputCanvas, inputCanvasContext }) => {
  if (!sharedDisplayInfo) return;

  const renderWidth = Math.floor(RENDER_HEIGHT * (window.innerWidth / window.innerHeight));
  const newDisplayInfo = helpers.generateDisplayInfo({
    width: renderWidth,
    height: RENDER_HEIGHT,
    fieldOfView: 72,
  });

  // If dimensions haven't changed significantly, skip resize
  if (Math.abs(newDisplayInfo.width - sharedDisplayInfo.width) < 10) {
    return;
  }

  isResizing = true;

  // Clear any pending resize
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }

  // Update canvas dimensions
  canvas.width = newDisplayInfo.width;
  canvas.height = newDisplayInfo.height;
  inputCanvas.width = newDisplayInfo.width;
  inputCanvas.height = newDisplayInfo.height;

  // Completely replace displayInfo properties to ensure consistency
  sharedDisplayInfo.width = newDisplayInfo.width;
  sharedDisplayInfo.height = newDisplayInfo.height;
  sharedDisplayInfo.halfWidth = newDisplayInfo.halfWidth;
  sharedDisplayInfo.halfHeight = newDisplayInfo.halfHeight;
  sharedDisplayInfo.halfWidthFloored = newDisplayInfo.halfWidthFloored;
  sharedDisplayInfo.halfHeightFloored = newDisplayInfo.halfHeightFloored;
  sharedDisplayInfo.fieldOfView = newDisplayInfo.fieldOfView;
  sharedDisplayInfo.halfFieldOfView = newDisplayInfo.halfFieldOfView;
  sharedDisplayInfo.angleBetweenRays = newDisplayInfo.angleBetweenRays;
  sharedDisplayInfo.distanceToProjectionPlane = newDisplayInfo.distanceToProjectionPlane;

  console.log(`Canvas resized to ${newDisplayInfo.width}x${newDisplayInfo.height}`);

  // Re-enable rendering after sufficient delay to allow canvas context to stabilize
  resizeTimeout = setTimeout(() => {
    isResizing = false;
    resizeTimeout = null;
  }, 150);
};

const initialise = async () => {
  const isMobile = helpers.isMobileDevice();

  // Show splash screen on mobile to request fullscreen/landscape before initializing
  await setupMobileSplashScreen({ isMobile });

  if (isMobile) {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
  }

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

  // Style canvases for fullscreen display
  canvas.style.display = 'block';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.margin = '0';
  canvas.style.padding = '0';
  canvas.style.objectFit = 'contain';

  inputCanvas.style.position = 'fixed';
  inputCanvas.style.top = '0';
  inputCanvas.style.left = '0';
  inputCanvas.style.width = '100vw';
  inputCanvas.style.height = '100vh';
  inputCanvas.style.margin = '0';
  inputCanvas.style.padding = '0';
  inputCanvas.style.objectFit = 'contain';
  inputCanvas.style.zIndex = '1000';

  sharedDisplayInfo = displayInfo;

  /** @type Types.GameState */
  const gameState = {
    mapState: await map.initialise(),
    playerState: await player.initialise(),
    inputState: await inputsApi.initialise({ inputCanvasContext }),
    minimapState: await minimap.initialise(),
    sceneState: await scene.initialise({ displayInfo }),
    networkClientState: await networkClient.initialise({ onServerStateUpdate: ({ processedServerGameState }) => onServerStateUpdate({ processedServerGameState, gameState }) }),
    centreRay: null,
  }; 

  // Warmup: render one silent frame from the first outdoor cell (if the map has sky).
  // This warms V8's JIT for the sky code path and loads the sky texture into CPU cache,
  // preventing a multi-frame FPS drop the first time the player enters an outdoor area.
  if (gameState.mapState.currentMap.skyTextureId) {
    const warmupPos = findFirstOutdoorCell({ mapState: gameState.mapState });
    if (warmupPos) {
      scene.render({ canvasContext, orientation: { position: warmupPos, angle: 0 }, mapState: gameState.mapState, displayInfo });
    }
  }

  // Logic tick: player movement and network sync at a fixed rate.
  gameLoopInterval = setInterval(() => logicTick({ gameState }), constants.GAME_LOOP_TICK_MS);

  // Render tick: scene rendering synced to vsync via rAF.
  const renderLoop = () => {
    try {
      ++renderFrameCount;
      const { mapState, playerState, inputState } = gameState;

      const { wallRays, centreRay } = scene.render({
        canvasContext,
        orientation: playerState.player.orientation,
        mapState,
        displayInfo: sharedDisplayInfo,
      });

      // Capture centreRay for activation logic
      gameState.centreRay = centreRay;

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

    const { mapState, playerState, inputState, networkClientState, centreRay } = gameState;

    // Handle activation
    if (inputState.activate && centreRay) {
      const activatable = doors.findActivatable({ centreRay, maxDistance: constants.ACTIVATION_DISTANCE });
      if (activatable) {
        doors.toggleDoor({ cell: activatable });
      }
      inputState.activate = false;
    }

    player.move({ playerState, inputState, mapState, deltaMs });
    networkClient.render({ playerState, networkClientState });
  } catch (err) {
    console.error(err);
    clearInterval(gameLoopInterval);
    clearInterval(fpsInterval);
    cancelAnimationFrame(renderFrameId);
  }
};

/**
 * Finds the world-space centre of the first outdoor cell in the map (walkable, no ceiling).
 * Returns null if the map has no outdoor cells.
 * @param {Object} params
 * @param {Types.MapState} params.mapState
 * @returns {{x: number, y: number}|null}
 */
const findFirstOutdoorCell = ({ mapState }) => {
  const { layout } = mapState.currentMap;
  for (let y = 0; y < layout.length; y++) {
    for (let x = 0; x < layout[y].length; x++) {
      const cell = layout[y][x];
      if (!cell.wallTextureId && !cell.ceilingTextureId && cell.floorTextureId) {
        return { x: (x + 0.5) * constants.CELL_SIZE, y: (y + 0.5) * constants.CELL_SIZE };
      }
    }
  }
  return null;
};

const trackFps = () => {
  framesPerSecond = renderFrameCount;
  renderFrameCount = 0;
};

initialise();