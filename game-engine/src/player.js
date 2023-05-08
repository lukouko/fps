import * as textures from './textures';
import * as constants from './constants';
import * as map from './map';
import * as Types from './types';

const gunTypes = Object.freeze({
  ASSAULT_RIFLE: 1,
});

/** @type Object<Types.GunId, Types.GunDefinition> */
const gunDefinitions = {
  [gunTypes.ASSAULT_RIFLE]: {
    id: gunTypes.ASSAULT_RIFLE,
    widthScalingFactor: 0.3,
    heightScalingFactor: 0.3,
    xOffset: 300,
    yOffset: 30,
    gunSwayAmplitude: 1.5,
    gunSwayFrequency: 0.002,
  },
};

/**
 * Returns the initial state representing the player.
 * @returns {Types.PlayerState}
 */
export const initialise = () => ({
  player: {
    orientation: {
      position: {
        x: constants.CELL_SIZE * 1.5,
        y: constants.CELL_SIZE * 12,
      },
      angle: 5.2399,//0,
    },
    isMoving: false,
    selectedGun: gunTypes.ASSAULT_RIFLE,
  },
  gunSwayStartTime: undefined,
});


/**
 * Renders the player to the screen.
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext A 2d canvas context from the canvas which is the render destination.
 * @param {Types.InputState} params.inputState The current input state. Required for gun sway amount (i.e. current input speed).
 * @param {Types.PlayerState} params.playerState The current player state.
 * @param {Types.DisplayInfo} params.displayInfo
 */
export const render = ({ canvasContext, inputState, playerState, displayInfo }) => {
  const { player } = playerState;
  const gunDefinition = gunDefinitions[player.selectedGun];
  const gunTexture = textures.getTextureById({ id: `gun${player.selectedGun}`});

  // Give the gun a bit of sway if we are moving.
  const { gunSwayOffsetX, gunSwayOffsetY } = applyGunSway({
    gunDefinition,
    playerSpeed: inputState.speed,
    playerState,
  });

  // We need to size and position the player gun relative to the size of the canvas
  // to give a consistent look and feel across different devices.
  const gunWidth = canvasContext.canvas.width * gunDefinition.widthScalingFactor;
  const gunHeight = canvasContext.canvas.height * gunDefinition.heightScalingFactor;
  const gunPositionX = canvasContext.canvas.width / 2 - gunWidth / 2 + gunDefinition.xOffset; // horizontal centre with some pixel offset
  const gunPositionY = canvasContext.canvas.height - gunHeight + 1 + gunDefinition.yOffset; // Position at bottom of screen

  canvasContext.drawImage(
    gunTexture.baseImage, 
    0,
    0,                      // Source image Y offset
    gunTexture.width,                      // Source image width
    gunTexture.height,     // Source image height
    Math.floor(gunPositionX + gunSwayOffsetX),  // Target image X offset
    Math.floor(gunPositionY + gunSwayOffsetY),  // Target image Y offset
    gunWidth,                // Target image width
    gunHeight,       // Target image height
  );

  // Draw indicator of target location.
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(displayInfo.halfWidthFloored, displayInfo.halfHeightFloored + 50, 2, 2);
};

/**
 * Applies the current inputs to the player state, i.e. moves the player.
 * @param {Object} params
 * @param {Types.InputState} params.inputState The current input state.
 * @param {Types.PlayerState} params.playerState The current player state.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns 
 */
export const move = ({ inputState, playerState, mapState }) => {
  const { player } = playerState;

  // Calculate player movement.
  player.orientation.angle += (inputState.angularSpeed + (2 * Math.PI)); // We add a full circle rotation to the angular speed to ensure we don't get negative angles.
  player.orientation.angle = player.orientation.angle % (2 * Math.PI); // Normalise to a single circle.
  const xMovement = Math.cos(player.orientation.angle) * inputState.speed;
  const yMovement = Math.sin(player.orientation.angle) * inputState.speed;

  // Clipping checking.

  /** @type Types.Position */
  const hypotheticalCell = {
    x:  Math.floor((player.orientation.position.x + xMovement) / constants.CELL_SIZE),
    y: Math.floor((player.orientation.position.y + yMovement) / constants.CELL_SIZE),
  };

  if (!map.canMoveToCellLocation({ position: hypotheticalCell, mapState })) {
    return;
  }

  // Move the player in space.
  player.orientation.position.x += xMovement;
  player.orientation.position.y += yMovement;
};

/**
 * Applies sway to the player's gun.
 * 
 * @param {Object} params
 * @param {Types.GunDefinition} params.gunDefinition
 * @param {Types.PlayerState} params.playerState The current player state.
 * @param {number} params.playerSpeed The speed currently being applied to the player.
 */
const applyGunSway = ({ gunDefinition, playerState, playerSpeed }) => {
  const { player } = playerState;
  if (playerSpeed === 0) {
    playerState.gunSwayStartTime = undefined;
    return { gunSwayOffsetX: 0, gunSwayOffsetY: 0 };
  }

  if (!playerState.gunSwayStartTime) {
    playerState.gunSwayStartTime = performance.now();
  }

  const adjustedSpeed = playerSpeed < 0 ? -playerSpeed : playerSpeed;
  const magnitude = gunDefinition.gunSwayAmplitude * adjustedSpeed;

  const timeNow = performance.now();
  const timeElapsed = timeNow - playerState.gunSwayStartTime;

  const { gunSwayFrequency } = gunDefinition;
  const gunSwayOffsetX = Math.sin(timeElapsed * gunSwayFrequency) * magnitude;
  const gunSwayOffsetY = Math.sin(timeElapsed * gunSwayFrequency * 2) * magnitude;

  return { gunSwayOffsetX, gunSwayOffsetY };
};

