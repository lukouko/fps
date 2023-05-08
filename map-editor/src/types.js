import * as GameEngineTypes from 'game-engine/types';

//////////// Game engine types ////////////
/** @typedef {GameEngineTypes.Position} Position */
/** @typedef {GameEngineTypes.Orientation} Orientation */
/** @typedef {GameEngineTypes.DisplayInfo} DisplayInfo */

//////////// Map types ////////////
/** @typedef {GameEngineTypes.Map} Map */
/** @typedef {GameEngineTypes.MapState} MapState */

//////////// Input types ////////////
/** @typedef {GameEngineTypes.Inputs} Inputs */
/** @typedef {Inputs} InputState */

//////////// Camera types ////////////

/**
 * @typedef {Object} Camera
 * @property {Orientation} orientation
 * @property {boolean} isMoving
 */

/**
 * @typedef {Object} CameraState
 * @property {Camera} camera
 */


//////////// Texture types ////////////

/** @typedef {GameEngineTypes.TextureId} TextureId */
/** @typedef {GameEngineTypes.Texture} Texture */

//////////// Scene types ////////////

/** @typedef {GameEngineTypes.RayCollision} RayCollision */
/** @typedef {GameEngineTypes.SceneState} SceneState */


//////////// Engine types ////////////
/**
 * @typedef {Object} GameState
 * @property {InputState} inputState
 * @property {MapState} mapState
 * @property {CameraState} cameraState
 * @property {SceneState} sceneState
 */


export const Types = {};