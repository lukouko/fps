import * as constants from './constants';
import * as Types from './types';

/**
 * Registry of activatable types and their properties.
 * @type {Object<Types.ActivatableType, Types.ActivatableTypeDefinition>}
 */
export const activatableTypes = {
  door: {
    noun: 'Door',
    verbOn: 'Open',
    verbOff: 'Close',
  },
};

/**
 * Toggles a door between open and closed.
 * Closed → Open: set openness = 1, delete wallTextureId (allows passage)
 * Open → Closed: set openness = 0, restore wallTextureId (blocks passage)
 * @param {Object} params
 * @param {Types.MapCell} params.cell The door cell to toggle.
 */
export const toggleDoor = ({ cell }) => {
  if (!cell.door) return;

  if (cell.openness >= constants.DOOR_OPEN_THRESHOLD) {
    // Close the door
    cell.openness = 0;
    cell.wallTextureId = cell.doorTextureId;
  } else {
    // Open the door
    cell.openness = 1;
    delete cell.wallTextureId;
  }
};

/**
 * Finds the activatable (door) cell under the player's crosshair.
 * @param {Object} params
 * @param {Types.RayCollision} params.centreRay The ray cast from the player's centre looking forward.
 * @param {number} params.maxDistance Maximum distance to activate from.
 * @returns {Types.MapCell|null} The door cell if one is under the crosshair within range, null otherwise.
 */
export const findActivatable = ({ centreRay, maxDistance }) => {
  if (!centreRay || centreRay.distance > maxDistance) {
    return null;
  }

  const cell = centreRay.mapCell;
  if (cell && cell.door) {
    return cell;
  }

  return null;
};
