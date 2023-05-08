import * as gameEngineTextures from 'game-engine/textures';
import * as Types from 'map-editor/types';

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
