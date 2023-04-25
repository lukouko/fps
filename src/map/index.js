import * as constants from '../constants';
import * as mapEditor from './editor';
import defaultMap from './map1';

let map = defaultMap;

export const getState = () => Object.freeze(map);

export const setMap = ({ newMap }) => map = newMap;

export const getScaledMapSize = () => ({ x: map[0].length * constants.CELL_SIZE, y: map.length * constants.CELL_SIZE });

export const getMapCell = ({ cellX, cellY }) => map[cellY][cellX];

export const initialise = () => {};

export const isOutOfBounds = ({ cellX, cellY }) => {
  return cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length;
};

export const canMoveToCellLocation = ({ cellX, cellY }) => {  
  return isOutOfBounds({ cellX, cellY }) || map[cellY][cellX] === 0;
};

export const editor = mapEditor;

