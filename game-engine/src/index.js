import * as assets from 'fps/assets';

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const HALF_SCREEN_WIDTH = SCREEN_WIDTH / 2;
const HALF_SCREEN_HEIGHT = SCREEN_HEIGHT / 2;
const GAME_LOOP_TICK_MS = 20;
const MINIMAP_BASE_POSITION_X = 5;
const MINIMAP_BASE_POSITION_Y = 5;
const MINIMAP_SCALE = 0.45;
const FIELD_OF_VIEW = 60 * Math.PI / 180;
const MINIMAP_PLAYER_SIZE = 10;
const CELL_SIZE = 64;
const PLAYER_WALK_SPEED = 4;
const PLAYER_ANGULAR_SPEED_DEGREES = 4;
const PLAYER_CLIP_DETECTION_DISTANCE = PLAYER_WALK_SPEED + 1;

const map = [
  [2, 2, 2, 2, 2, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 3, 3, 0, 2, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 0, 2, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 0, 0, 0, 0, 2],
  [2, 0, 2, 2, 0, 2, 2],
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
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  // Get the 2D rendering context of the canvas
  const canvasContext = canvas.getContext('2d');

  if (!canvasContext) {
    throw new Error('No canvasContext found');
  }

  await new Promise((resolve) => {
    textures.bricks1 = new Image();
    textures.bricks1.onload = resolve;
    textures.bricks1.src = assets.bricks1;
  });
  
  await new Promise((resolve) => {
    textures.wood1 = new Image();
    textures.wood1.onload = resolve;
    textures.wood1.src = assets.bricks2_128;
  });

  await new Promise((resolve) => {
    textures.ali = new Image();
    textures.ali.onload = resolve;
    textures.ali.src = assets.ali;
  });

  document.body.appendChild(canvas);

  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
        player.speed = PLAYER_WALK_SPEED;
      break;

      case 'ArrowDown':
        player.speed = -PLAYER_WALK_SPEED;
      break;

      case 'ArrowLeft':
        player.angularSpeed = toRadians(-PLAYER_ANGULAR_SPEED_DEGREES);
      break;

      case 'ArrowRight':
        player.angularSpeed = toRadians(PLAYER_ANGULAR_SPEED_DEGREES);
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

  setInterval(() => gameLoop({ canvasContext }), GAME_LOOP_TICK_MS);
  setInterval(trackFps, 1000);
};

const clearScreen = ({ canvasContext }) => {
  canvasContext.fillStyle = 'black';
  canvasContext.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
};

const movePlayer = () => {
  player.angle += player.angularSpeed;
  const xMovement = Math.cos(player.angle) * player.speed;
  const yMovement = Math.sin(player.angle) * player.speed;

  // Clipping checking.
  const hypotheticalXCell = Math.floor((player.x + xMovement) / CELL_SIZE);
  const hypotheticalYCell = Math.floor((player.y + yMovement) / CELL_SIZE);

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

  return { angle, distance: calculatePlayerDistanceTo({ x: nextX, y: nextY }), wallCollision, vertical: true, x: nextX, y: nextY };
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
  const initialAngle = player.angle - FIELD_OF_VIEW / 2;
  const numberOfRays = SCREEN_WIDTH;
  const angleBetweenRays = FIELD_OF_VIEW / numberOfRays;
  return Array.from({ length: numberOfRays }, (_, i) => castRay({ angle: initialAngle + i * angleBetweenRays }));
};

const renderScene = ({ canvasContext, rays }) => {
  // Draw floor.
  const floorGradient = canvasContext.createLinearGradient(0, HALF_SCREEN_HEIGHT, 0, SCREEN_HEIGHT);
  floorGradient.addColorStop(0, '#000000');
  floorGradient.addColorStop(1, '#9C9C9C');
  canvasContext.fillStyle = floorGradient;//`#747474`;
  canvasContext.fillRect(0, Math.floor(HALF_SCREEN_HEIGHT), SCREEN_WIDTH, SCREEN_HEIGHT - Math.floor(HALF_SCREEN_HEIGHT));

  // Draw ceiling.
  canvasContext.fillStyle = colours.CEILING;
  canvasContext.fillRect(0, 0, SCREEN_WIDTH, Math.floor(HALF_SCREEN_HEIGHT));

  rays.forEach((ray, rayIndex) => {
    // Using this calculation for distance instead of the raw ray distance fixes
    // the fish eye effect cause by calculating the rays from a single central point
    // on the player.
    const distance = ray.distance * Math.cos(ray.angle - player.angle);
   // const floorDist = SCREEN_HEIGHT / 2 / Math.tan(FIELD_OF_VIEW / 2);
    const wallHeight = Math.floor(((CELL_SIZE * 5) / distance) * 270);
    const textureOffset = Math.floor(ray.vertical ? ray.y : ray.x);

    // Draw walls.
    canvasContext.drawImage(
      ray.wallCollision === 3 ? textures.ali : textures.wood1, 
      textureOffset - Math.floor(textureOffset / CELL_SIZE) * CELL_SIZE,                // Source image x offset
      0,                // Source image Y offset
      1,                // Source image width
      ray.wallCollision === 3 ? textures.ali.height : textures.wood1.height,               // Source image height
      rayIndex,     // Target image X offset
      Math.floor(SCREEN_HEIGHT / 2) - wallHeight / 2,                // Target image Y offset
      1,                // Target image width
      wallHeight,       // Target image height
    );

    // Make walls that are further away a bit darker.
    const darkness = Math.min(distance / 300, 1);
    canvasContext.fillStyle = `rgba(0, 0, 0, ${darkness * 0.8})`;
    canvasContext.fillRect(
      rayIndex,
      Math.floor(SCREEN_HEIGHT / 2) - Math.floor(wallHeight / 2),
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
  const miniMapCellSize = MINIMAP_SCALE * CELL_SIZE;
  const miniMapPlayerPositionX = MINIMAP_BASE_POSITION_X + player.x;
  const miniMapPlayerPositionY = MINIMAP_BASE_POSITION_Y + player.y;

  // Render the minimap by looping through map data.
  // We first loop over the rows. We can treat row index in the 2d array as a basis for Y coordinates.
  map.forEach((row, y) => {
    // Loop through each cell in the current row. We can treat cell index in the row array as a basis for X coordinates.
    row.forEach((cell, x) => {
      // TODO: Determine how to render cell based on value. For now, we are just using on or off. On being grey.
      if (cell !== 0) {
        canvasContext.fillStyle = colours.CELL;
        canvasContext.fillRect(
          MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      } else {
        canvasContext.fillStyle = 'black';
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