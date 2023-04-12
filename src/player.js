import { getTextureImageById } from './textures';
import * as constants from './constants';
import * as map from './map';

const player = {
  x: constants.CELL_SIZE * 1.25,
  y: constants.CELL_SIZE * 3,
  angle: 0,
};

export const getCurrent = () => Object.freeze(player);

export const initialise = () => {

};

export const move = ({ inputs }) => {
  player.angle += inputs.angularSpeed;
  const xMovement = Math.cos(player.angle) * inputs.speed;
  const yMovement = Math.sin(player.angle) * inputs.speed;

  // Clipping checking.
  const hypotheticalXCell = Math.floor((player.x + xMovement) / constants.CELL_SIZE);
  const hypotheticalYCell = Math.floor((player.y + yMovement) / constants.CELL_SIZE);

  if (!map.canMoveToCellLocation({ cellX: hypotheticalXCell, cellY: hypotheticalYCell })) {
    return;
  }

  player.x += xMovement;
  player.y += yMovement;
};

export const distanceTo = ({ x, y }) => {
  return Math.sqrt(Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2));
};

export const render = ({ }) => {

};