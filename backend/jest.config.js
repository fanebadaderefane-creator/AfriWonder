export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        rootDir: '.',
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
      },
      // isolatedModules maintenant dans tsconfig.json
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // Couverture backend réelle sur le code applicatif
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
  // Désactivé en CI pour éviter exit code 1 quand des handles (ex. pool PG)
  // restent ouverts après afterAll. En local, mettre à true pour déboguer.
  detectOpenHandles: process.env.CI !== 'true',
};

