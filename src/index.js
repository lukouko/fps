const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const GAME_LOOP_TICK_MS = 30;
const MINIMAP_BASE_POSITION_X = 5;
const MINIMAP_BASE_POSITION_Y = 5;
const MINIMAP_SCALE = 0.75;
const CELL_SIZE = 64;

const map = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const player = {
  x: CELL_SIZE * 1.5,
  y: CELL_SIZE * 2,
  angle: 0,
  speed: 0,
};

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

  console.log('Loaded');

  setInterval(() => gameLoop({ canvasContext }), GAME_LOOP_TICK_MS);
  
};

const clearScreen = ({ canvasContext }) => {
  canvasContext.fillStyle = 'black';
  canvasContext.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
};

const movePlayer = () => {

};

const getRays = () => {
  return [];
};

const renderScene = ({ rays }) => {

};

const renderMiniMap = ({ canvasContext, rays }) => {
  const miniMapCellSize = MINIMAP_SCALE * CELL_SIZE;

  // Loop through map data, first by row. We can treat row index in the 2d array as a basis for Y coordinates.
  map.forEach((row, y) => {
    // Loop through each cell in the current row. We can treat cell index in the row array as a basis for X coordinates.
    row.forEach((cell, x) => {
      // TODO: Determine how to render cell based on value. For now, we are just using on or off. On being grey.
      if (cell === 1) {
        canvasContext.fillStyle = 'grey';
        canvasContext.fillRect(
          MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      }
    });
  });

};

const gameLoop = ({ canvasContext }) => {
  clearScreen({ canvasContext });
  movePlayer();
  
  const rays = getRays();
  renderScene({ rays });
  renderMiniMap({ canvasContext, rays });
};

initialise();