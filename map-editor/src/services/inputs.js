import * as helpers from 'game-engine/helpers';
import * as Types from 'map-editor/types';

const WALK_SPEED = 30;
const ANGULAR_SPEED = 4;

/**
 * Initialises inputs and returns input state.
 * @returns {Types.InputState}
 */
export const initialise = () => {
  const inputs = {
    speed: 0,
    angularSpeed: 0,
    enableMiniMap: false,
    isRunning: false,
  };

  document.addEventListener('keydown', (event) => handleKeyDown({ event, inputs }));
  document.addEventListener('keyup', (event) => handleKeyUp({ event, inputs }));
  // document.addEventListener('mousemove', (event) => handleMouseMove({ event, inputs }));

  return inputs;
};

const handleKeyDown = ({ event, inputs }) => {
  switch (event.key) {
    case 'ArrowUp':
    case 'w':
      inputs.speed = WALK_SPEED;
    break;

    case 'ArrowDown':
    case 's':
      inputs.speed = -WALK_SPEED;
    break;

    case 'ArrowLeft':
    case 'a':
      inputs.angularSpeed = helpers.degToRadians(-ANGULAR_SPEED);
    break;

    case 'ArrowRight':
    case 'd':
      inputs.angularSpeed = helpers.degToRadians(ANGULAR_SPEED);
    break;

    default: break;
  }

  if (Number.isNaN(inputs.angularSpeed)) {
    throw new Error('Angular speed set to non number');
  }
};

const handleKeyUp = ({ event, inputs }) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'w' || event.key === 's') {
    inputs.speed = 0;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'a' || event.key === 'd') {
    inputs.angularSpeed = 0;
  }
};
