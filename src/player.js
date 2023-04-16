import * as textures from './textures';
import * as constants from './constants';
import * as map from './map';

const gunTypes = Object.freeze({
  ASSAULT_RIFLE: 1,
});

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

const player = {
  x: constants.CELL_SIZE * 1.5,
  y: constants.CELL_SIZE * 12,
  angle: 5.2399,//0,
  isMoving: false,
  selectedGun: gunTypes.ASSAULT_RIFLE,
  gunSway: {
    startTime: undefined,
  },
};

export const getState = () => player;

export const initialise = () => {
};

const applyGunSway = ({ gunDefinition, playerSpeed }) => {
  if (playerSpeed === 0) {
    player.gunSway.startTime = undefined;
    return { gunSwayOffsetX: 0, gunSwayOffsetY: 0 };
  }

  if (!player.gunSway.startTime) {
    player.gunSway.startTime = performance.now();
  }

  const adjustedSpeed = playerSpeed < 0 ? -playerSpeed : playerSpeed;
  const magnitude = gunDefinition.gunSwayAmplitude * adjustedSpeed;

  const timeNow = performance.now();
  const timeElapsed = timeNow - player.gunSway.startTime;

  const { gunSwayFrequency } = gunDefinition;
  const gunSwayOffsetX = Math.sin(timeElapsed * gunSwayFrequency) * magnitude;
  const gunSwayOffsetY = Math.sin(timeElapsed * gunSwayFrequency * 2) * magnitude;

  return { gunSwayOffsetX, gunSwayOffsetY };
};

export const move = ({ inputs }) => {
  // Gun sway when moving.
  /*if (player.isMoving && inputs.speed === 0) {
    // Player stopped moving, stop the gun sway animation.
    player.isMoving = false;
    stopGunSway();

  } else if (!player.isMoving && inputs.speed !== 0) {
    // Player started moving, commence gun sway animation.
    player.isMoving = true;
    const gunDefinition = gunDefinitions[player.selectedGun];
    const playerSpeed = inputs.speed;
    startGunSway({ gunDefinition, playerSpeed });
  }*/

  // Calculate player movement.
  player.angle += (inputs.angularSpeed + (2 * Math.PI)); // We add a full circle rotation to the angular speed to ensure we don't get negative angles.
  player.angle = player.angle % (2 * Math.PI); // Normalise to a single circle.
  const xMovement = Math.cos(player.angle) * inputs.speed;
  const yMovement = Math.sin(player.angle) * inputs.speed;

  // Clipping checking.
  const hypotheticalXCell = Math.floor((player.x + xMovement) / constants.CELL_SIZE);
  const hypotheticalYCell = Math.floor((player.y + yMovement) / constants.CELL_SIZE);

  if (!map.canMoveToCellLocation({ cellX: hypotheticalXCell, cellY: hypotheticalYCell })) {
    return;
  }

  // Move the player in space.
  player.x += xMovement;
  player.y += yMovement;
};

export const distanceTo = ({ x, y }) => {
  return Math.sqrt(Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2));
};

export const render = ({ canvasContext, inputs }) => {
  const gunDefinition = gunDefinitions[player.selectedGun];
  const gunTexture = textures.getTextureImageById({ id: `gun${player.selectedGun}`});

  // Give the gun a bit of sway if we are moving.
  const { gunSwayOffsetX, gunSwayOffsetY } = applyGunSway({ gunDefinition, playerSpeed: inputs.speed });

  // We need to size and position the player gun relative to the size of the canvas
  // to give a consistent look and feel across different devices.
  const gunWidth = canvasContext.canvas.width * gunDefinition.widthScalingFactor;
  const gunHeight = canvasContext.canvas.height * gunDefinition.heightScalingFactor;
  const gunPositionX = canvasContext.canvas.width / 2 - gunWidth / 2 + gunDefinition.xOffset; // horizontal centre with some pixel offset
  const gunPositionY = canvasContext.canvas.height - gunHeight + 1 + gunDefinition.yOffset; // Position at bottom of screen

  canvasContext.drawImage(
    gunTexture, 
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
  canvasContext.fillRect(constants.HALF_SCREEN_WIDTH_FLOORED, constants.HALF_SCREEN_HEIGHT_FLOORED + 50, 2, 2);
};