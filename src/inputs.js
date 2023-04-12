import * as constants from './constants';
import * as helpers from './helpers';

const inputs = {
  speed: 0,
  angularSpeed: 0,
};

export const getCurrent = () => Object.freeze(inputs);

export const initialise = () => {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  // document.addEventListener('mousemove', handleMouseMove);
};

const handleKeyDown = (event) => {
  switch (event.key) {
    case 'ArrowUp':
      inputs.speed = constants.PLAYER_WALK_SPEED;
    break;

    case 'ArrowDown':
      inputs.speed = -constants.PLAYER_WALK_SPEED;
    break;

    case 'ArrowLeft':
      inputs.angularSpeed = helpers.degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES);
    break;

    case 'ArrowRight':
      inputs.angularSpeed = helpers.degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES);
    break;

    default: break;
  }

  if (Number.isNaN(inputs.angularSpeed)) {
    throw new Error('Angular speed set to non number');
  }
};

const handleKeyUp = (event) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    inputs.speed = 0;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    inputs.angularSpeed = 0;
  }
};
