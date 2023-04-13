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

  return { mapCell, distance: playerDistanceTo({ x: nextX, y: nextY }), isVertical: true, x: nextX, y: nextY };
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

  return { mapCell, distance: playerDistanceTo({ x: nextX, y: nextY }), isHorizontal: true, x: nextX, y: nextY  };
}

const castWallRay = ({ angle, player }) => {
  const verticalCollision = calculateVerticalCollision({ angle, player });
  const horizontalCollision = calculateHorizontalCollision({ angle, player });

  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

export const render = ({ canvasContext, player }) => {
  renderFloor({ canvasContext, player });
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
      collisionDistance: collision.distance,
      collidedHorizontally: !!collision.isHorizontal,
      collidedVertically: !!collision.isVertical,
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
  const wallHeight = Math.floor(((constants.CELL_SIZE * 5) / distance) * 270);
  const textureOffset = Math.floor(wallRay.collidedVertically ? wallRay.collisionY : wallRay.collisionX);

  // Draw walls.
  const wallTexture = textures.getTextureImageById({ id: `wall${wallRay.collidedMapCell}`});
  canvasContext.drawImage(
    wallTexture, 
    (textureOffset - Math.floor(textureOffset / constants.CELL_SIZE) * constants.CELL_SIZE) % wallTexture.width,                // Source image x offset
    0,                      // Source image Y offset
    1,                      // Source image width
    wallTexture.height,     // Source image height
    rayIndex,               // Target image X offset
    Math.floor(constants.HALF_SCREEN_HEIGHT) - Math.floor(wallHeight / 2),                // Target image Y offset
    1,                // Target image width
    wallHeight,       // Target image height
  );
};

  // Make walls that are further away a bit darker.
  /*const darkness = Math.min(distance / 300, 1);
  canvasContext.fillStyle = `rgba(0, 0, 0, ${darkness * 0.8})`;
  canvasContext.fillRect(
    rayIndex,
    Math.floor(constants.SCREEN_HEIGHT / 2) - Math.floor(wallHeight / 2),
    1,
    wallHeight,
  );*/

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

const renderFloor = ({ canvasContext, player }) => {
  /*const floorGradient = canvasContext.createLinearGradient(0, constants.HALF_SCREEN_HEIGHT, 0, constants.SCREEN_HEIGHT);
  floorGradient.addColorStop(0, '#000000');
  floorGradient.addColorStop(1, '#9C9C9C');
  canvasContext.fillStyle = floorGradient;//`#747474`;
  canvasContext.fillRect(0, Math.floor(constants.HALF_SCREEN_HEIGHT), constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT - Math.floor(constants.HALF_SCREEN_HEIGHT));*/

  // We are using a variant of DDA found here: https://lodev.org/cgtutor/raycasting2.html
  // We assume the existence of two imaginary planes to assist with the calculation.

  // First, is a floor plane which represents the floor in scaled map space. 
  // This plane sits directly in front of the camera at a distance of 1.

  // Second, is a projection plane which represents the actual player's screen or viewport.
  // This plane sits perpendicular to the camera angle, also at a distance of 1.

  // Create a vector from the player camera's position and current angle to the imaginary
  // floor plane at a distance of 1 unit away.
  const cameraToFloorPlaneXComponent = Math.cos(player.angle);
  const cameraToFloorPlaneYComponent = Math.sin(player.angle);

  // Create a vector from the camera's position and perpendicular to the current angle to
  // the imaginary projection plane at a distance of 1 unit away.
  const cameraToProjectionPlaneXComponent = Math.sin(player.angle);
  const cameraToProjectionPlaneYComponent = -Math.cos(player.angle);

  const offScreenBuffer = new OffscreenCanvas(canvasContext.canvas.width, canvasContext.canvas.height);
  const offScreenBufferContext = offScreenBuffer.getContext('2d');
  //offScreenBufferContext.fillStyle = 'pink';

  const imageData = offScreenBufferContext.createImageData(1, 1);
  const pixelData = imageData.data;
  pixelData[0] = 255; // R
  pixelData[1] = 0;   // G
  pixelData[2] = 0;   // B
  pixelData[3] = 255; // Alpha

  for (let yPosition = constants.HALF_SCREEN_HEIGHT_FLOORED; yPosition < constants.SCREEN_HEIGHT; ++yPosition) {
    const yOffsetFromCentre = yPosition - constants.HALF_SCREEN_HEIGHT;
    const distanceFromCameraToRowInFloorPlane = constants.HALF_SCREEN_HEIGHT / yOffsetFromCentre;

    // Calculate the step sizes for each pixel along the floor projection plane.
    const floorStepX = distanceFromCameraToRowInFloorPlane * (cameraToProjectionPlaneXComponent - cameraToFloorPlaneXComponent) / constants.SCREEN_WIDTH;
    const floorStepY = distanceFromCameraToRowInFloorPlane * (cameraToProjectionPlaneYComponent - cameraToFloorPlaneYComponent) / constants.SCREEN_WIDTH;

    // real world coordinates of the leftmost column. This will be updated as we step to the right.
    let floorX = player.x + distanceFromCameraToRowInFloorPlane * cameraToFloorPlaneXComponent;
    let floorY = player.y + distanceFromCameraToRowInFloorPlane * cameraToFloorPlaneYComponent;

    for (let xPosition = 0; xPosition < constants.SCREEN_WIDTH; ++xPosition) {
      // the cell coord is simply got from the integer parts of floorX and floorY
      const cellX = Math.floor(floorX / constants.CELL_SIZE);
      const cellY = Math.floor(floorY / constants.CELL_SIZE);

      // get the texture coordinates
      const texWidth = 5;
      const texHeight = 5;
      const textureX = Math.floor(texWidth * (floorX - cellX));
      const textureY = Math.floor(texHeight * (floorY - cellY));

      floorX += floorStepX;
      floorY += floorStepY;

      //offScreenBufferContext.fillRect(xPosition, yPosition - 1, 1, 1);


      // offScreenBufferContext.putImageData(imageData, 1, 1);
    }
  }

  //canvasContext.drawImage(offScreenBuffer, 0, 0);
};

const renderCeiling = ({ canvasContext }) => {
  canvasContext.fillStyle = constants.colours.CEILING;
  canvasContext.fillRect(0, 0, constants.SCREEN_WIDTH, Math.floor(constants.HALF_SCREEN_HEIGHT));
};