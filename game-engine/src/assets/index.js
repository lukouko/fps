// @ts-nocheck

// ── Sky textures ──────────────────────────────────────────────────────────────
import clouds1 from './textures/sky/clouds_1_508.jpg';
import cityNight from './textures/sky/city_night_1774.png';

// ── Textures ─────────────────────────────────────────────────────────────────
import bricks1           from './textures/bricks_1_256_256.jpg';
import bricks2           from './textures/bricks_2_256_256.jpg';
import verticalTimber1   from './textures/vertical_timber_1_256_256.jpg';
import tiles1            from './textures/tiles_1_256_256.jpg';
import tiles2            from './textures/tiles_2_256_256.jpg';
import plaster1          from './textures/plaster_1_256_256.jpg';
import asphalt1          from './textures/asphalt_1_256_256.jpg';
import horizontalTimber1 from './textures/horizontal_timber_1_256_256.jpg';
import underConstruction from './textures/under_construction.jpg';
import concreteWall      from './textures/concrete_wall.jpg';
import betterLookingBart from './bart.jpg';


// ── HUD assets (guns) ────────────────────────────────────────────────────────
import gun1 from './gun1.png';
import gun2 from './gun2.png';

// ── World sprites ─────────────────────────────────────────────────────────────
import betterLookingMatt  from './sprites/better-looking-matt.png';

const images = [
  { id: 'bricks_1',           assetPath: bricks1 },
  { id: 'bricks_2',           assetPath: bricks2 },
  { id: 'vertical_timber_1',  assetPath: verticalTimber1 },
  { id: 'tiles_1',            assetPath: tiles1 },
  { id: 'tiles_2',            assetPath: tiles2 },
  { id: 'plaster_1',          assetPath: plaster1 },
  { id: 'asphalt_1',          assetPath: asphalt1 },
  { id: 'horizontal_timber_1',assetPath: horizontalTimber1 },
  { id: 'under_construction', assetPath: underConstruction },
  { id: 'better-looking-bart',assetPath: betterLookingBart },
  { id: 'concrete_wall',      assetPath: concreteWall },
  // Sky
  { id: 'clouds_1',    assetPath: clouds1 },
  { id: 'city_night',  assetPath: cityNight },
  // HUD
  { id: 'gun1', assetPath: gun1 },
  { id: 'gun2', assetPath: gun2 },
  // World sprites
  { id: 'better-looking-matt',   assetPath: betterLookingMatt,  isSprite: true },
];

export { images };
