const map =[
  [2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 2, 0, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 1, 0, 1, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 3, 3, 0, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 0, 2, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2],
];

export const getCurrent = () => Object.freeze(map);

export const getMapCell = ({ cellX, cellY }) => map[cellY][cellX];

export const initialise = () => {};

export const isOutOfBounds = ({ cellX, cellY }) => {
  return cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length;
};

export const canMoveToCellLocation = ({ cellX, cellY }) => {
  if (Number.isNaN(cellX) || Number.isNaN(cellY)) {
    throw new Error('Invalid cell number passed');
  }
  
  return isOutOfBounds({ cellX, cellY }) || map[cellY][cellX] !== 0;
};