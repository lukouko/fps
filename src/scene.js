import * as constants from './constants';
import * as textures from './textures';
import { distanceTo as playerDistanceTo } from './player';
import { isOutOfBounds, getMapCell } from './map';

export const initialise = () => {

};

const calculateVerticalCollision = ({ angle, player }) => {
  // Check for vertical collisions.
  const isAngleFacingRight = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2) !== 0;

  // const firstX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstX = isAngleFacingRight
    ? Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE
    : Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE;
  const firstY = player.y + (firstX - player.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? constants.CELL_SIZE : -constants.CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  let mapCell;
  let nextX = firstX;
  let nextY = firstY;

  while (!mapCell) {
    const cellX = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    const cellY = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      break;
    }

    mapCell = getMapCell({ cellY, cellX });

    if (!mapCell) {
      nextX += xStepSize;
      nextY += yStepSize;
    }
  }

  if (mapCell === 0) {
    throw new Error('Vertical collsion with nothing');
  }
  return { mapCell, isVertical: true, x: nextX, y: nextY };
};

const calculateHorizontalCollision = ({ angle, player }) => {
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE :
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE;

  const firstX = player.x + (firstY - player.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -constants.CELL_SIZE : constants.CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  let mapCell;
  let nextX = firstX;
  let nextY = firstY;

  while (!mapCell) {
    const cellX = Math.floor(nextX / constants.CELL_SIZE);
    const cellY = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      break;
    }

    mapCell = getMapCell({ cellY, cellX });

    if (!mapCell) {
      nextY += yStepSize;
      nextX += xStepSize;
    }
  }

  if (mapCell === 0) {
    console.log('X', nextX, 'xStepSize', xStepSize);
    throw new Error('Horiztonal collsion with nothing');
  }

  return { mapCell, isHorizontal: true, x: nextX, y: nextY  };
}

const castWallRay = ({ angle, player }) => {
  const verticalCollision = calculateVerticalCollision({ angle, player });
  const horizontalCollision = calculateHorizontalCollision({ angle, player });

  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

export const render = ({ canvasContext, player }) => {
  if (Number.isNaN(player.angle) || player.angle === undefined) {
    console.log(player);
    throw new Error('Cannot render scene with invalid player angle');
  }

  renderFloor({ canvasContext });
  renderCeiling({ canvasContext });

  const initialAngle = player.angle - constants.FIELD_OF_VIEW / 2; // The starting angle for ray casting.
  const numberOfRays = constants.SCREEN_WIDTH;
  const angleBetweenRays = constants.FIELD_OF_VIEW / numberOfRays; // Angle between each of th rays cast.
  
  const wallRays = [];
  for (let rayIndex = 0; rayIndex < constants.SCREEN_WIDTH; ++rayIndex) {
    const angleOfRay = initialAngle + rayIndex * angleBetweenRays;
    const collision = castWallRay({ angle: angleOfRay, player });
    const wallRay = {
      angle: angleOfRay,
      collisionDistance: playerDistanceTo({ x: collision.x, y: collision.y }),
      collidedHorizontally: collision.isHorizontal,
      collidedVertically: collision.isVertical,
      collisionX: collision.x,
      collisionY: collision.y,
      collidedMapCell: collision.mapCell,
    };

    wallRays.push(wallRay);
    renderWallRay({ canvasContext, player, wallRay, rayIndex });
  }

  // Other parts of the app may need to make use of the rays we cast onto the walls.
  return { wallRays };
};

const renderWallRay = ({ canvasContext, player, wallRay, rayIndex }) => {
  // Using this calculation for distance instead of the raw ray distance fixes
  // the fish eye effect cause by calculating the rays from a single central point
  // on the player.
  const distance = wallRay.collisionDistance * Math.cos(wallRay.angle - player.angle);
  // const floorDist = SCREEN_HEIGHT / 2 / Math.tan(FIELD_OF_VIEW / 2);
  const wallHeight = Math.floor(((constants.CELL_SIZE * 5) / distance) * 270);
  const textureOffset = Math.floor(wallRay.collidedVertically ? wallRay.y : wallRay.x);

  // Draw walls.
  const wallTexture = textures.getTextureImageById({ id: `wall${wallRay.collidedMapCell}`});
  canvasContext.drawImage(
    wallTexture, 
    (textureOffset - Math.floor(textureOffset / constants.CELL_SIZE) * constants.CELL_SIZE) % wallTexture.width,                // Source image x offset
    0,                // Source image Y offset
    1,                // Source image width
    wallTexture.height,               // Source image height
    rayIndex,     // Target image X offset
    Math.floor(constants.SCREEN_HEIGHT / 2) - wallHeight / 2,                // Target image Y offset
    1,                // Target image width
    wallHeight,       // Target image height
  );

  // Make walls that are further away a bit darker.
  const darkness = Math.min(distance / 300, 1);
  canvasContext.fillStyle = `rgba(0, 0, 0, ${darkness * 0.8})`;
  canvasContext.fillRect(
    rayIndex,
    Math.floor(constants.SCREEN_HEIGHT / 2) - Math.floor(wallHeight / 2),
    1,
    wallHeight,
  );

  /* make side walls a bit darker */
  /*if (ray.vertical) {
    canvasContext.fillStyle = `rgba(0, 0, 0, ${0.2})`;
    canvasContext.fillRect(
      rayIndex,
      Math.floor(SCREEN_HEIGHT / 2) - wallHeight / 2,
      1,
      wallHeight
    );
  }*/
};

const renderFloor = ({ canvasContext }) => {
  const floorGradient = canvasContext.createLinearGradient(0, constants.HALF_SCREEN_HEIGHT, 0, constants.SCREEN_HEIGHT);
  floorGradient.addColorStop(0, '#000000');
  floorGradient.addColorStop(1, '#9C9C9C');
  canvasContext.fillStyle = floorGradient;//`#747474`;
  canvasContext.fillRect(0, Math.floor(constants.HALF_SCREEN_HEIGHT), constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT - Math.floor(constants.HALF_SCREEN_HEIGHT));
};

const renderCeiling = ({ canvasContext }) => {
  canvasContext.fillStyle = constants.colours.CEILING;
  canvasContext.fillRect(0, 0, constants.SCREEN_WIDTH, Math.floor(constants.HALF_SCREEN_HEIGHT));
};