import * as map from './index';
import * as constants from '../constants';

describe('map.canMoveToCellLocation (doors)', () => {
  let mapState;

  beforeEach(() => {
    mapState = map.initialise();
  });

  it('blocks movement through a closed door', () => {
    const doorCell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: 0,
      wallTextureId: 'concrete_wall',
    };

    // Manually set a door cell for testing
    mapState.currentMap.layout[1][1] = doorCell;

    const canMove = map.canMoveToCellLocation({
      mapState,
      position: { x: 1, y: 1 },
    });

    expect(canMove).toBe(false);
  });

  it('allows movement through an open door', () => {
    const doorCell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: 1,
    };

    // Manually set a door cell for testing
    mapState.currentMap.layout[1][1] = doorCell;

    const canMove = map.canMoveToCellLocation({
      mapState,
      position: { x: 1, y: 1 },
    });

    expect(canMove).toBe(true);
  });

  it('allows movement through a door at exactly DOOR_OPEN_THRESHOLD', () => {
    const doorCell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: constants.DOOR_OPEN_THRESHOLD,
    };

    mapState.currentMap.layout[1][1] = doorCell;

    const canMove = map.canMoveToCellLocation({
      mapState,
      position: { x: 1, y: 1 },
    });

    expect(canMove).toBe(true);
  });

  it('blocks movement through a door below DOOR_OPEN_THRESHOLD', () => {
    const doorCell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: constants.DOOR_OPEN_THRESHOLD - 0.1,
    };

    mapState.currentMap.layout[1][1] = doorCell;

    const canMove = map.canMoveToCellLocation({
      mapState,
      position: { x: 1, y: 1 },
    });

    expect(canMove).toBe(false);
  });

  it('blocks movement into out-of-bounds cells', () => {
    const canMove = map.canMoveToCellLocation({
      mapState,
      position: { x: -1, y: 0 },
    });

    expect(canMove).toBe(false);
  });
});

describe('map.initialise (door normalization)', () => {
  it('normalizes door cells with openness and wallTextureId', () => {
    const mapState = map.initialise();

    // Find a door cell in the map
    let doorCell = null;
    for (let y = 0; y < mapState.currentMap.layout.length; y++) {
      for (let x = 0; x < mapState.currentMap.layout[y].length; x++) {
        const cell = mapState.currentMap.layout[y][x];
        if (cell.door) {
          doorCell = cell;
          break;
        }
      }
      if (doorCell) break;
    }

    if (doorCell) {
      expect(doorCell.openness).toBe(0);
      expect(doorCell.wallTextureId).toBe(doorCell.doorTextureId);
    }
  });
});
