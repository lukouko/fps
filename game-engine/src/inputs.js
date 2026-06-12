import * as constants from './constants';
import * as helpers from './helpers';
import * as Types from './types';

// Joystick configuration
const JOYSTICK_MAX_RADIUS = 60;
const JOYSTICK_DEAD_ZONE = 8;
const JOYSTICK_COLOR = 'rgba(100, 150, 255, 0.3)';
const JOYSTICK_THUMB_COLOR = 'rgba(100, 150, 255, 0.6)';

/**
 * Sets whether the activate button should be highlighted.
 * Called by the UI layer when an activatable is nearby.
 * @param {Object} params
 * @param {boolean} params.highlight
 */
export const setActivateButtonHighlight = ({ highlight }) => {
  highlightActivateButton = highlight;
};

/**
 * Computes joystick input from a deflection vector.
 * @param {Object} params
 * @param {number} params.dx Deflection X from stick centre (pixels)
 * @param {number} params.dy Deflection Y from stick centre (pixels)
 * @param {number} params.maxRadius Maximum radius of deflection (pixels)
 * @param {number} params.deadZone Minimum deflection magnitude to register input (pixels)
 * @param {number} params.walkSpeed Maximum forward/backward speed
 * @param {number} params.maxAngularSpeed Maximum rotational speed (radians)
 * @returns {{ speed: number, angularSpeed: number }}
 */
export const computeJoystickInput = ({ dx, dy, maxRadius, deadZone, walkSpeed, maxAngularSpeed }) => {
  const magnitude = Math.hypot(dx, dy);

  if (magnitude < deadZone) {
    return { speed: 0, angularSpeed: 0 };
  }

  const clampedMagnitude = Math.min(magnitude, maxRadius);
  const scale = clampedMagnitude / maxRadius;
  const dirX = dx / magnitude;
  const dirY = dy / magnitude;

  return {
    speed: -dirY * scale * walkSpeed,
    angularSpeed: dirX * scale * maxAngularSpeed,
  };
};

let currentInputMethod = 'KEYBOARD';
let currentInputState = null;
let currentInputCanvasContext = null;
let fullscreenRequested = false;

// Mobile joystick state
let joystickState = null; // { centreX, centreY, touchIdentifier, deflectX, deflectY } when active

// Activate button configuration
const ACTIVATE_BUTTON_RADIUS = 45;
const ACTIVATE_BUTTON_X_OFFSET = 50;
const ACTIVATE_BUTTON_Y_OFFSET = 120;
const ACTIVATE_BUTTON_COLOR = 'rgba(255, 100, 100, 0.3)';
const ACTIVATE_BUTTON_HIGHLIGHT_COLOR = 'rgba(255, 150, 150, 0.7)';
const ACTIVATE_BUTTON_FLASH_COLOR = 'rgba(255, 200, 200, 0.9)';
const ACTIVATE_BUTTON_FLASH_MS = 200;

// Track which keys are down to prevent repeat activation
const keysDown = new Set();

// Track whether to highlight the activate button (when near an activatable)
let highlightActivateButton = false;

// Track when the activate button was last pressed for flash effect
let lastActivatePressTime = 0;

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
    activate: false,
  };

  currentInputState = inputs;
  currentInputCanvasContext = inputCanvasContext;
  currentInputMethod = inputMethod || (helpers.isMobileDevice() ? 'MOBILE' : 'KEYBOARD');
  keysDown.clear();
  highlightActivateButton = false;
  lastActivatePressTime = 0;

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
    inputCanvasContext.canvas.addEventListener('touchmove', (event) => handleTouchMove({ event, inputs, inputCanvasContext }), false);
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
  canvas.removeEventListener('touchmove', handleTouchMove);
  canvas.removeEventListener('touchend', handleTouchEnd);

  // Reset input state
  currentInputState.speed = 0;
  currentInputState.angularSpeed = 0;
  currentInputState.activate = false;
  joystickState = null;
  keysDown.clear();
  highlightActivateButton = false;
  lastActivatePressTime = 0;

  currentInputMethod = inputMethod;
  setupInputHandlers({ inputCanvasContext: currentInputCanvasContext, inputs: currentInputState });

  console.log(`Input method switched to: ${inputMethod}`);
};

const drawMobileControls = ({ inputCanvasContext }) => {
  const inputCanvas = inputCanvasContext.canvas;
  inputCanvasContext.clearRect(0, 0, inputCanvas.width, inputCanvas.height);

  // If joystick is active, draw it at its current position
  if (joystickState) {
    drawJoystick({ inputCanvasContext, centreX: joystickState.centreX, centreY: joystickState.centreY, deflectX: joystickState.deflectX, deflectY: joystickState.deflectY });
  }

  // Draw activate button (bottom-right)
  const activateX = inputCanvas.width - ACTIVATE_BUTTON_X_OFFSET;
  const activateY = inputCanvas.height - ACTIVATE_BUTTON_Y_OFFSET;

  // Determine button color: flash > highlight > normal
  let buttonColor = ACTIVATE_BUTTON_COLOR;
  const now = performance.now();
  if (now - lastActivatePressTime < ACTIVATE_BUTTON_FLASH_MS) {
    buttonColor = ACTIVATE_BUTTON_FLASH_COLOR;
  } else if (highlightActivateButton) {
    buttonColor = ACTIVATE_BUTTON_HIGHLIGHT_COLOR;
  }

  inputCanvasContext.beginPath();
  inputCanvasContext.arc(activateX, activateY, ACTIVATE_BUTTON_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = buttonColor;
  inputCanvasContext.fill();
  inputCanvasContext.strokeStyle = 'rgba(255, 100, 100, 0.5)';
  inputCanvasContext.lineWidth = 2;
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();
};

const drawJoystick = ({ inputCanvasContext, centreX, centreY, deflectX, deflectY }) => {
  // Draw base ring
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(centreX, centreY, JOYSTICK_MAX_RADIUS, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = JOYSTICK_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.strokeStyle = 'rgba(100, 150, 255, 0.5)';
  inputCanvasContext.lineWidth = 2;
  inputCanvasContext.stroke();
  inputCanvasContext.closePath();

  // Draw thumb at deflection point
  const thumbX = centreX + deflectX;
  const thumbY = centreY + deflectY;
  inputCanvasContext.beginPath();
  inputCanvasContext.arc(thumbX, thumbY, 15, 0, 2 * Math.PI);
  inputCanvasContext.fillStyle = JOYSTICK_THUMB_COLOR;
  inputCanvasContext.fill();
  inputCanvasContext.closePath();
};

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

const handleTouchStart = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  const canvas = inputCanvasContext.canvas;
  const touches = event.touches;
  const activateButtonX = canvas.width - ACTIVATE_BUTTON_X_OFFSET;
  const activateButtonY = canvas.height - ACTIVATE_BUTTON_Y_OFFSET;

  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const { x, y } = getCanvasRelativeCoordinates({ clientX: touch.clientX, clientY: touch.clientY, canvas });

    // Check if touch is on Activate button (bottom-right)
    const distToActivateButton = Math.hypot(x - activateButtonX, y - activateButtonY);
    if (distToActivateButton < ACTIVATE_BUTTON_RADIUS) {
      inputs.activate = true;
      lastActivatePressTime = performance.now();
    }

    // If joystick is not active and touch is in left half, start joystick
    if (!joystickState && x < canvas.width / 2) {
      joystickState = {
        centreX: x,
        centreY: y,
        touchIdentifier: touch.identifier,
        deflectX: 0,
        deflectY: 0,
      };
    }
  }

  drawMobileControls({ inputCanvasContext });
};

const handleTouchMove = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  if (!joystickState) return;

  const canvas = inputCanvasContext.canvas;
  const touches = event.touches;

  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    if (touch.identifier === joystickState.touchIdentifier) {
      const { x, y } = getCanvasRelativeCoordinates({ clientX: touch.clientX, clientY: touch.clientY, canvas });
      const dx = x - joystickState.centreX;
      const dy = y - joystickState.centreY;

      // Clamp deflection to max radius
      const magnitude = Math.hypot(dx, dy);
      if (magnitude > JOYSTICK_MAX_RADIUS) {
        const scale = JOYSTICK_MAX_RADIUS / magnitude;
        joystickState.deflectX = dx * scale;
        joystickState.deflectY = dy * scale;
      } else {
        joystickState.deflectX = dx;
        joystickState.deflectY = dy;
      }

      // Compute input from deflection
      const result = computeJoystickInput({
        dx: joystickState.deflectX,
        dy: joystickState.deflectY,
        maxRadius: JOYSTICK_MAX_RADIUS,
        deadZone: JOYSTICK_DEAD_ZONE,
        walkSpeed: constants.PLAYER_WALK_SPEED,
        maxAngularSpeed: helpers.degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES),
      });

      inputs.speed = result.speed;
      inputs.angularSpeed = result.angularSpeed;

      drawMobileControls({ inputCanvasContext });
      break;
    }
  }
};

const handleTouchEnd = ({ event, inputs, inputCanvasContext }) => {
  event.preventDefault();
  if (!joystickState) return;

  const touches = event.touches;
  let joystickTouchFound = false;

  for (let i = 0; i < touches.length; i++) {
    if (touches[i].identifier === joystickState.touchIdentifier) {
      joystickTouchFound = true;
      break;
    }
  }

  // If the joystick touch ended, reset joystick state and inputs
  if (!joystickTouchFound) {
    joystickState = null;
    inputs.speed = 0;
    inputs.angularSpeed = 0;
  }

  drawMobileControls({ inputCanvasContext });
}

const handleKeyDown = ({ event, inputs }) => {
  // Guard against key repeat: only fire on the first press, not the auto-repeat
  if (!keysDown.has(event.key)) {
    keysDown.add(event.key);

    switch (event.key) {
      case 'e':
      case 'E':
        inputs.activate = true;
        lastActivatePressTime = performance.now();
        break;
      default:
        break;
    }
  }

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
  keysDown.delete(event.key);

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'w' || event.key === 's') {
    inputs.speed = 0;
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'a' || event.key === 'd') {
    inputs.angularSpeed = 0;
  }
};
