const degToRadians = (deg) => (deg * Math.PI) / 180;

// General constants.
const PI = Math.PI;
const TWO_PI = PI;

const GAME_LOOP_TICK_MS = 20;
const MINIMAP_BASE_POSITION_X = 5;
const MINIMAP_BASE_POSITION_Y = 5;
const MINIMAP_SCALE = 0.10;

const MINIMAP_PLAYER_SIZE = 10;
const CELL_SIZE = 256;
const PLAYER_WALK_SPEED = 20;
const PLAYER_ANGULAR_SPEED_DEGREES = 4;
const PLAYER_CLIP_DETECTION_DISTANCE = PLAYER_WALK_SPEED + 1;
const PLAYER_HEIGHT = Math.floor(CELL_SIZE / 2);

const colours = Object.freeze({
  CELL: 'grey',
  MINIMAP_PLAYER: 'white',
  RAYS: '#ffa600',
  FLOOR: "#d52b1e", // "#ff6361"
  CEILING: '#3C3C3C', // "#012975",
  WALL: "#013aa6", // "#58508d"
  WALL_DARK: "#012975", // "#003f5c"
});

module.exports = Object.freeze({
  PI,
  TWO_PI,
  GAME_LOOP_TICK_MS,
  MINIMAP_BASE_POSITION_X,
  MINIMAP_BASE_POSITION_Y,
  MINIMAP_SCALE,
  MINIMAP_PLAYER_SIZE,
  CELL_SIZE,
  PLAYER_WALK_SPEED,
  PLAYER_ANGULAR_SPEED_DEGREES,
  PLAYER_CLIP_DETECTION_DISTANCE,
  PLAYER_HEIGHT,
  colours,
});