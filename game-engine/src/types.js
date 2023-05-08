//////////// General types ////////////

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Orientation
 * @property {Position} position
 * @property {number} angle
 */

/**
 * @typedef {Object} DisplayInfo
 * @property {number} width
 * @property {number} height
 * @property {number} halfWidth
 * @property {number} halfHeight
 * @property {number} halfWidthFloored
 * @property {number} halfHeightFloored
 * @property {number} fieldOfView In radians
 * @property {number} halfFieldOfView In radians
 * @property {number} angleBetweenRays In radians
 * @property {number} distanceToProjectionPlane
 */

//////////// Player types ////////////

/**
 * @typedef {number} GunId
 */

/**
 * @typedef {Object} GunDefinition
 * @property {GunId} id
 * @property {number} widthScalingFactor
 * @property {number} heightScalingFactor
 * @property {number} xOffset
 * @property {number} yOffset
 * @property {number} gunSwayAmplitude
 * @property {number} gunSwayFrequency
 */

/**
 * @typedef {Object} Player
 * @property {Orientation} orientation
 * @property {boolean} isMoving
 * @property {GunId} selectedGun
 */

/**
 * @typedef {Object} PlayerState
 * @property {Player} player
 * @property {number} gunSwayStartTime
 */

//////////// Input types ////////////

/**
 * @typedef {Object} Inputs
 * @property {number} speed The current forward or backward speed being applied.
 * @property {number} angularSpeed The current angular speed being applied (radians)
 * @property {boolean} enableMiniMap Whether or not the minimap is currently enabled.
 * @property {boolean} isRunning True if running, false otherwise.
 */

/**
 * @typedef {Inputs} InputState
 */

//////////// Map types ////////////

/**
 * @typedef {Number} MapCell
 */

/**
 * @typedef {Array<Array<MapCell>>} MapLayout
 */

/**
 * @typedef {Object} Map
 * @property {MapLayout} layout
 */

/**
 * @typedef {Object} MapState
 * @property {Map} currentMap
 * @property {Position} scaledMapBounds
 * @property {Position} unscaledMapBounds
 */

//////////// Texture types ////////////

/**
 * @typedef {string} TextureId
 */

/**
 * @typedef {Object} Texture
 * @property {HTMLImageElement} baseImage
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} canvasContext
 * @property {ImageData} imageData
 * @property {Uint8ClampedArray} pixelBuffer
 * @property {number} bytesPerRow
 * @property {number} width
 * @property {number} height
 */

//////////// Scene types ////////////

/**
 * @typedef {Object} RayCollision
 * @property {Orientation} source The source perspective from which the ray was cast.
 * @property {MapCell} mapCell The cell in which the collision occured.
 * @property {number} distance The distance from the ray propagation point to the collision point in scaled map space.
 * @property {boolean} isVertical True if the collision occured on the y axis, false otherwise.
 * @property {boolean} isHorizontal True if the collision occurex on the x axis, false otherwise.
 * @property {Position} collisionPoint The point in scaled map space in which the collision occurred.
 * @property {Position} collisionCell The cell in standard map space in which the collision occurred.
 */

/** @typedef {Object} SceneState */

//////////// Minimap types ////////////
/** @typedef {Object} MiniMapState */


// Engine types
/**
 * @typedef {Object} GameState
 * @property {InputState} inputState
 * @property {MapState} mapState
 * @property {PlayerState} playerState
 * @property {MiniMapState} minimapState
 * @property {SceneState} sceneState
 */
export const Types = {};
