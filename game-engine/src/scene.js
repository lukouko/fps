import * as constants from './constants';
import * as textures from './textures';
import * as helpers from './helpers';
import * as Types from './types';
import { isOutOfBounds, getMapCell } from './map';
import { OffScreenBuffer } from './offscreen-buffer';

let offScreenBuffer;

const localCache = {
  rayBaseAngleByScreenColumn: {},
  // cos of each column's angle offset — used for perpendicular-distance depth testing in sprite rendering.
  cosineByScreenColumn: {},
  offScreenBufferBytesPerRow: 0,
};

/**
 * Inialises scene resources.
 * 
 * @param {Object} params
 * @param {Types.DisplayInfo} params.displayInfo
 */
export const initialise = ({ displayInfo }) => {
  if (!displayInfo || typeof displayInfo !== 'object') {
    throw new Error('displayInfo must be a valid object');
  }

  // Screen buffer stuff
  offScreenBuffer = new OffScreenBuffer({ width: displayInfo.width, height: displayInfo.height });

  // Initialise the local cache.
  const bytesPerPixel = 4;

  localCache.offScreenBufferBytesPerRow = offScreenBuffer.width * bytesPerPixel;

  // Precompute per-column angle offsets using arctan so that each ray maps to an
  // equal interval in screen space rather than an equal angular interval. Equal-angle
  // stepping causes non-linear texture sampling (tan of a linear angle), which makes
  // textures visibly curve at the screen edges. Arctan spacing makes the wall
  // intersection point linear in screen-column, matching true perspective projection.
  for (let screenColumn = 0; screenColumn < displayInfo.width; ++screenColumn) {
    const ratio = (screenColumn - displayInfo.halfWidth) / displayInfo.distanceToProjectionPlane;
    localCache.rayBaseAngleByScreenColumn[screenColumn] = Math.atan(ratio);
    // cos(atan(x)) = 1/sqrt(1+x²) — no Math.cos needed.
    localCache.cosineByScreenColumn[screenColumn] = 1 / Math.sqrt(1 + ratio * ratio);
  }
};

/**
 * Maps a ray angle and ceiling screen row to texel coordinates in a sky texture.
 * Exported for unit testing.
 *
 * @param {Object} params
 * @param {number} params.rayAngle The angle of the ray for this screen column (radians, any range).
 * @param {number} params.ceilScreenY The screen-space Y of the ceiling pixel (0 = top of screen, halfHeight = horizon).
 * @param {number} params.halfHeight Half the screen height in pixels.
 * @param {number} params.skyTextureWidth Width of the sky texture in pixels.
 * @param {number} params.skyTextureHeight Height of the sky texture in pixels.
 * @returns {{ texX: number, texY: number }}
 */
export const skyTexelCoords = ({ rayAngle, ceilScreenY, halfHeight, skyTextureWidth, skyTextureHeight }) => {
  // Normalise the ray angle to [0, 2π) so the full rotation maps evenly across the texture width.
  const normAngle = ((rayAngle % constants.TWO_PI) + constants.TWO_PI) % constants.TWO_PI;
  const texX = Math.floor(normAngle / constants.TWO_PI * skyTextureWidth) % skyTextureWidth;
  // ceilScreenY=0 (top of screen) → texY=0 (top of sky); ceilScreenY=halfHeight (horizon) → texY=height-1.
  const texY = Math.min(Math.floor(ceilScreenY * skyTextureHeight / halfHeight), skyTextureHeight - 1);
  return { texX, texY };
};

/**
 * Renders the map scene to a canvas context relative to an orientation point.
 *
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext A destination 2d context of a HTML5 canvas to which the scene will be rendered.
 * @param {Types.Orientation} params.orientation The perspective from which the scene is to be rendered.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {{wallRays: Array<Types.RayCollision>, centreRay: Types.RayCollision}}
 */
export const render = ({ canvasContext, orientation, mapState, displayInfo }) => {
  offScreenBuffer.clear();

  const offScreenBufferPixels = offScreenBuffer.getPixels();
  const wallRays = [];
  let centreRay;

  // Look up the sky texture once per frame — null when no sky is configured.
  const skyTexture = mapState.currentMap.skyTextureId
    ? textures.getTextureById({ id: mapState.currentMap.skyTextureId })
    : null;

  /** @type Types.Orientation */
  const rayOrientation = { ...orientation };

  for (let rayIndex = 0; rayIndex < displayInfo.width; ++rayIndex) {
    rayOrientation.angle = orientation.angle + localCache.rayBaseAngleByScreenColumn[rayIndex];

    const rayCollision = castWallRay({ orientation: rayOrientation, mapState });
    wallRays.push(rayCollision);

    if (rayIndex === displayInfo.halfWidthFloored) {
      centreRay = rayCollision;
    }

    renderWallRay({ offScreenBufferPixels, orientation, mapState, rayCollision, rayIndex, displayInfo, skyTexture });
  }

  renderSprites({ offScreenBufferPixels, wallRays, orientation, mapState, displayInfo });
  
  canvasContext.putImageData(offScreenBuffer.getImageData(), 0, 0);

  // Other parts of the app may need to make use of the rays we cast onto the walls.
  return { wallRays, centreRay };
};

/**
 * Casts two rays from a set position and returns the nearest collision point of the two rays.
 * One ray is cast checking for collisions on the X axis, the other is cast checking for collisions on the Y axis.
 * 
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} The closest collision in the map measured from the orientation position. 
 */
const castWallRay = ({ orientation, mapState }) => {
  const verticalCollision = calculateVerticalCollision({ orientation, mapState });
  const horizontalCollision = calculateHorizontalCollision({ orientation, mapState });

  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

/**
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} 
 */
const calculateVerticalCollision = ({ orientation, mapState }) => {
  const { position: sourcePosition, angle } = orientation;

  // Check for vertical collisions.
  const isAngleFacingRight = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2) !== 0;

  // const firstX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstX = isAngleFacingRight
    ? Math.floor(sourcePosition.x / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE
    : Math.floor(sourcePosition.x / constants.CELL_SIZE) * constants.CELL_SIZE;

  const firstY = sourcePosition.y + (firstX - sourcePosition.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? constants.CELL_SIZE : -constants.CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  const result = {
    source: orientation,
    mapCell: undefined, 
    distance: -1, 
    isVertical: true,
    isHorizontal: false,
    collisionPoint: {
      x: firstX,
      y: firstY,
    },
    collisionCell: {
      x: undefined,
      y: undefined,
    },
  };

  while (!result.mapCell?.wallTextureId) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    result.collisionCell.y = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell?.wallTextureId) {
      result.collisionPoint.x += xStepSize;
      result.collisionPoint.y += yStepSize;
    }
  }

  result.distance = helpers.distanceBetween({ positionA: sourcePosition, positionB: result.collisionPoint });
  return result;
};

/**
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} 
 */
const calculateHorizontalCollision = ({ orientation, mapState }) => {
  const { position: sourcePosition, angle } = orientation;
  
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(sourcePosition.y / constants.CELL_SIZE) * constants.CELL_SIZE :
    Math.floor(sourcePosition.y / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE;

  const firstX = sourcePosition.x + (firstY - sourcePosition.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -constants.CELL_SIZE : constants.CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  const result = {
    source: orientation,
    mapCell: undefined, 
    distance: -1, 
    isVertical: false,
    isHorizontal: true,
    collisionPoint: {
      x: firstX,
      y: firstY,
    },
    collisionCell: {
      x: undefined,
      y: undefined,
    },
  };

  while (!result.mapCell?.wallTextureId) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = Math.floor(nextX / constants.CELL_SIZE);
    result.collisionCell.y = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell?.wallTextureId) {
      result.collisionPoint.y += yStepSize;
      result.collisionPoint.x += xStepSize;
    }
  }

  result.distance = helpers.distanceBetween({ positionA: sourcePosition, positionB: result.collisionPoint });
  return result;
}

/**
 * Renders the result of a wall ray collision. This function will effectively render a single pixel wide vertical
 * column to the off screen buffer.
 *
 * @param {Object} params
 * @param {Object} params.offScreenBufferPixels The array of pixels representing the projection plane.
 * @param {Types.Orientation} params.orientation The perspective point from where the ray was cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.RayCollision} params.rayCollision The resulting collision of the ray cast
 * @param {number} params.rayIndex The index in the set of (FOV / displayInfo.width) rays that are cast per render cycle.
 * @param {Types.DisplayInfo} params.displayInfo
 * @param {Types.Texture|null} params.skyTexture The map's sky texture, or null if no sky is configured.
 */
const renderWallRay = ({ offScreenBufferPixels, orientation, mapState, rayCollision, rayIndex, displayInfo, skyTexture }) => {
  const { wallTextureId } = rayCollision.mapCell;

  const wallTexture = textures.getTextureById({ id: wallTextureId });

  // Convert Euclidean ray distance to perpendicular (projection-plane) distance to
  // prevent the wall-height fisheye that results from using the raw Euclidean distance.
  const distance = rayCollision.distance * Math.cos(rayCollision.source.angle - orientation.angle);
  const wallHeight = Math.floor(constants.CELL_SIZE * displayInfo.distanceToProjectionPlane / distance);
  const halfWallHeight = wallHeight / 2;
  // Retain the sub-pixel fractional part of the collision coordinate for bilinear X filtering.
  // Math.floor was previously used here, discarding that fraction and causing nearest-neighbour sampling.
  const rawTexCoord = rayCollision.isVertical ? rayCollision.collisionPoint.y : rayCollision.collisionPoint.x;
  const texXRaw  = rawTexCoord % wallTexture.width;  // float in [0, textureWidth)
  const texXInt  = texXRaw | 0;                       // integer column
  const texXFrac = texXRaw - texXInt;                 // fractional part for bilinear lerp

  // Shade: distance fog clamped to a minimum, with horizontal faces (N/S) dimmed to
  // create a cheap directional-light illusion that makes geometry more readable.
  const distFactor = Math.min(1.0, constants.WALL_SHADE_FULL_BRIGHT_DISTANCE / distance);
  const shade = (Math.max(constants.WALL_SHADE_MIN, distFactor)
    * (rayCollision.isHorizontal ? constants.WALL_SHADE_HORIZONTAL_DIM : 1.0)
    * 255 + 0.5) | 0;

  // Draw walls.
  offScreenBuffer.drawVerticalBufferSlice({
    sourcePixels: wallTexture.pixelBuffer,
    sourceX: texXInt,
    texXFrac,
    sourceWidth: wallTexture.width,
    sourceHeight: wallTexture.height,
    destinationX: rayIndex,
    destinationY: displayInfo.halfHeightFloored - Math.floor(halfWallHeight),
    destinationHeight: wallHeight,
    shade,
  });

  // Draw floor and ceiling.
  const bytesPerPixel = 4;
  const bottomOfWall = Math.floor(displayInfo.halfHeight + halfWallHeight);
  const topOfWall = Math.floor(displayInfo.halfHeight - halfWallHeight);

  if (topOfWall <= 0 && bottomOfWall > displayInfo.height) {
    return;
  }

  // Hoist everything that is constant for this screen column out of the pixel loop.
  // Previously cos/sin were recomputed on every floor/ceiling pixel — 4 trig calls per pixel.
  const floorBase = displayInfo.distanceToProjectionPlane * constants.PLAYER_HEIGHT
    / Math.cos(rayCollision.source.angle - orientation.angle);
  const cosRayAngle = Math.cos(rayCollision.source.angle);
  const sinRayAngle = Math.sin(rayCollision.source.angle);
  const playerX = orientation.position.x;
  const playerY = orientation.position.y;
  const mapBoundsX = mapState.unscaledMapBounds.x;
  const mapBoundsY = mapState.unscaledMapBounds.y;
  const mapLayout = mapState.currentMap.layout;
  const halfHeight = displayInfo.halfHeight;
  const bytesPerRow = localCache.offScreenBufferBytesPerRow;
  const colOffset = bytesPerPixel * rayIndex;
  const pixelsToRender = displayInfo.height + 1;

  // Slope-based shade: floorShadeSlope * (floorY - halfHeight) == FULL_BRIGHT_DIST * 255 / diagonalDist,
  // which is the same shade formula as walls but avoids a division inside the pixel loop.
  const floorShadeSlope = constants.WALL_SHADE_FULL_BRIGHT_DISTANCE * 255 / floorBase;
  const floorMinShade = constants.WALL_SHADE_MIN * 255 | 0;

  let floorBufIdx = Math.floor(bottomOfWall * bytesPerRow + colOffset);
  let ceilBufIdx = Math.floor(topOfWall * bytesPerRow + colOffset);

  // Precompute sky X for this column — constant because the ray angle doesn't change within a column.
  const skyTexX = skyTexture
    ? skyTexelCoords({ rayAngle: rayCollision.source.angle, ceilScreenY: 0, halfHeight, skyTextureWidth: skyTexture.width, skyTextureHeight: skyTexture.height }).texX
    : 0;

  for (let floorY = bottomOfWall; floorY <= pixelsToRender; ++floorY) {
    const diagonalDist = Math.floor(floorBase / (floorY - halfHeight));
    const xEnd = Math.floor(diagonalDist * cosRayAngle + playerX);
    const yEnd = Math.floor(diagonalDist * sinRayAngle + playerY);

    const cellX = Math.floor(xEnd / constants.CELL_SIZE);
    const cellY = Math.floor(yEnd / constants.CELL_SIZE);

    if (cellX < 0 || cellX >= mapBoundsX || cellY < 0 || cellY >= mapBoundsY) continue;

    const mapCell = mapLayout[cellY][cellX];

    // Guard against wall cells that the floor-plane trace occasionally lands on at map edges.
    const floorTexture = mapCell.floorTextureId ? textures.getTextureById({ id: mapCell.floorTextureId }) : null;
    const ceilingTexture = mapCell.ceilingTextureId ? textures.getTextureById({ id: mapCell.ceilingTextureId }) : null;

    // Sky is drawn into the ceiling slot only for open (non-wall) cells with no ceiling texture.
    const canDrawSky = skyTexture && !mapCell.wallTextureId && !ceilingTexture;

    if (!floorTexture && !ceilingTexture && !canDrawSky) continue;

    // World-space texel coordinate — the same sample position is used for both floor and ceiling.
    const refTexture = floorTexture || ceilingTexture;
    const srcIdx = refTexture
      ? (yEnd % refTexture.height) * refTexture.bytesPerRow + (xEnd % refTexture.width) * bytesPerPixel
      : 0;

    let pixelShade = floorShadeSlope * (floorY - halfHeight) | 0;
    if (pixelShade > 255) pixelShade = 255;
    if (pixelShade < floorMinShade) pixelShade = floorMinShade;

    if (floorTexture) {
      offScreenBufferPixels[floorBufIdx]     = floorTexture.pixelBuffer[srcIdx]     * pixelShade >> 8;
      offScreenBufferPixels[floorBufIdx + 1] = floorTexture.pixelBuffer[srcIdx + 1] * pixelShade >> 8;
      offScreenBufferPixels[floorBufIdx + 2] = floorTexture.pixelBuffer[srcIdx + 2] * pixelShade >> 8;
      offScreenBufferPixels[floorBufIdx + 3] = floorTexture.pixelBuffer[srcIdx + 3];
    }

    if (ceilingTexture) {
      offScreenBufferPixels[ceilBufIdx]     = ceilingTexture.pixelBuffer[srcIdx]     * pixelShade >> 8;
      offScreenBufferPixels[ceilBufIdx + 1] = ceilingTexture.pixelBuffer[srcIdx + 1] * pixelShade >> 8;
      offScreenBufferPixels[ceilBufIdx + 2] = ceilingTexture.pixelBuffer[srcIdx + 2] * pixelShade >> 8;
      offScreenBufferPixels[ceilBufIdx + 3] = ceilingTexture.pixelBuffer[srcIdx + 3];
    } else if (canDrawSky && ceilBufIdx >= 0) {
      // Sample sky texture using parallax X (from ray angle) and vertical Y (screen row → sky row).
      const ceilScreenY = topOfWall - (floorY - bottomOfWall);
      const skyTexY = Math.min(Math.floor(ceilScreenY * skyTexture.height / halfHeight), skyTexture.height - 1);
      const skySrcIdx = skyTexY * skyTexture.bytesPerRow + skyTexX * bytesPerPixel;
      // Sky is rendered at full brightness — no distance fog on an infinite sky.
      offScreenBufferPixels[ceilBufIdx]     = skyTexture.pixelBuffer[skySrcIdx];
      offScreenBufferPixels[ceilBufIdx + 1] = skyTexture.pixelBuffer[skySrcIdx + 1];
      offScreenBufferPixels[ceilBufIdx + 2] = skyTexture.pixelBuffer[skySrcIdx + 2];
      offScreenBufferPixels[ceilBufIdx + 3] = 255;
    }

    floorBufIdx += bytesPerRow;
    ceilBufIdx -= bytesPerRow;
  }
};

/**
 * Renders all of the sprites in mapstate to the scene.
 *
 * @param {Object} params
 * @param {Object} params.offScreenBufferPixels The array of pixels representing the projection plane.
 * @param {Array<Types.RayCollision>} params.wallRays The rays cast for walls
 * @param {Types.Orientation} params.orientation The perspective point and angle from which the scene is being rendered.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.DisplayInfo} params.displayInfo
 */
const renderSprites = ({ offScreenBufferPixels, wallRays, orientation, mapState, displayInfo }) => {
  const visible = [];

  // Collect both map-defined static sprites and server-driven dynamic sprites.
  const allSprites = [
    ...(mapState.currentMap.staticSprites || []),
    ...(mapState.currentMap.sprites       || []),
  ];

  for (const sprite of allSprites) {
    const dx = sprite.position.x - orientation.position.x;
    const dy = sprite.position.y - orientation.position.y;
    const spriteDistance = Math.sqrt(dx * dx + dy * dy);
    if (spriteDistance <= 0) continue;

    const spriteAngle = Math.atan2(dy, dx);
    let spriteAngleOffset = spriteAngle - orientation.angle;
    while (spriteAngleOffset >  Math.PI) spriteAngleOffset -= 2 * Math.PI;
    while (spriteAngleOffset < -Math.PI) spriteAngleOffset += 2 * Math.PI;
    if (Math.abs(spriteAngleOffset) >= Math.PI / 2) continue;

    visible.push({ sprite, spriteDistance, spriteAngleOffset });
  }

  visible.sort((a, b) => b.spriteDistance - a.spriteDistance);

  const bytesPerPixel = 4;

  for (const { sprite, spriteDistance, spriteAngleOffset } of visible) {
    const spriteTexture = textures.getTextureById({ id: sprite.textureId });
    if (!spriteTexture) continue;

    const perpDistance = spriteDistance * Math.cos(spriteAngleOffset);
    if (perpDistance <= 0) continue;

    // projectedHeight is the on-screen pixel height of a full CELL_SIZE-tall object at this distance.
    const projectedHeight = Math.floor(constants.CELL_SIZE * displayInfo.distanceToProjectionPlane / perpDistance);

    // Scale the sprite's on-screen height by its texture's actual height relative to CELL_SIZE
    // so a barrel (192px texture) appears shorter than a wall, not the same height.
    const screenHeight = Math.floor(projectedHeight * spriteTexture.height / constants.CELL_SIZE);
    const projectedWidth = Math.floor(screenHeight * spriteTexture.width / spriteTexture.height);

    // heightOffset: 0 = floor-standing (sprite bottom sits on the floor line).
    // Positive values raise the sprite above the floor (e.g. 0.5 = bottom at eye level).
    // The floor line in screen space is halfHeight + projectedHeight/2.
    const heightOffset = sprite.heightOffset ?? 0;
    const spriteBottom = Math.floor(displayInfo.halfHeight + projectedHeight / 2)
      - Math.floor(projectedHeight * heightOffset);
    const spriteTop = spriteBottom - screenHeight;

    const spriteCenterX = Math.floor(displayInfo.halfWidth + Math.tan(spriteAngleOffset) * displayInfo.distanceToProjectionPlane);
    const spriteLeft    = spriteCenterX - Math.floor(projectedWidth / 2);

    const drawLeft   = Math.max(spriteLeft, 0);
    const drawRight  = Math.min(spriteLeft + projectedWidth,  displayInfo.width);
    const drawTop    = Math.max(spriteTop, 0);
    const drawBottom = Math.min(spriteTop + screenHeight, displayInfo.height);
    if (drawLeft >= drawRight || drawTop >= drawBottom) continue;

    // Distance shading — same formula as walls so sprites blend with the environment.
    const distFactor = Math.min(1.0, constants.WALL_SHADE_FULL_BRIGHT_DISTANCE / perpDistance);
    const shade = (Math.max(constants.WALL_SHADE_MIN, distFactor) * 255 + 0.5) | 0;

    for (let screenX = drawLeft; screenX < drawRight; screenX++) {
      // Compare perpendicular depths (projection onto the forward axis) rather than raw
      // Euclidean distances. Raw comparison breaks because the wall ray at column screenX
      // points in a different direction to the player→sprite vector — side-wall rays for
      // columns at the edge of a wide sprite can be shorter than spriteDistance even when
      // no wall actually occludes the sprite, causing edge columns to flicker as the player moves.
      if (perpDistance >= wallRays[screenX].distance * localCache.cosineByScreenColumn[screenX]) continue;

      const texX = Math.floor((screenX - spriteLeft) * spriteTexture.width / projectedWidth);

      for (let screenY = drawTop; screenY < drawBottom; screenY++) {
        const texY = Math.floor((screenY - spriteTop) * spriteTexture.height / screenHeight);

        const texIdx = (texY * spriteTexture.bytesPerRow) + (bytesPerPixel * texX);
        // Use alpha channel for transparency (supports proper PNG transparency).
        if (spriteTexture.pixelBuffer[texIdx + 3] < 128) continue;

        const bufIdx = (screenX * bytesPerPixel) + (screenY * localCache.offScreenBufferBytesPerRow);
        offScreenBufferPixels[bufIdx]     = spriteTexture.pixelBuffer[texIdx]     * shade >> 8;
        offScreenBufferPixels[bufIdx + 1] = spriteTexture.pixelBuffer[texIdx + 1] * shade >> 8;
        offScreenBufferPixels[bufIdx + 2] = spriteTexture.pixelBuffer[texIdx + 2] * shade >> 8;
        offScreenBufferPixels[bufIdx + 3] = 255;
      }
    }
  }
};

const debugLog = (...args) => {
  const debug = false;
  if (debug) {
    console.log(...args);
  }
}





/*const renderSprites = ({ offScreenBufferPixels, orientation, mapState, displayInfo }) => {
  const sortedSprites = [];

  // Sort sprites by distance
  for (const sprite of mapState.currentMap.sprites) {
    const spriteDistance = (sprite.position.x - orientation.position.x) ** 2 + (sprite.position.y - orientation.position.y) ** 2;
    const spriteAngle = Math.atan2(sprite.position.y - orientation.position.y, sprite.position.x - orientation.position.x) - orientation.angle;
    sortedSprites.push({ sprite, spriteDistance, spriteAngle });
  }
  
  sortedSprites.sort((a, b) => b.spriteDistance - a.spriteDistance);
  
  const baseSpriteSize = 10000;
  
  for (const { sprite, spriteDistance, spriteAngle } of sortedSprites) {
    const spriteTexture = textures.getTextureById({ id: sprite.textureId });
    //const sizeFactor = baseSpriteSize / spriteDistance;
    
    const adjustedSpriteWidth = spriteTexture.width; //Math.floor(spriteTexture.width * sizeFactor);
    const adjustedSpriteHeight = spriteTexture.height; //Math.floor(spriteTexture.height * sizeFactor);
  
    const halfAdjustedSpriteWidth = Math.floor(adjustedSpriteWidth / 2);
  
    for (let spriteX = 0; spriteX < adjustedSpriteWidth; ++spriteX) {
      // Calculate the angle of the sprite column relative to the center of the sprite
      const angleToSpriteColumn = Math.atan2(spriteX - halfAdjustedSpriteWidth, displayInfo.distanceToProjectionPlane);
  
      // Calculate the absolute angle of the sprite column relative to the player's orientation
      const absoluteColumnAngle = orientation.angle + angleToSpriteColumn;
  
      if (Math.abs(spriteAngle - absoluteColumnAngle) > displayInfo.halfFieldOfView) {
        continue;
      }
  
      for (let spriteY = 0; spriteY < adjustedSpriteHeight; ++spriteY) {
        //const textureColumn = Math.floor((orientation.position.x - sprite.position.x + adjustedSpriteWidth / 2) * (spriteTexture.width / adjustedSpriteWidth));
        //const textureRow = Math.floor((orientation.position.y - (displayInfo.height - adjustedSpriteHeight) / 2) * (spriteTexture.height / adjustedSpriteHeight));
        const textureColumn = spriteX;
        const textureRow = spriteY;
  
        const textureX = textureColumn % spriteTexture.width;
        const textureY = textureRow % spriteTexture.height;
  
        const bytesPerPixel = 4;
        const textureIndex = (textureY * spriteTexture.bytesPerRow) + (bytesPerPixel * textureX);
  
        const brightnessLevel = 1;
        const spriteRed = Math.floor(spriteTexture.pixelBuffer[textureIndex] * brightnessLevel);
        const spriteGreen = Math.floor(spriteTexture.pixelBuffer[textureIndex + 1] * brightnessLevel);
        const spriteBlue = Math.floor(spriteTexture.pixelBuffer[textureIndex + 2] * brightnessLevel);
        const spriteAlpha = Math.floor(spriteTexture.pixelBuffer[textureIndex + 3]);
  
        // Calculate sprite screen position (x-coordinate on the screen) and index in screen buffer
        const horizontalOffset = Math.floor(Math.tan(spriteAngle) * (displayInfo.distanceToProjectionPlane / displayInfo.fieldOfView)); // displayInfo.distanceToProjectionPlane / displayInfo.fieldOfView)
  
        const spriteScreenPositionX = ((displayInfo.halfWidth + spriteX + horizontalOffset) * bytesPerPixel) + (spriteY * localCache.offScreenBufferBytesPerRow);
        //const spriteScreenPositionX = Math.floor((displayInfo.width / 2) + horizontalOffset);
        //if (spriteX % 100 === 0 && spriteY % 100 === 0)
        //console.log('horizontalOffset', horizontalOffset);
        const offScreenBufferSpriteIndex = spriteScreenPositionX;//spriteScreenPositionX * bytesPerPixel;
  
        offScreenBufferPixels[offScreenBufferSpriteIndex] = spriteRed;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 1] = spriteGreen;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 2] = spriteBlue;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 3] = spriteAlpha;
      }
    }
  }
};*/

