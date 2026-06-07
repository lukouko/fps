// Stub browser globals.
global.navigator = { userAgent: '' };
global.document = { documentElement: {} };
global.window = { location: { hostname: 'localhost' } };

// Minimal WebSocket stub — captured per-instance so tests can inspect/control it.
let lastWsInstance = null;
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.OPEN;
    this.send = jest.fn();
    this.onopen = null;
    this.onmessage = null;
    lastWsInstance = this;
  }
}
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSED = 3;
global.WebSocket = MockWebSocket;

import { initialise, render } from './network-client';
import { clientMessageTypes, NETWORK_DATA_INTERVAL_TICKS, MAX_RADIO_SILENCE_TICKS } from './constants';

const makePlayerState = ({ isMoving = false, position = { x: 100, y: 200 } } = {}) => ({
  player: {
    isMoving,
    orientation: { position },
  },
});

describe('initialise', () => {
  test('returns state with ticksSinceLastPing = 0', () => {
    const state = initialise({ onServerStateUpdate: jest.fn() });
    expect(state.ticksSinceLastPing).toBe(0);
  });

  test('returns state with clientId = unknown', () => {
    const state = initialise({ onServerStateUpdate: jest.fn() });
    expect(state.clientId).toBe('unknown');
  });

  test('creates a WebSocket connection', () => {
    initialise({ onServerStateUpdate: jest.fn() });
    expect(lastWsInstance).not.toBeNull();
    expect(lastWsInstance.url).toContain('ws://');
  });

  test('registers onmessage handler', () => {
    initialise({ onServerStateUpdate: jest.fn() });
    expect(typeof lastWsInstance.onmessage).toBe('function');
  });

  describe('onmessage – CONNECTION_ESTABLISHED', () => {
    test('sets clientId from payload and calls onServerStateUpdate', () => {
      const onServerStateUpdate = jest.fn();
      initialise({ onServerStateUpdate });

      lastWsInstance.onmessage({
        data: JSON.stringify({
          messageType: 'CONNECTION_ESTABLISHED',
          payload: {
            clientId: 'client-42',
            serverGameState: { players: {} },
          },
        }),
      });

      expect(onServerStateUpdate).toHaveBeenCalledWith({
        processedServerGameState: { sprites: [] },
      });
    });
  });

  describe('onmessage – SERVER_GAME_STATE_UPDATE', () => {
    test('calls onServerStateUpdate with sprite list excluding self', () => {
      const onServerStateUpdate = jest.fn();
      initialise({ onServerStateUpdate });

      // First set clientId so convertServerGameStateForClient can filter self.
      lastWsInstance.onmessage({
        data: JSON.stringify({
          messageType: 'CONNECTION_ESTABLISHED',
          payload: {
            clientId: 'me',
            serverGameState: { players: {} },
          },
        }),
      });
      onServerStateUpdate.mockClear();

      lastWsInstance.onmessage({
        data: JSON.stringify({
          messageType: 'SERVER_GAME_STATE_UPDATE',
          payload: {
            serverGameState: {
              players: {
                me: { playerPosition: { x: 0, y: 0 } },
                other: { playerPosition: { x: 5, y: 5 } },
              },
            },
          },
        }),
      });

      const { processedServerGameState } = onServerStateUpdate.mock.calls[0][0];
      // 'me' is filtered out; 'other' becomes a sprite.
      expect(processedServerGameState.sprites).toHaveLength(1);
      expect(processedServerGameState.sprites[0].position).toEqual({ x: 5, y: 5 });
    });

    test('skips players without a playerPosition', () => {
      const onServerStateUpdate = jest.fn();
      initialise({ onServerStateUpdate });

      lastWsInstance.onmessage({
        data: JSON.stringify({
          messageType: 'SERVER_GAME_STATE_UPDATE',
          payload: {
            serverGameState: {
              players: {
                nobody: {},
              },
            },
          },
        }),
      });

      const { processedServerGameState } = onServerStateUpdate.mock.calls[0][0];
      expect(processedServerGameState.sprites).toHaveLength(0);
    });

    test('does not throw on malformed JSON', () => {
      const onServerStateUpdate = jest.fn();
      initialise({ onServerStateUpdate });
      expect(() => lastWsInstance.onmessage({ data: 'not-json' })).not.toThrow();
    });

    test('does not throw on missing messageType', () => {
      const onServerStateUpdate = jest.fn();
      initialise({ onServerStateUpdate });
      expect(() =>
        lastWsInstance.onmessage({ data: JSON.stringify({ payload: {} }) })
      ).not.toThrow();
    });
  });
});

describe('render', () => {
  let state;

  beforeEach(() => {
    state = initialise({ onServerStateUpdate: jest.fn() });
    lastWsInstance.send.mockClear();
  });

  test('does nothing when socket is closed', () => {
    lastWsInstance.readyState = MockWebSocket.CLOSED;
    const before = state.ticksSinceLastPing;
    render({ playerState: makePlayerState({ isMoving: true }), networkClientState: state });
    // ticksSinceLastPing should not change, no send.
    expect(state.ticksSinceLastPing).toBe(before);
    expect(lastWsInstance.send).not.toHaveBeenCalled();
  });

  test('increments ticksSinceLastPing each call', () => {
    render({ playerState: makePlayerState(), networkClientState: state });
    expect(state.ticksSinceLastPing).toBe(1);
    render({ playerState: makePlayerState(), networkClientState: state });
    expect(state.ticksSinceLastPing).toBe(2);
  });

  test('does not send while player is not moving and below MAX_RADIO_SILENCE_TICKS', () => {
    render({ playerState: makePlayerState({ isMoving: false }), networkClientState: state });
    expect(lastWsInstance.send).not.toHaveBeenCalled();
  });

  test('sends after NETWORK_DATA_INTERVAL_TICKS when player is moving', () => {
    for (let i = 0; i < NETWORK_DATA_INTERVAL_TICKS; i++) {
      render({ playerState: makePlayerState({ isMoving: true }), networkClientState: state });
    }
    expect(lastWsInstance.send).toHaveBeenCalledTimes(1);
  });

  test('resets ticksSinceLastPing to 0 after send', () => {
    for (let i = 0; i < NETWORK_DATA_INTERVAL_TICKS; i++) {
      render({ playerState: makePlayerState({ isMoving: true }), networkClientState: state });
    }
    expect(state.ticksSinceLastPing).toBe(0);
  });

  test('sends after MAX_RADIO_SILENCE_TICKS even when player is not moving', () => {
    // Drive ticks to just below the threshold without triggering interval send.
    // NETWORK_DATA_INTERVAL_TICKS < MAX_RADIO_SILENCE_TICKS, so we need to avoid crossing the interval threshold.
    // Reset ticksSinceLastPing manually so sends don't fire at interval.
    state.ticksSinceLastPing = MAX_RADIO_SILENCE_TICKS - 1;
    render({ playerState: makePlayerState({ isMoving: false }), networkClientState: state });
    expect(lastWsInstance.send).toHaveBeenCalledTimes(1);
  });

  test('send payload contains player position', () => {
    const position = { x: 42, y: 99 };
    for (let i = 0; i < NETWORK_DATA_INTERVAL_TICKS; i++) {
      render({ playerState: makePlayerState({ isMoving: true, position }), networkClientState: state });
    }
    const sent = JSON.parse(lastWsInstance.send.mock.calls[0][0]);
    expect(sent.messageType).toBe(clientMessageTypes.GAME_STATE_UPDATE);
    expect(sent.payload.playerPosition).toEqual(position);
  });
});
