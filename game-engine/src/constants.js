// General constants.
const PI = Math.PI;
const TWO_PI = PI;

// The attempted amount of time between frames.
// If render takes longer than this, we will start losing frames.
// The target frame rate is 1000 / GAME_LOOP_TICK_MS
const GAME_LOOP_TICK_MS = 20;

// Location on the screen to display the minimap.
const MINIMAP_BASE_POSITION_X = 5;
const MINIMAP_BASE_POSITION_Y = 5;

// Minimap scaling factor, allows making the minimap smaller or larger.
const MINIMAP_SCALE = 0.10;

// How many pixels for the player on the minimap.
const MINIMAP_PLAYER_SIZE = 10;

// How large each 2d cell making up the map is in game world space.
const CELL_SIZE = 256;

// The speed at which the player can walk.
const PLAYER_WALK_SPEED = 20;

// The speed at which the player can turn.
const PLAYER_ANGULAR_SPEED_DEGREES = 4;

// How close to a wall can the player get.
const PLAYER_CLIP_DETECTION_DISTANCE = PLAYER_WALK_SPEED + 1;

// Vertical centering of the player on the screen.
// Player can be made higher or lower than centre if desired.
const PLAYER_HEIGHT = Math.floor(CELL_SIZE / 2);

// How often the client sends information to the server.
// Measured in game ticks.
// I.e. NETWORK_DATA_INTERVAL_TICKS * GAME_LOOP_TICK_MS = amount of time in MS between messages.
const NETWORK_DATA_INTERVAL_TICKS = 10; // 200 MS

// Sometimes we wont send updates to the server, e.g. if the player isn't moving
// This is the max amount of time we are willing to wait in ticks before we must send.
const MAX_RADIO_SILENCE_TICKS = 100; // 2 seconds

// Message types that are supported from the server.
const serverMessageTypes = Object.freeze({
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED',
});

// Message types that the client can send to the server.
const clientMessageTypes = Object.freeze({
  GAME_STATE_UPDATE: 'GAME_STATE_UPDATE',
  PLAYER_DEAD: 'PLAYER_DEAD',
});

// Some colour constants...only used by the minimap atm.
const colours = Object.freeze({
  CELL: 'grey',
  MINIMAP_PLAYER: 'white',
  RAYS: '#ffa600',
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
  NETWORK_DATA_INTERVAL_TICKS,
  MAX_RADIO_SILENCE_TICKS,
  serverMessageTypes,
  clientMessageTypes,
});