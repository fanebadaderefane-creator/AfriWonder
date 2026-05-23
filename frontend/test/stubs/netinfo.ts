export default {
  addEventListener: (_cb: (state: { type: string }) => void) => () => {},
  fetch: () => Promise.resolve({ type: 'wifi', isConnected: true }),
};
