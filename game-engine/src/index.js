const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const GAME_LOOP_TICK_MS = 30;
const MINIMAP_BASE_POSITION_X = 5;
const MINIMAP_BASE_POSITION_Y = 5;
const MINIMAP_SCALE = 0.75;
const FIELD_OF_VIEW = 60 * Math.PI / 180;
const MINIMAP_PLAYER_SIZE = 10;
const CELL_SIZE = 64;

const map = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const player = {
  x: CELL_SIZE * 1.25,
  y: CELL_SIZE * 3,
  angle: 0,//9.61,
  angularSpeed: 0,
  speed: 0,
};

const colours = {
  CELL: 'grey',
  MINIMAP_PLAYER: 'white',
  RAYS: '#ffa600',
  FLOOR: "#d52b1e", // "#ff6361"
  CEILING: "#ffffff", // "#012975",
  WALL: "#013aa6", // "#58508d"
  WALL_DARK: "#012975", // "#003f5c"
};

const toRadians = (deg) => (deg * Math.PI) / 180;

const initialise = () => {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  // Get the 2D rendering context of the canvas
  const canvasContext = canvas.getContext('2d');

  if (!canvasContext) {
    throw new Error('No canvasContext found');
  }

  document.body.appendChild(canvas);

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
        player.speed = 2;
      break;

      case 'ArrowDown':
        player.speed = -2;
      break;

      case 'ArrowLeft':
        player.angularSpeed = toRadians(-2);
      break;

      case 'ArrowRight':
        player.angularSpeed = toRadians(2);
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

  /* document.addEventListener('mousemove', (e) => {
    player.angle += toRadians(e.movementX);
  }); */

  setInterval(() => gameLoop({ canvasContext }), GAME_LOOP_TICK_MS);
  
};

const clearScreen = ({ canvasContext }) => {
  canvasContext.fillStyle = 'black';
  canvasContext.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
};

const movePlayer = () => {
  player.angle += player.angularSpeed;
  player.x += Math.cos(player.angle) * player.speed;
  player.y += Math.sin(player.angle) * player.speed;
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
    ? Math.floor(player.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE
    : Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstY = player.y + (firstX - player.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? CELL_SIZE : -CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  let wallCollision;
  let nextX = firstX;
  let nextY = firstY;

  while (!wallCollision) {
    const cellX = isAngleFacingRight ? Math.floor(nextX / CELL_SIZE) : Math.floor(nextX / CELL_SIZE) - 1;
    const cellY = Math.floor(nextY / CELL_SIZE);

    if (isOutOfMapBounds({ cellX, cellY })) {
      break;
    }

    wallCollision = map[cellY][cellX];

    if (!wallCollision) {
      nextX += xStepSize;
      nextY += yStepSize;
    }
  }

  return { angle, distance: calculatePlayerDistanceTo({ x: nextX, y: nextY }), vertical: true };
};

const calculateHorizontalCollision = ({ angle }) => {
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(player.y / CELL_SIZE) * CELL_SIZE :
    Math.floor(player.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE;

  const firstX = player.x + (firstY - player.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -CELL_SIZE : CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  let wallCollision;
  let nextX = firstX;
  let nextY = firstY;

  while (!wallCollision) {
    const cellX = Math.floor(nextX / CELL_SIZE);
    const cellY = isAngleFacingUp ? Math.floor(nextY / CELL_SIZE) - 1 : Math.floor(nextY / CELL_SIZE);

    if (isOutOfMapBounds({ cellX, cellY })) {
      break;
    }

    wallCollision = map[cellY][cellX];

    if (!wallCollision) {
      nextY += yStepSize;
      nextX += xStepSize;
    }
  }

  return { angle, distance: calculatePlayerDistanceTo({ x: nextX, y: nextY }), horizontal: true };
}

const castRay = ({ angle }) => {
  const verticalCollision = calculateVerticalCollision({ angle });
  const horizontalCollision = calculateHorizontalCollision({ angle });
  return horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
};

const getRays = () => {
  // The angle at which to begin the ray casting array.
  const initialAngle = player.angle - FIELD_OF_VIEW / 2;
  const numberOfRays = SCREEN_WIDTH;
  const angleBetweenRays = FIELD_OF_VIEW / numberOfRays;
  return Array.from({ length: numberOfRays }, (_, i) => castRay({ angle: initialAngle + i * angleBetweenRays }));
};

const renderScene = ({ canvasContext, rays }) => {
  rays.forEach((ray, i) => {
    const distance = ray.distance;
    const wallHeight = ((CELL_SIZE * 5) / distance) * 277;
    canvasContext.fillStyle = ray.vertical ? colours.WALL_DARK : colours.WALL;
    canvasContext.fillRect(i, SCREEN_HEIGHT / 2 - wallHeight / 2, 1, wallHeight); // x, y, width, height
    canvasContext.fillStyle = colours.FLOOR;
    canvasContext.fillRect(
      i,
      SCREEN_HEIGHT / 2 + wallHeight / 2,
      1,
      SCREEN_HEIGHT / 2 - wallHeight / 2
    );
    canvasContext.fillStyle = colours.CEILING;
    canvasContext.fillRect(i, 0, 1, SCREEN_HEIGHT / 2 - wallHeight / 2);
  });
};

const renderMiniMap = ({ canvasContext, rays }) => {
  const miniMapCellSize = MINIMAP_SCALE * CELL_SIZE;
  const miniMapPlayerPositionX = MINIMAP_BASE_POSITION_X + player.x;
  const miniMapPlayerPositionY = MINIMAP_BASE_POSITION_Y + player.y;

  // Render the minimap by looping through map data.
  // We first loop over the rows. We can treat row index in the 2d array as a basis for Y coordinates.
  map.forEach((row, y) => {
    // Loop through each cell in the current row. We can treat cell index in the row array as a basis for X coordinates.
    row.forEach((cell, x) => {
      // TODO: Determine how to render cell based on value. For now, we are just using on or off. On being grey.
      if (cell === 1) {
        canvasContext.fillStyle = colours.CELL;
        canvasContext.fillRect(
          MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      }
    });
  });

  // Render the player in the minimap.
  canvasContext.fillStyle = colours.MINIMAP_PLAYER;
  canvasContext.fillRect(
    miniMapPlayerPositionX * MINIMAP_SCALE - (MINIMAP_PLAYER_SIZE / 2),
    miniMapPlayerPositionY * MINIMAP_SCALE - (MINIMAP_PLAYER_SIZE / 2),
    MINIMAP_PLAYER_SIZE,
    MINIMAP_PLAYER_SIZE,
  );

  // Render the passed rays array.
  canvasContext.strokeStyle = colours.RAYS;
  rays.forEach((ray) => {
    canvasContext.beginPath();

    // The starting point of the ray is the player location.
    canvasContext.moveTo(
      miniMapPlayerPositionX * MINIMAP_SCALE,
      miniMapPlayerPositionY * MINIMAP_SCALE,
    );

    // Draw the raycast ray.
    canvasContext.lineTo( 
      (miniMapPlayerPositionX + Math.cos(ray.angle) * ray.distance) * MINIMAP_SCALE,
      (miniMapPlayerPositionY + Math.sin(ray.angle) * ray.distance) * MINIMAP_SCALE,
    );

    // Stop drawing the ray and render it.
    canvasContext.closePath();
    canvasContext.stroke();
  });

  // Render player direction ray.
  const playerDirectionRayLength = MINIMAP_PLAYER_SIZE * 2;
  canvasContext.strokeStyle = colours.MINIMAP_PLAYER;
  canvasContext.beginPath();

  // The starting point of the line is the player location.
  canvasContext.moveTo(
    miniMapPlayerPositionX * MINIMAP_SCALE,
    miniMapPlayerPositionY * MINIMAP_SCALE,
  );

  // Draw the player direction ray.
  canvasContext.lineTo( 
    (miniMapPlayerPositionX + Math.cos(player.angle) * playerDirectionRayLength) * MINIMAP_SCALE,
    (miniMapPlayerPositionY + Math.sin(player.angle) * playerDirectionRayLength) * MINIMAP_SCALE,
  );

  // Stop drawing player direction ray and render it.
  canvasContext.closePath();
  canvasContext.stroke();
};

const gameLoop = ({ canvasContext }) => {
  clearScreen({ canvasContext });
  movePlayer();
  
  const rays = getRays();
  renderScene({ canvasContext, rays });
  renderMiniMap({ canvasContext, rays });
};

initialise();