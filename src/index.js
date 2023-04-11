import { loadTextures, getTextureImageById } from "./textures";
import * as constants from './constants';

const map = [
  [2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 2, 0, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 1, 0, 1, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 3, 3, 0, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 0, 2, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 2, 2, 2, 2, 2, 2],
];

const player = {
  x: constants.CELL_SIZE * 1.25,
  y: constants.CELL_SIZE * 3,
  angle: 0,//9.61,
  angularSpeed: 0,
  speed: 0,
};

const colours = {
  CELL: 'grey',
  MINIMAP_PLAYER: 'white',
  RAYS: '#ffa600',
  FLOOR: "#d52b1e", // "#ff6361"
  CEILING: '#3C3C3C', // "#012975",
  WALL: "#013aa6", // "#58508d"
  WALL_DARK: "#012975", // "#003f5c"
};

const textures = {};
let framesPerSecond = 0;
let gameLoopCycles = 0;

const toRadians = (deg) => (deg * Math.PI) / 180;

const initialise = async () => {
  const canvas = document.createElement('canvas');
  canvas.width = constants.SCREEN_WIDTH;
  canvas.height = constants.SCREEN_HEIGHT;

  // Get the 2D rendering context of the canvas
  const canvasContext = canvas.getContext('2d');

  if (!canvasContext) {
    throw new Error('No canvasContext found');
  }

  document.body.appendChild(canvas);

  await loadTextures();

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
        player.speed = constants.PLAYER_WALK_SPEED;
      break;

      case 'ArrowDown':
        player.speed = -constants.PLAYER_WALK_SPEED;
      break;

      case 'ArrowLeft':
        player.angularSpeed = toRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES);
      break;

      case 'ArrowRight':
        player.angularSpeed = toRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES);
      break;

      default: break;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      player.speed = 0;
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      player.angularSpeed = 0;
    }
  });

  /*document.addEventListener('mousemove', (e) => {
    player.angle += toRadians(e.movementX);
  });*/

  setInterval(() => gameLoop({ canvasContext }), constants.GAME_LOOP_TICK_MS);
  setInterval(trackFps, 1000);
};

const clearScreen = ({ canvasContext }) => {
  canvasContext.fillStyle = 'black';
  canvasContext.fillRect(0, 0, constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT);
};

const movePlayer = () => {
  player.angle += player.angularSpeed;
  const xMovement = Math.cos(player.angle) * player.speed;
  const yMovement = Math.sin(player.angle) * player.speed;

  // Clipping checking.
  const hypotheticalXCell = Math.floor((player.x + xMovement) / constants.CELL_SIZE);
  const hypotheticalYCell = Math.floor((player.y + yMovement) / constants.CELL_SIZE);

  if (isOutOfMapBounds({ cellX: hypotheticalXCell, cellY: hypotheticalYCell }) || map[hypotheticalYCell][hypotheticalXCell] !== 0) {
    return;
  }

  player.x += xMovement;
  player.y += yMovement;
};

const isOutOfMapBounds = ({ cellX, cellY }) => {
  return cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length;
};

const calculatePlayerDistanceTo = ({ x, y }) => {
  return Math.sqrt(Math.pow(player.x - x, 2) + Math.pow(player.y - y, 2));
};

const calculateVerticalCollision = ({ angle }) => {
  // Check for vertical collisions.
  const isAngleFacingRight = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2) !== 0;

  // const firstX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstX = isAngleFacingRight
    ? Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE
    : Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE;
  const firstY = player.y + (firstX - player.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? constants.CELL_SIZE : -constants.CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  let wallCollision;
  let nextX = firstX;
  let nextY = firstY;

  while (!wallCollision) {
    const cellX = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    const cellY = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfMapBounds({ cellX, cellY })) {
      break;
    }

    wallCollision = map[cellY][cellX];

    if (!wallCollision) {
      nextX += xStepSize;
      nextY += yStepSize;
    }
  }

  return { angle, distance: calculatePlayerDistanceTo({ x: nextX, y: nextY }), wallCollision, vertical: true, x: nextX, y: nextY };
};

const calculateHorizontalCollision = ({ angle }) => {
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE :
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE;

  const firstX = player.x + (firstY - player.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -constants.CELL_SIZE : constants.CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  let wallCollision;
  let nextX = firstX;
  let nextY = firstY;

  while (!wallCollision) {
    const cellX = Math.floor(nextX / constants.CELL_SIZE);
    const cellY = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfMapBounds({ cellX, cellY })) {
      break;
    }

    wallCollision = map[cellY][cellX];

    if (!wallCollision) {
      nextY += yStepSize;
      nextX += xStepSize;
    }
  }

  return { angle, distance: calculatePlayerDistanceTo({ x: nextX, y: nextY }), wallCollision, horizontal: true, x: nextX, y: nextY  };
}

const castRay = ({ angle }) => {
  const verticalCollision = calculateVerticalCollision({ angle });
  const horizontalCollision = calculateHorizontalCollision({ angle });


  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

const getRays = () => {
  // The angle at which to begin the ray casting array.
  const initialAngle = player.angle - constants.FIELD_OF_VIEW / 2;
  const numberOfRays = constants.SCREEN_WIDTH;
  const angleBetweenRays = constants.FIELD_OF_VIEW / numberOfRays;
  return Array.from({ length: numberOfRays }, (_, i) => castRay({ angle: initialAngle + i * angleBetweenRays }));
};

const renderScene = ({ canvasContext, rays }) => {
  // Draw floor.
  const floorGradient = canvasContext.createLinearGradient(0, constants.HALF_SCREEN_HEIGHT, 0, constants.SCREEN_HEIGHT);
  floorGradient.addColorStop(0, '#000000');
  floorGradient.addColorStop(1, '#9C9C9C');
  canvasContext.fillStyle = floorGradient;//`#747474`;
  canvasContext.fillRect(0, Math.floor(constants.HALF_SCREEN_HEIGHT), constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT - Math.floor(constants.HALF_SCREEN_HEIGHT));

  // Draw ceiling.
  canvasContext.fillStyle = colours.CEILING;
  canvasContext.fillRect(0, 0, constants.SCREEN_WIDTH, Math.floor(constants.HALF_SCREEN_HEIGHT));

  rays.forEach((ray, rayIndex) => {
    // Using this calculation for distance instead of the raw ray distance fixes
    // the fish eye effect cause by calculating the rays from a single central point
    // on the player.
    const distance = ray.distance * Math.cos(ray.angle - player.angle);
   // const floorDist = SCREEN_HEIGHT / 2 / Math.tan(FIELD_OF_VIEW / 2);
    const wallHeight = Math.floor(((constants.CELL_SIZE * 5) / distance) * 270);
    const textureOffset = Math.floor(ray.vertical ? ray.y : ray.x);

    // Draw walls.
    const wallTexture = getTextureImageById({ id: `wall${ray.wallCollision}`});
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
  });
};

const renderMiniMap = ({ canvasContext, rays }) => {
  const miniMapCellSize = constants.MINIMAP_SCALE * constants.CELL_SIZE;
  const miniMapPlayerPositionX = constants.MINIMAP_BASE_POSITION_X + player.x;
  const miniMapPlayerPositionY = constants.MINIMAP_BASE_POSITION_Y + player.y;

  // Render the minimap by looping through map data.
  // We first loop over the rows. We can treat row index in the 2d array as a basis for Y coordinates.
  map.forEach((row, y) => {
    // Loop through each cell in the current row. We can treat cell index in the row array as a basis for X coordinates.
    row.forEach((cell, x) => {
      // TODO: Determine how to render cell based on value. For now, we are just using on or off. On being grey.
      if (cell !== 0) {
        canvasContext.fillStyle = colours.CELL;
        canvasContext.fillRect(
          constants.MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          constants.MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      } else {
        canvasContext.fillStyle = 'black';
        canvasContext.fillRect(
          constants.MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          constants.MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      }
    });
  });

  // Render the player in the minimap.
  canvasContext.fillStyle = colours.MINIMAP_PLAYER;
  canvasContext.fillRect(
    miniMapPlayerPositionX * constants.MINIMAP_SCALE - (constants.MINIMAP_PLAYER_SIZE / 2),
    miniMapPlayerPositionY * constants.MINIMAP_SCALE - (constants.MINIMAP_PLAYER_SIZE / 2),
    constants.MINIMAP_PLAYER_SIZE,
    constants.MINIMAP_PLAYER_SIZE,
  );

  // Render the passed rays array.
  canvasContext.strokeStyle = colours.RAYS;
  rays.forEach((ray) => {
    canvasContext.beginPath();

    // The starting point of the ray is the player location.
    canvasContext.moveTo(
      miniMapPlayerPositionX * constants.MINIMAP_SCALE,
      miniMapPlayerPositionY * constants.MINIMAP_SCALE,
    );

    // Draw the raycast ray.
    canvasContext.lineTo( 
      (miniMapPlayerPositionX + Math.cos(ray.angle) * ray.distance) * constants.MINIMAP_SCALE,
      (miniMapPlayerPositionY + Math.sin(ray.angle) * ray.distance) * constants.MINIMAP_SCALE,
    );

    // Stop drawing the ray and render it.
    canvasContext.closePath();
    canvasContext.stroke();
  });

  // Render player direction ray.
  const playerDirectionRayLength = constants.MINIMAP_PLAYER_SIZE * 2;
  canvasContext.strokeStyle = colours.MINIMAP_PLAYER;
  canvasContext.beginPath();

  // The starting point of the line is the player location.
  canvasContext.moveTo(
    miniMapPlayerPositionX * constants.MINIMAP_SCALE,
    miniMapPlayerPositionY * constants.MINIMAP_SCALE,
  );

  // Draw the player direction ray.
  canvasContext.lineTo( 
    (miniMapPlayerPositionX + Math.cos(player.angle) * playerDirectionRayLength) * constants.MINIMAP_SCALE,
    (miniMapPlayerPositionY + Math.sin(player.angle) * playerDirectionRayLength) * constants.MINIMAP_SCALE,
  );

  // Stop drawing player direction ray and render it.
  canvasContext.closePath();
  canvasContext.stroke();
};

const gameLoop = ({ canvasContext }) => {
  ++gameLoopCycles;

  clearScreen({ canvasContext });
  movePlayer();
  
  const rays = getRays();
  renderScene({ canvasContext, rays });
  renderMiniMap({ canvasContext, rays });

  canvasContext.fillStyle = 'white';
  canvasContext.font = '16px Monospace';
  canvasContext.fillText(framesPerSecond, 25, 25);
};

const trackFps = () => {
  framesPerSecond = gameLoopCycles;
  gameLoopCycles = 0;
}

initialise();