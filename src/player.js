import * as textures from './textures';
import * as constants from './constants';
import * as map from './map';

const gunTypes = Object.freeze({
  UZI: 1,
});

const player = {
  x: constants.CELL_SIZE * 1.25,
  y: constants.CELL_SIZE * 3,
  angle: 0,
  isMoving: false,
  selectedGun: gunTypes.UZI,
};

export const getState = () => player;

export const initialise = () => {

};

export const move = ({ inputs }) => {
  // Gun sway when moving.
  if (player.isMoving && inputs.speed === 0) {
    // Player stopped moving, stop the gun sway animation.

  } else if (!player.isMoving && inputs.speed !== 0) {
    // Player started moving, commence gun sway animation.
  }

  // Calculate player movement.
  player.angle += inputs.angularSpeed;
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
  const gunTexture = textures.getTextureImageById({ id: `gun${player.selectedGun}`});
  canvasContext.drawImage(
    gunTexture, 
    0,
    0,                      // Source image Y offset
    gunTexture.width,                      // Source image width
    gunTexture.height,     // Source image height
    Math.floor(constants.HALF_SCREEN_WIDTH - gunTexture.width / 2) + 200,  // Target image X offset
    constants.SCREEN_HEIGHT - gunTexture.height * 1.5,  // Target image Y offset
    gunTexture.width * 1.5,                // Target image width
    gunTexture.height * 1.5,       // Target image height
  );

  // Draw indicator of target location.
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(constants.HALF_SCREEN_WIDTH_FLOORED, constants.HALF_SCREEN_HEIGHT_FLOORED + 50, 2, 2);
};