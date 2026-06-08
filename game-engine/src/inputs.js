import * as constants from './constants';
import * as helpers from './helpers';
import * as Types from './types';

const MOBILE_INPUT_X_POSITION = 50;
const MOBILE_INPUT_SIZE_RADIUS = 45;
const MOBILE_INPUT_GAP = 60;
const MOBILE_BACK_BUTTON_Y_OFFSET = 120;
const MOBILE_FORWARD_BUTTON_Y_OFFSET = 220;  // 100px gap from back button
const MOBILE_LEFT_BUTTON_Y_OFFSET = 120;
const MOBILE_RIGHT_BUTTON_Y_OFFSET = 120;
const MOBILE_BUTTON_COLOR = 'rgba(0, 0, 0, 0.2)';  // Light grey for all buttons

let currentInputMethod = 'KEYBOARD';
let currentInputState = null;
let currentInputCanvasContext = null;
let fullscreenRequested = false;

/**
 * Initialises inputs and returns input state.
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.inputCanvasContext
 * @param {Types.InputMethod} params.inputMethod
 * @returns {Types.InputState}
 */
export const initialise = ({ inputCanvasContext, inputMethod }) => {
  const inputs = {
    speed: 0,
    angularSpeed: 0,
    enableMiniMap: false,
    isRunning: false,
  };

  currentInputState = inputs;
  currentInputCanvasContext = inputCanvasContext;
  currentInputMethod = inputMethod || (helpers.isMobileDevice() ? 'MOBILE' : 'KEYBOARD');

  setupInputHandlers({ inputCanvasContext, inputs });

  return inputs;
};

const setupInputHandlers = ({ inputCanvasContext, inputs }) => {
  // Always listen for the toggle key
  document.addEventListener('keydown', (event) => handleKeyDown({ event, inputs }));
  document.addEventListener('keyup', (event) => handleKeyUp({ event, inputs }));

  if (currentInputMethod === 'MOBILE') {
    drawMobileControls({ inputCanvasContext });
    inputCanvasContext.canvas.addEventListener('touchstart', (event) => handleTouchStart({ event, inputs, inputCanvasContext }), false);
    inputCanvasContext.canvas.addEventListener('touchend', (event) => handleTouchEnd({ event, inputs, inputCanvasContext }), false);
  }
};

const toggleInputMethod = () => {
  const newMethod = currentInputMethod === 'KEYBOARD' ? 'MOBILE' : 'KEYBOARD';
  switchInputMethod({ inputMethod: newMethod });
};

const switchInputMethod = ({ inputMethod }) => {
  // Clear existing listeners
  const canvas = currentInputCanvasContext.canvas;
  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchend', handleTouchEnd);

  // Reset input state
  currentInputState.speed = 0;
  currentInputState.angularSpeed = 0;

  currentInputMethod = inputMethod;
  setupInputHandlers({ inputCanvasContext: currentInputCanvasContext, inputs: currentInputState });

  console.log(`Input method switched to: ${inputMethod}`);
};

const drawMobileControls = ({ inputCanvasContext }) => {
  const inputCanvas = inputCanvasContext.canvas;

  inputCanvasContext.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

  // Draw back button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_BACK_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = MOBILE_BUTTON_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw forward button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_FORWARD_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = MOBILE_BUTTON_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw right button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(inputCanvas.width - MOBILE_INPUT_X_POSITION, inputCanvas.height - MOBILE_RIGHT_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = MOBILE_BUTTON_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw left button
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(inputCanvas.width - MOBILE_INPUT_X_POSITION - MOBILE_INPUT_SIZE_RADIUS - MOBILE_INPUT_GAP, inputCanvas.height - MOBILE_LEFT_BUTTON_Y_OFFSET, MOBILE_INPUT_SIZE_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = MOBILE_BUTTON_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();
};

const getButtonPositions = ({ canvasWidth, canvasHeight }) => ({
  back: { x: MOBILE_INPUT_X_POSITION, y: canvasHeight - MOBILE_BACK_BUTTON_Y_OFFSET },
  forward: { x: MOBILE_INPUT_X_POSITION, y: canvasHeight - MOBILE_FORWARD_BUTTON_Y_OFFSET },
  left: { x: canvasWidth - MOBILE_INPUT_X_POSITION - MOBILE_INPUT_SIZE_RADIUS - MOBILE_INPUT_GAP, y: canvasHeight - MOBILE_LEFT_BUTTON_Y_OFFSET },
  right: { x: canvasWidth - MOBILE_INPUT_X_POSITION, y: canvasHeight - MOBILE_RIGHT_BUTTON_Y_OFFSET },
});

const getCanvasRelativeCoordinates = ({ clientX, clientY, canvas }) => {
  // Use canvas.getBoundingClientRect to account for CSS transforms and scaling
  const rect = canvas.getBoundingClientRect();

  // Ensure we have valid dimensions
  if (!rect || rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 };
  }

  // Calculate position relative to canvas viewport, then scale to internal resolution
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;

  // Scale from CSS display size to canvas internal resolution
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = relativeX * scaleX;
  const y = relativeY * scaleY;

  // Clamp to canvas bounds
  const clampedX = Math.max(0, Math.min(x, canvas.width));
  const clampedY = Math.max(0, Math.min(y, canvas.height));

  return { x: clampedX, y: clampedY };
};

const isTouchInButton = ({ x, y, buttonPos }) => Math.hypot(x - buttonPos.x, y - buttonPos.y) < MOBILE_INPUT_SIZE_RADIUS;

const handleTouchStart = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  const canvas = inputCanvasContext.canvas;
  const buttonPositions = getButtonPositions({ canvasWidth: canvas.width, canvasHeight: canvas.height });

  const touches = event.touches;
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const { x, y } = getCanvasRelativeCoordinates({ clientX: touch.clientX, clientY: touch.clientY, canvas });

    if (isTouchInButton({ x, y, buttonPos: buttonPositions.back })) {
      inputs.speed = -constants.PLAYER_WALK_SPEED;
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.forward })) {
      inputs.speed = constants.PLAYER_WALK_SPEED;
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.right })) {
      inputs.angularSpeed = helpers.degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES);
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.left })) {
      inputs.angularSpeed = helpers.degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES);
    }
  }
};

const handleTouchEnd = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  const canvas = inputCanvasContext.canvas;
  const buttonPositions = getButtonPositions({ canvasWidth: canvas.width, canvasHeight: canvas.height });
  const touches = event.touches;

  const touchesRemaining = {
    forward: false,
    back: false,
    left: false,
    right: false,
  };

  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const { x, y } = getCanvasRelativeCoordinates({ clientX: touch.clientX, clientY: touch.clientY, canvas });

    if (isTouchInButton({ x, y, buttonPos: buttonPositions.back })) {
      touchesRemaining.back = true;
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.forward })) {
      touchesRemaining.forward = true;
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.right })) {
      touchesRemaining.right = true;
    } else if (isTouchInButton({ x, y, buttonPos: buttonPositions.left })) {
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
      break;

    case 'c':
    case 'C':
      event.preventDefault();
      toggleInputMethod();
      break;

    case 'F1':
    case 'F2':
      event.preventDefault();
      toggleInputMethod();
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
