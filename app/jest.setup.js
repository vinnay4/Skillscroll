/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-video's native module isn't available under jest; provide a minimal
// player mock compatible with expo's useEvent (addListener contract).
jest.mock('expo-video', () => {
  const React = require('react');
  return {
    useVideoPlayer: jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      replace: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      muted: true,
      loop: false,
      currentTime: 0,
      duration: 0,
      timeUpdateEventInterval: 0,
    })),
    VideoView: function VideoView() {
      return React.createElement(React.Fragment);
    },
  };
});
