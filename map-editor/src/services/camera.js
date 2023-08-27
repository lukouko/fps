import * as constants from 'game-engine/constants';
import * as map from './map';
import * as Types from 'map-editor/types';

/**
 * Returns the initial state representing the camera.
 * @returns {Types.CameraState}
 */
export const initialise = () => ({
  camera: {
    cellPosition: {
      x: 1,
      y: 1,
    },
    orientation: {
      position: {
        x: 2001,
        y: 2848,
      },
      angle: 0.003912244016675004,//0,
      /*
      position: {
        x: 2001,
        y: 2848,
      },
      angle: 3.0756917275266815,//0,*/
    },
    isMoving: false,
  },
});


/**
 * Renders the camera to the screen.
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext A 2d canvas context from the canvas which is the render destination.
 * @param {Types.DisplayInfo} params.displayInfo
 */
export const render = ({ canvasContext, displayInfo }) => {
  // Draw indicator of target location.
  canvasContext.fillStyle = 'white';
  canvasContext.fillRect(displayInfo.halfWidthFloored, displayInfo.halfHeightFloored + 50, 2, 2);
};

/**
 * Applies the current inputs to the player state, i.e. moves the player.
 * @param {Object} params
 * @param {Types.InputState} params.inputState The current input state.
 * @param {Types.CameraState} params.cameraState The current camera state.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns 
 */
export const move = ({ inputState, cameraState, mapState }) => {
  const { camera } = cameraState;

  // Calculate camera movement.
  camera.orientation.angle += (inputState.angularSpeed + (2 * Math.PI)); // We add a full circle rotation to the angular speed to ensure we don't get negative angles.
  camera.orientation.angle = camera.orientation.angle % (2 * Math.PI); // Normalise to a single circle.
  const xMovement = Math.cos(camera.orientation.angle) * inputState.speed;
  const yMovement = Math.sin(camera.orientation.angle) * inputState.speed;

  // Clipping checking.

  /** @type Types.Position */
  const hypotheticalCell = {
    x: Math.floor((camera.orientation.position.x + xMovement) / constants.CELL_SIZE),
    y: Math.floor((camera.orientation.position.y + yMovement) / constants.CELL_SIZE),
  };

  if (!map.canMoveToCellLocation({ position: hypotheticalCell, mapState })) {
    return;
  }

  // Move the player in space.
  camera.orientation.position.x = Math.floor(camera.orientation.position.x + xMovement);
  camera.orientation.position.y = Math.floor(camera.orientation.position.y + yMovement);

  // Update camera cell position
  camera.cellPosition.x = Math.floor(camera.orientation.position.x / constants.CELL_SIZE);
  camera.cellPosition.y = Math.floor(camera.orientation.position.y / constants.CELL_SIZE);
};

export const addXandY = ({ cameraState, mapState, x = 0, y = 0 }) => {
  const { camera } = cameraState;

  // Calculate camera movement.
  const xMovement = x;
  const yMovement = y;

  // Clipping checking.

  /** @type Types.Position */
  const hypotheticalCell = {
    x: Math.floor((camera.orientation.position.x + xMovement) / constants.CELL_SIZE),
    y: Math.floor((camera.orientation.position.y + yMovement) / constants.CELL_SIZE),
  };

  if (!map.canMoveToCellLocation({ position: hypotheticalCell, mapState })) {
    return;
  }

  // Move the player in space.
  camera.orientation.position.x = Math.floor(camera.orientation.position.x + xMovement);
  camera.orientation.position.y = Math.floor(camera.orientation.position.y + yMovement);

  // Update camera cell position
  camera.cellPosition.x = Math.floor(camera.orientation.position.x / constants.CELL_SIZE);
  camera.cellPosition.y = Math.floor(camera.orientation.position.y / constants.CELL_SIZE);
};