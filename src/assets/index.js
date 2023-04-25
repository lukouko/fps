// @ts-nocheck
import wall1 from './medieval_blocks_03_diff_64_64.png';
import wall2 from './brown_planks_128_128.jpg';
import wall3 from './brick_wall_128_128.jpg';
import gun1 from './gun1.png';
import gun2 from './gun2.png';
import floorTiles1 from './floor_tiles_256_256.jpg';
import clouds1 from './clouds_1_508.jpg';

const images = [
  { id: 'wall1', assetPath: wall1 },
  { id: 'wall2', assetPath: wall2 },
  { id: 'wall3', assetPath: wall3 },
  { id: 'floor1', assetPath: floorTiles1 },
  { id: 'gun1', assetPath: gun1 },
  { id: 'gun2', assetPath: gun2 },
  { id: 'gun2', assetPath: gun2 },
  { id: 'clouds1', assetPath: clouds1, isRepeatable: true },
];

export {
  images,
};
