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
 * @property {boolean} isDead
 * @property {GunId} selectedGun
 */

/**
 * @typedef {Object} PlayerState
 * @property {Player} player
 * @property {number} gunSwayStartTime
 */

//////////// Input types ////////////

/**
 * @typedef {'KEYBOARD'|'MOBILE'} InputMethod
 */

/**
 * @typedef {Object} Inputs
 * @property {number} speed The current forward or backward speed being applied.
 * @property {number} angularSpeed The current angular speed being applied (radians)
 * @property {boolean} enableMiniMap Whether or not the minimap is currently enabled.
 * @property {boolean} isRunning True if running, false otherwise.
 * @property {boolean} activate Edge-triggered: true once per activation press, consumed by the game loop.
 */

/**
 * @typedef {Inputs} InputState
 */

//////////// Map types ////////////

/**
 * @typedef {Object} LightColor
 * @property {number} r Red channel 0–255
 * @property {number} g Green channel 0–255
 * @property {number} b Blue channel 0–255
 */

/**
 * @typedef {Object} MapCell
 * @property {TextureId|undefined} wallTextureId
 * @property {TextureId|undefined} floorTextureId
 * @property {TextureId|undefined} ceilingTextureId
 * @property {LightColor|undefined} lightColor Optional tint applied to all surfaces rendered in this cell.
 * @property {boolean|undefined} door True if this cell is a door.
 * @property {TextureId|undefined} doorTextureId Texture for the door when closed.
 * @property {number|undefined} openness Runtime: 0 = closed, 1 = open. Deleted door cells restore wallTextureId on close.
 * @property {string|undefined} keyId Runtime: if set, door requires this key to open (Task 6).
 */

/**
 * @typedef {'door'} ActivatableType
 */

/**
 * @typedef {Object} ActivatableTypeDefinition
 * @property {string} noun The noun for the activatable (e.g. "Door").
 * @property {string} verbOn The verb when activating to turn on (e.g. "Open").
 * @property {string} verbOff The verb when activating to turn off (e.g. "Close").
 */

/**
 * @typedef {Object} Sprite
 * @property {Position} position
 * @property {TextureId} textureId
 * @property {number} [heightOffset] 0=floor-standing (default), positive=raised above floor (0.5 = bottom at eye level)
 */

/**
 * @typedef {Array<Array<MapCell>>} MapLayout
 */

/**
 * @typedef {Object} Map
 * @property {MapLayout} layout
 * @property {Array<Sprite>} staticSprites Map-defined decoration; never overwritten by server updates.
 * @property {Array<Sprite>} sprites Dynamic sprites (other players, enemies) from the server.
 * @property {TextureId} [skyTextureId] Optional map-global sky texture shown wherever a cell has no ceilingTextureId.
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
 * @property {MapCell|null} nearCell The walkable cell on the player's side of the wall — used for sector light color.
 * @property {number} distance The distance from the ray propagation point to the collision point in scaled map space.
 * @property {boolean} isVertical True if the collision occured on the y axis, false otherwise.
 * @property {boolean} isHorizontal True if the collision occurex on the x axis, false otherwise.
 * @property {Position} collisionPoint The point in scaled map space in which the collision occurred.
 * @property {Position} collisionCell The cell in standard map space in which the collision occurred.
 */

/** @typedef {Object} SceneState */

//////////// Minimap types ////////////
/** @typedef {Object} MiniMapState */

//////////// Network Client Types ////////////
/** @typedef {'CLIENT'|'SERVER'} NetworkMessageSource */

/**
 * @typedef {Object} ClientConnectionMessage
 * @property {string} playerName
 * @property {string} id
 * @property {string} avatar
 */

/** 
 * @typedef {Object} ClientDataMessage 
 * @property {Position} playerPosition
 * @property {boolean} [isDead] 
 */

/** 
 * @typedef {Object} ClientNetworkMessage 
 * @property {NetworkMessageSource} source
 * @property {'CONNECT'|'DATA'|'DISCONNECT'} type
 * @property {ClientConnectionMessage|ClientDataMessage} payload
 */

/**
 * @typedef {Object} NetworkClientState
 * @property {Object} wsClient
 * @property {number} ticksSinceLastPing
 */

/**
 * @typedef {Object} ServerPlayerState
 * @property {Position} playerPosition
 */

/**
 * @typedef {Object} ServerGameState
 * @property {Object<string, ServerPlayerState>} players
 */

/**
 * @typedef {Object} ServerGameStateMessage
 * @property {ServerGameState} serverGameState
 */

/**
 * @typedef {Object} ServerConnectionEstablishedMessage
 * @property {ServerGameState} serverGameState
 * @property {string} clientId
 */

/**
 * @typedef {Object} ProcessedServerGameState
 * @property {Array<Sprite>} sprites
 */

// Engine types
/**
 * @typedef {Object} GameState
 * @property {InputState} inputState
 * @property {MapState} mapState
 * @property {PlayerState} playerState
 * @property {MiniMapState} minimapState
 * @property {SceneState} sceneState
 * @property {NetworkClientState} networkClientState
 * @property {RayCollision|null} centreRay The ray cast from the player's centre; used for activation.
 */
export const Types = {};
