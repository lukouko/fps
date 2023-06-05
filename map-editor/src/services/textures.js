import * as gameEngineTextures from 'game-engine/textures';
import * as Types from 'map-editor/types';

export const TextureTypes = Object.freeze({
  WALL: 'WALL',
  FLOOR: 'FLOOR',
  CEILING: 'CEILING',
});

export const TextureTypeLabels = Object.freeze({
  [TextureTypes.WALL]: 'Wall',
  [TextureTypes.FLOOR]: 'Floor',
  [TextureTypes.CEILING]: 'Ceiling',
});

/**
 * Loads all of the assets as textures and stores them in a cache for later access
 * @param {Object} params
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {Promise<undefined>}
 */
export const loadTextures = ({ displayInfo }) => gameEngineTextures.loadTextures({ displayInfo });

/**
 * Returns the texture matching the passed id.
 * @param {Object} params
 * @param {Types.TextureId} params.id
 * @returns {Types.Texture}
 */
export const getTextureById = ({ id }) => gameEngineTextures.getTextureById({ id });

/**
 * Returns an array of TextureIds representing all of the textures available.
 * @returns {Array<Types.TextureId>}
 */
export const getTextureIds = () => gameEngineTextures.getTextureIds();