import * as constants from './constants';
import * as helpers from './helpers';

const inputs = {
  speed: 0,
  angularSpeed: 0,
  enableMiniMap: false,
  isRunning: false,
  pitchAngle: 0,
};

export const getState = () => inputs;

export const initialise = () => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('mousemove', handleMouseMove);
};

const handleKeyDown = (event) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'w':
      inputs.speed = constants.PLAYER_WALK_SPEED;
    break;

    case 'ArrowDown':
    case 's':
      inputs.speed = -constants.PLAYER_WALK_SPEED;
    break;

    case 'ArrowLeft':
    case 'a':
      inputs.angularSpeed = helpers.degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES);
    break;

    case 'ArrowRight':
    case 'd':
      inputs.angularSpeed = helpers.degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES);
    break;

    case 'Tab':
      inputs.enableMiniMap = !inputs.enableMiniMap;

    default: break;
  }

  if (Number.isNaN(inputs.angularSpeed)) {
    throw new Error('Angular speed set to non number');
  }
};

const handleKeyUp = (event) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'w' || event.key === 's') {
    inputs.speed = 0;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'a' || event.key === 'd') {
    inputs.angularSpeed = 0;
  }
};

const handleMouseMove = (event) => {
  const centreY = constants.HALF_SCREEN_HEIGHT_FLOORED + 1;
  const pitchFromCentre = event.clientY - centreY; // Negative pitch means heading to top of screen
  inputs.pitchAngle = (pitchFromCentre / centreY) * constants.VERTICAL_FIELD_OF_VIEW;
};
