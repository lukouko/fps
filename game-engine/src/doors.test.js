import * as doors from './doors';
import * as constants from './constants';

describe('doors.toggleDoor', () => {
  it('opens a closed door (openness 0 → 1, removes wallTextureId)', () => {
    const cell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: 0,
      wallTextureId: 'concrete_wall',
    };

    doors.toggleDoor({ cell });

    expect(cell.openness).toBe(1);
    expect(cell.wallTextureId).toBeUndefined();
  });

  it('closes an open door (openness 1 → 0, restores wallTextureId)', () => {
    const cell = {
      door: true,
      doorTextureId: 'concrete_wall',
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
      openness: 1,
    };

    doors.toggleDoor({ cell });

    expect(cell.openness).toBe(0);
    expect(cell.wallTextureId).toBe('concrete_wall');
  });

  it('does nothing if cell is not a door', () => {
    const cell = {
      floorTextureId: 'tiles_1',
      ceilingTextureId: 'plaster_1',
    };

    doors.toggleDoor({ cell });

    expect(cell.openness).toBeUndefined();
    expect(cell.wallTextureId).toBeUndefined();
  });
});

describe('doors.findActivatable', () => {
  it('returns the door cell if it is within activation distance', () => {
    const doorCell = { door: true, doorTextureId: 'concrete_wall' };
    const centreRay = {
      mapCell: doorCell,
      distance: constants.ACTIVATION_DISTANCE * 0.5,
    };

    const result = doors.findActivatable({
      centreRay,
      maxDistance: constants.ACTIVATION_DISTANCE,
    });

    expect(result).toBe(doorCell);
  });

  it('returns null if the target cell is not a door', () => {
    const nonDoorCell = { floorTextureId: 'tiles_1' };
    const centreRay = {
      mapCell: nonDoorCell,
      distance: constants.ACTIVATION_DISTANCE * 0.5,
    };

    const result = doors.findActivatable({
      centreRay,
      maxDistance: constants.ACTIVATION_DISTANCE,
    });

    expect(result).toBeNull();
  });

  it('returns null if the distance exceeds maxDistance', () => {
    const doorCell = { door: true, doorTextureId: 'concrete_wall' };
    const centreRay = {
      mapCell: doorCell,
      distance: constants.ACTIVATION_DISTANCE * 2,
    };

    const result = doors.findActivatable({
      centreRay,
      maxDistance: constants.ACTIVATION_DISTANCE,
    });

    expect(result).toBeNull();
  });

  it('returns null if centreRay is null', () => {
    const result = doors.findActivatable({
      centreRay: null,
      maxDistance: constants.ACTIVATION_DISTANCE,
    });

    expect(result).toBeNull();
  });

  it('returns the door at exactly max distance', () => {
    const doorCell = { door: true, doorTextureId: 'concrete_wall' };
    const centreRay = {
      mapCell: doorCell,
      distance: constants.ACTIVATION_DISTANCE,
    };

    const result = doors.findActivatable({
      centreRay,
      maxDistance: constants.ACTIVATION_DISTANCE,
    });

    expect(result).toBe(doorCell);
  });
});

describe('doors.activatableTypes', () => {
  it('has a door type definition', () => {
    expect(doors.activatableTypes.door).toBeDefined();
  });

  it('door type has correct properties', () => {
    const doorType = doors.activatableTypes.door;
    expect(doorType.noun).toBe('Door');
    expect(doorType.verbOn).toBe('Open');
    expect(doorType.verbOff).toBe('Close');
  });
});
