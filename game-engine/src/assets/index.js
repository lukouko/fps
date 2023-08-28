// @ts-nocheck
import bricks1 from './bricks_1_256_256.jpg';
import bricks2 from './bricks_2_256_256.jpg';
import verticalTimber1 from './vertical_timber_1_256_256.jpg';
import tiles1 from './tiles_1_256_256.jpg';
import tiles2 from './tiles_2_256_256.jpg';
import plaster1 from './plaster_1_256_256.jpg';
import asphalt1 from './asphalt_1_256_256.jpg';
import horizontalTimber1 from './horizontal_timber_1_256_256.jpg';
import underConstruction from './under_construction.jpg';

// Sprites.
import betterLookingMatt from './better-looking-matt.png';
// import clouds1 from './clouds_1_508.jpg';

const images = [
  { id: 'bricks_1', assetPath: bricks1 },
  { id: 'bricks_2', assetPath: bricks2 },
  { id: 'vertical_timber_1', assetPath: verticalTimber1 },
  { id: 'tiles_1', assetPath: tiles1 },
  { id: 'tiles_2', assetPath: tiles2 },
  { id: 'plaster_1', assetPath: plaster1 },
  { id: 'asphalt_1', assetPath: asphalt1 },
  { id: 'horizontal_timber_1', assetPath: horizontalTimber1 },
  { id: 'under_construction', assetPath: underConstruction },
  { id: 'better-looking-matt', assetPath: betterLookingMatt, isSprite: true },
  // { id: 'clouds1', assetPath: clouds1, isRepeatable: true },
];

export {
  images,
};
