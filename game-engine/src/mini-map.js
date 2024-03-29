import * as constants from './constants';
import * as Types from './types';

export const initialise = () => {};

/**
 * 
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext The destination 2d canvas context for the render operation.
 * @param {Types.Orientation} params.playerOrientation
 * @param {Array<Types.RayCollision>} params.wallRays The wall rays that were cast from the player's orientation.
 * @param {Types.MapLayout} params.mapLayout
 */
export const render = ({ canvasContext, playerOrientation, mapLayout, wallRays }) => {
  const { angle: playerAngle, position: { x: playerX, y: playerY } } = playerOrientation;
  const miniMapCellSize = constants.MINIMAP_SCALE * constants.CELL_SIZE;
  const miniMapPlayerPositionX = constants.MINIMAP_BASE_POSITION_X + playerX;
  const miniMapPlayerPositionY = constants.MINIMAP_BASE_POSITION_Y + playerY;

  // Render the minimap by looping through map data.
  // We first loop over the rows. We can treat row index in the 2d array as a basis for Y coordinates.
  mapLayout.forEach((row, y) => {
    // Loop through each cell in the current row. We can treat cell index in the row array as a basis for X coordinates.
    row.forEach((cell, x) => {
      // TODO: Determine how to render cell based on value. For now, we are just using on or off. On being grey.
      if (cell !== 0) {
        canvasContext.fillStyle = constants.colours.CELL;
        canvasContext.fillRect(
          constants.MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          constants.MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      } else {
        canvasContext.fillStyle = 'black';
        canvasContext.fillRect(
          constants.MINIMAP_BASE_POSITION_X + x * miniMapCellSize,
          constants.MINIMAP_BASE_POSITION_Y + y * miniMapCellSize,
          miniMapCellSize, 
          miniMapCellSize,
        );
      }
    });
  });

  // Render the player in the minimap.
  canvasContext.fillStyle = constants.colours.MINIMAP_PLAYER;
  canvasContext.fillRect(
    miniMapPlayerPositionX * constants.MINIMAP_SCALE - (constants.MINIMAP_PLAYER_SIZE / 2),
    miniMapPlayerPositionY * constants.MINIMAP_SCALE - (constants.MINIMAP_PLAYER_SIZE / 2),
    constants.MINIMAP_PLAYER_SIZE,
    constants.MINIMAP_PLAYER_SIZE,
  );

  // Render the passed rays array.
  canvasContext.strokeStyle = constants.colours.RAYS;
  wallRays.forEach((wallRay) => {
    canvasContext.beginPath();

    // The starting point of the ray is the player location.
    canvasContext.moveTo(
      miniMapPlayerPositionX * constants.MINIMAP_SCALE,
      miniMapPlayerPositionY * constants.MINIMAP_SCALE,
    );

    // Draw the raycast ray.
    canvasContext.lineTo( 
      (miniMapPlayerPositionX + Math.cos(wallRay.source.angle) * wallRay.distance) * constants.MINIMAP_SCALE,
      (miniMapPlayerPositionY + Math.sin(wallRay.source.angle) * wallRay.distance) * constants.MINIMAP_SCALE,
    );

    // Stop drawing the ray and render it.
    canvasContext.closePath();
    canvasContext.stroke();
  });

  // Render player direction ray.
  const playerDirectionRayLength = constants.MINIMAP_PLAYER_SIZE * 2;
  canvasContext.strokeStyle = constants.colours.MINIMAP_PLAYER;
  canvasContext.beginPath();

  // The starting point of the line is the player location.
  canvasContext.moveTo(
    miniMapPlayerPositionX * constants.MINIMAP_SCALE,
    miniMapPlayerPositionY * constants.MINIMAP_SCALE,
  );

  // Draw the player direction ray.
  canvasContext.lineTo( 
    (miniMapPlayerPositionX + Math.cos(playerAngle) * playerDirectionRayLength) * constants.MINIMAP_SCALE,
    (miniMapPlayerPositionY + Math.sin(playerAngle) * playerDirectionRayLength) * constants.MINIMAP_SCALE,
  );

  // Stop drawing player direction ray and render it.
  canvasContext.closePath();
  canvasContext.stroke();
};