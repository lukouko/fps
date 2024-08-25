import * as constants from './constants';
import * as helpers from './helpers';
import * as Types from './types';

const MOBILE_INPUT_X_POSITION = 50;
const MOBILE_INPUT_SIZE_RADIUS = 30;
const MOBILE_INPUT_GAP = 45;
const MOBILE_BACK_BUTTON_Y_OFFSET = 100;
const MOBILE_FORWARD_BUTTON_Y_OFFSET = 170;
const MOBILE_LEFT_BUTTON_Y_OFFSET = 100;
const MOBILE_RIGHT_BUTTON_Y_OFFSET = 100;

/**
 * Initialises inputs and returns input state.
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.inputCanvasContext
 * @param {Types.InputMethod} params.inputMethod
 * @returns {Types.InputState}
 */
export const initialise = ({ inputCanvasContext, inputMethod = 'MOBILE' }) => {
  const inputs = {
    speed: 0,
    angularSpeed: 0,
    enableMiniMap: false,
    isRunning: false,
  };

  if (inputMethod === 'KEYBOARD') {
    document.addEventListener('keydown', (event) => handleKeyDown({ event, inputs }));
    document.addEventListener('keyup', (event) => handleKeyUp({ event, inputs }));
  } else if (inputMethod === 'MOBILE') {
    drawMobileControls({ inputCanvasContext });
    inputCanvasContext.canvas.addEventListener('touchstart', (event) => handleTouchStart({ event, inputs, inputCanvasContext }), false);
    inputCanvasContext.canvas.addEventListener('touchend', (event) => handleTouchEnd({ event, inputs, inputCanvasContext }), false);
  }
  // document.addEventListener('mousemove', (event) => handleMouseMove({ event, inputs }));

  return inputs;
};

const drawMobileControls = ({ inputCanvasContext }) => {
  const inputCanvas = inputCanvasContext.canvas;

  inputCanvasContext.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

  // Draw back button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_BACK_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = 'rgba(0, 0, 0, 0.2)';
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw forward button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_FORWARD_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = 'rgba(150, 0, 0, 0.7)';
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw left button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(inputCanvas.width - MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_LEFT_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = 'rgba(0, 0, 150, 0.7)';
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw right button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(inputCanvas.width - MOBILE_INPUT_X_POSITION - MOBILE_INPUT_SIZE_RADIUS - MOBILE_INPUT_GAP, inputCanvas.height - MOBILE_RIGHT_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = 'rgba(150, 150, 0, 0.7)';
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();
};

const handleTouchStart = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  const inputCanvas = inputCanvasContext.canvas;

  const touches = event.touches;
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const x = touch.clientX;
    const y = touch.clientY;

    // Move back
    if (Math.hypot(x - 50, y - (inputCanvas.height - MOBILE_BACK_BUTTON_Y_OFFSET)) < MOBILE_INPUT_SIZE_RADIUS) {
      inputs.speed = -constants.PLAYER_WALK_SPEED;
    // Move forward
    } else if (Math.hypot(x - 50, y - (inputCanvas.height - MOBILE_FORWARD_BUTTON_Y_OFFSET)) < MOBILE_INPUT_SIZE_RADIUS) {
      inputs.speed = constants.PLAYER_WALK_SPEED;
    // Turn right
    } else if (Math.hypot(x - (inputCanvas.width - 50), y - (inputCanvas.height - MOBILE_RIGHT_BUTTON_Y_OFFSET)) < MOBILE_INPUT_SIZE_RADIUS) {
      inputs.angularSpeed = helpers.degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES);
    // Turn left
    } else if (Math.hypot(x - (inputCanvas.width - MOBILE_INPUT_X_POSITION - MOBILE_INPUT_SIZE_RADIUS - MOBILE_INPUT_GAP), y - (inputCanvas.height - MOBILE_LEFT_BUTTON_Y_OFFSET)) < MOBILE_INPUT_SIZE_RADIUS) {
      inputs.angularSpeed = helpers.degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES);
    }
  }
};

const handleTouchEnd = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  const inputCanvas = inputCanvasContext.canvas;
  const touches = event.touches;

  const touchesRemaining = {
    forward: false,
    back: false,
    left: false,
    right: false,
  }

  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const x = touch.clientX;
    const y = touch.clientY;

    if (Math.hypot(x - 50, y - (inputCanvas.height - 50)) < 40) {
      touchesRemaining.back = true;
    } else if (Math.hypot(x - 50, y - (inputCanvas.height - 150)) < 40) {
      touchesRemaining.forward = true;
    } else if (Math.hypot(x - (inputCanvas.width - 50), y - (inputCanvas.height - 100)) < 40) {
      touchesRemaining.right = true;
    } else if (Math.hypot(x - (inputCanvas.width - 150), y - (inputCanvas.height - 100)) < 40) {
      touchesRemaining.left = true;
    }
  }

  if (!touchesRemaining.back && !touchesRemaining.forward) {
    inputs.speed = 0;
  }

  if (!touchesRemaining.left && !touchesRemaining.right) {
    inputs.angularSpeed = 0;
  }
}

const handleKeyDown = ({ event, inputs }) => {
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

const handleKeyUp = ({ event, inputs }) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'w' || event.key === 's') {
    inputs.speed = 0;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'a' || event.key === 'd') {
    inputs.angularSpeed = 0;
  }
};
