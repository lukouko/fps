import * as constants from './constants';

const map =[
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 3, 0, 2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
];

export const getState = () => Object.freeze(map);

export const getScaledMapSize = () => ({ x: map[0].length * constants.CELL_SIZE, y: map.length * constants.CELL_SIZE });

export const getMapCell = ({ cellX, cellY }) => map[cellY][cellX];

export const initialise = () => {};

export const isOutOfBounds = ({ cellX, cellY }) => {
  return cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length;
};

export const canMoveToCellLocation = ({ cellX, cellY }) => {  
  return isOutOfBounds({ cellX, cellY }) || map[cellY][cellX] === 0;
};