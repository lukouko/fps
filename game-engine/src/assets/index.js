// @ts-nocheck

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
import betterLookingBart from './textures/bart.jpg';
import concreteWall      from './textures/concrete_wall.jpg';
import stoneFloor        from './textures/stone_floor.jpg';
import carpetRed         from './textures/carpet_red.jpg';
import carpetBlue        from './textures/carpet_blue.jpg';
import metalWall         from './textures/metal_wall.jpg';
import metalFloor        from './textures/metal_floor.jpg';
import darkWoodFloor     from './textures/dark_wood_floor.jpg';
import marbleFloor       from './textures/marble_floor.jpg';
import ceilingPlaster    from './textures/ceiling_plaster.jpg';
import stoneWall         from './textures/stone_wall.jpg';
import paintedWhite      from './textures/painted_white.jpg';
import darkBrick         from './textures/dark_brick.jpg';
import woodPanel         from './textures/wood_panel.jpg';
import mossyStone        from './textures/mossy_stone.jpg';
import tileChecker       from './textures/tile_checker.jpg';

// ── HUD assets (guns) ────────────────────────────────────────────────────────
import gun1 from './gun1.png';
import gun2 from './gun2.png';

// ── World sprites ─────────────────────────────────────────────────────────────
import betterLookingMatt  from './sprites/better-looking-matt.png';
import spritePotPlant     from './sprites/sprite_pot_plant.png';
import spritePictureFrame from './sprites/sprite_picture_frame.png';
import spriteBarrel       from './sprites/sprite_barrel.png';
import spriteFloorLamp    from './sprites/sprite_floor_lamp.png';
import spriteColumn       from './sprites/sprite_column.png';

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
  { id: 'stone_floor',        assetPath: stoneFloor },
  { id: 'carpet_red',         assetPath: carpetRed },
  { id: 'carpet_blue',        assetPath: carpetBlue },
  { id: 'metal_wall',         assetPath: metalWall },
  { id: 'metal_floor',        assetPath: metalFloor },
  { id: 'dark_wood_floor',    assetPath: darkWoodFloor },
  { id: 'marble_floor',       assetPath: marbleFloor },
  { id: 'ceiling_plaster',    assetPath: ceilingPlaster },
  { id: 'stone_wall',         assetPath: stoneWall },
  { id: 'painted_white',      assetPath: paintedWhite },
  { id: 'dark_brick',         assetPath: darkBrick },
  { id: 'wood_panel',         assetPath: woodPanel },
  { id: 'mossy_stone',        assetPath: mossyStone },
  { id: 'tile_checker',       assetPath: tileChecker },
  // HUD
  { id: 'gun1', assetPath: gun1 },
  { id: 'gun2', assetPath: gun2 },
  // World sprites
  { id: 'better-looking-matt',   assetPath: betterLookingMatt,  isSprite: true },
  { id: 'sprite_pot_plant',      assetPath: spritePotPlant,     isSprite: true },
  { id: 'sprite_picture_frame',  assetPath: spritePictureFrame, isSprite: true },
  { id: 'sprite_barrel',         assetPath: spriteBarrel,       isSprite: true },
  { id: 'sprite_floor_lamp',     assetPath: spriteFloorLamp,    isSprite: true },
  { id: 'sprite_column',         assetPath: spriteColumn,       isSprite: true },
];

export { images };
