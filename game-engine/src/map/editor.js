
export const createMap = ({ width, height }) => {
  const defaultWallTextureId = 'bricks_1';
  const defaultFloorTextureId = 'tiles_1';
  const defaultCeilingTextureId = 'plaster_1';

  const newMap = [];

  for (let yIndex = 0; yIndex < height; ++yIndex) {
    newMap[yIndex] = [];

    for (let xIndex = 0; xIndex < width; ++xIndex) {
      // If we are at the edge of the map, set a default wall texture.
      if (yIndex === 0 || yIndex === (height - 1) || xIndex === 0 || xIndex === (width - 1)) {
        newMap[yIndex][xIndex] = {
          wallTextureId: defaultWallTextureId,
        };
      } else {
        newMap[yIndex][xIndex] = {
          floorTextureId: defaultFloorTextureId,
          ceilingTextureId: defaultCeilingTextureId,
        };
      }
    }
  }

  return newMap;
};