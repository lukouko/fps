import * as constants from '../constants';
import * as Types from '../types';
// @ts-ignore
import map1 from './map1.json';

/** @type Types.Map */
const defaultMap = map1;

/**
 * Initialises map state.
 * @returns {Types.MapState}
 */
export const initialise = () => ({
  currentMap: defaultMap,
  scaledMapBounds: { 
    x: defaultMap.layout[0].length * constants.CELL_SIZE,
    y: defaultMap.layout.length * constants.CELL_SIZE,
  },
  unscaledMapBounds: {
    x: defaultMap.layout[0].length,
    y: defaultMap.layout.length,
  },
});

/**
 * Returns the map cell at a given position in unscaled map cell space.
 * 
 * @param {Object} params
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.Position} params.position Position in unscaled map space.
 * @returns {Types.MapCell}
 */
export const getMapCell = ({ mapState, position }) => mapState.currentMap.layout[position.y][position.x];

/**
 * Returns true if the given position is out of bounds, false otherwise.
 * 
 * @param {Object} params
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.Position} params.position The position in unscaled map cell space.
 * @returns {boolean}
 */
export const isOutOfBounds = ({ mapState, position }) => {
  return position.x < 0 || position.x >= mapState.unscaledMapBounds.x || position.y < 0 || position.y >= mapState.unscaledMapBounds.y;
};

/**
 * Determines whether or not a map cell location is a valid location within the map.
 * 
 * @param {Object} params
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.Position} params.position The position to check in unscaled map cell space.
 * @returns {boolean} True if the location is valid, false otherwise.
 */
export const canMoveToCellLocation = ({ mapState, position }) => {  
  return isOutOfBounds({ mapState, position }) || !mapState.currentMap.layout[position.y][position.x].wallTextureId;
};

/**
 * Determines whether or not the passed map is valid.
 * 
 * @param {Object} params
 * @param {Types.Map} params.map The map to be validated.
 * @throws {Error} If the passed map fails validation checks.
 */
export const validateMap = ({ map }) => {
  if (!map || typeof map !== 'object') {
    throw new Error(`'map' must be an object`);
  }

  if (!map.layout || !Array.isArray(map.layout)) {
    throw new Error(`'map.layout' must be a valid array`);
  }

  if (map.layout.length === 0) {
    throw new Error(`'map.layout' must have at least one element`);
  }

  map.layout.forEach((row, yIndex) => {
    if (!row || !Array.isArray(row)) {
      throw new Error(`'map.layout[${yIndex}]' must be a valid array`);
    }

    if (row.length === 0) {
      throw new Error(`'map.layout[${yIndex}]' must have at least one element`);
    }

    row.forEach((cell, xIndex) => {
      if (!cell || typeof cell !== 'object') {
        throw new Error(`'map.layout[${yIndex}][${xIndex}]' must be an object, got ${typeof cell}`);
      }

      if (!cell.wallTextureId && (!cell.floorTextureId || !cell.ceilingTextureId))

      if (yIndex === 0 || yIndex === map.layout.length - 1 || xIndex === 0 || xIndex === row.length - 1) {
        if (!cell) {
          throw new Error(`'map.layout[${yIndex}][${xIndex}]' must have a wall as it is an exterior cell`);
        }
      }
    });
  });
};
