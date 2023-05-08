import * as gameEngineScene from 'game-engine/scene';
import * as Types from 'map-editor/types';

/**
 * Inialises scene resources.
 * @param {Object} params
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {Types.SceneState}
 */
export const initialise = ({ displayInfo }) => gameEngineScene.initialise({ displayInfo });

/**
 * Renders the map scene to a canvas context relative to an orientation point.
 * 
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext A destination 2d context of a HTML5 canvas to which the scene will be rendered.
 * @param {Types.Orientation} params.orientation The perspective from which the scene is to be rendered.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {{wallRays: Array<Types.RayCollision>}}
 */
export const render = ({ canvasContext, orientation, mapState, displayInfo }) => 
  gameEngineScene.render({ canvasContext, orientation, mapState, displayInfo });