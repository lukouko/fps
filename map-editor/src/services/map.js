import * as constants from 'game-engine/constants';
import * as gameEngineMap from 'game-engine/map';
import * as Types from 'map-editor/types';

/**
 * @returns {Types.MapState}
 */
export const initialise = () => {
  const newMap = createNewMap({ width: 5, height: 5 });
  gameEngineMap.validateMap({ map: newMap });
  return createNewMapState({ newMap });
};

/**
 * Creates a new generated map.
 * @param {Object} params
 * @param {number} params.width
 * @param {number} params.height
 * @returns {Types.Map}
 */
export const createNewMap = ({ width, height }) => {
  const defaultWallTextureId = 'bricks_1';
  const defaultFloorTextureId = 'tiles_1';
  const defaultCeilingTextureId = 'plaster_1';

  const newMapLayout = [];

  for (let yIndex = 0; yIndex < height; ++yIndex) {
    newMapLayout[yIndex] = [];

    for (let xIndex = 0; xIndex < width; ++xIndex) {
      // If we are at the edge of the map, set a default wall texture.
      if (yIndex === 0 || yIndex === (height - 1) || xIndex === 0 || xIndex === (width - 1)) {
        newMapLayout[yIndex][xIndex] = 1;
        /*newMapLayout[yIndex][xIndex] = {
          wallTextureId: defaultWallTextureId,
        };*/
      } else {
        newMapLayout[yIndex][xIndex] = 0;
        /*newMapLayout[yIndex][xIndex] = {
          floorTextureId: defaultFloorTextureId,
          ceilingTextureId: defaultCeilingTextureId,
        };*/
      }
    }
  }

  return {
    layout: newMapLayout,
  };
};

/**
 * Creates a MapState object based on a new Map object.
 * @param {Object} params
 * @param {Types.Map} params.newMap The new map to apply to the map state.
 * @returns {Types.MapState} 
 */
export const createNewMapState = ({ newMap }) => {
  return {
    currentMap: newMap,
    scaledMapBounds: { 
      x: newMap.layout[0].length * constants.CELL_SIZE,
      y: newMap.layout.length * constants.CELL_SIZE,
    },
    unscaledMapBounds: {
      x: newMap.layout[0].length,
      y: newMap.layout.length,
    },
  };
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
  return gameEngineMap.canMoveToCellLocation({ mapState, position });
};
