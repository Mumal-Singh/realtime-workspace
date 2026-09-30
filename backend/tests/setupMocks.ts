// Redis, BullMQ and Socket.IO are mocked so tests need only Postgres.
jest.mock('ioredis', () => {
  const makeClient = () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          typeof prop === 'symbol' || prop === 'then'
            ? undefined
            : jest.fn().mockResolvedValue(null),
      },
    );
  const Mock = jest.fn().mockImplementation(makeClient);
  return { __esModule: true, default: Mock, Redis: Mock };
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: '1' }),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn(), close: jest.fn() })),
}));

jest.mock('../src/sockets', () => ({ emitToWorkspace: jest.fn() }));
