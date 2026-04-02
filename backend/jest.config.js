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
  // Audit production: exclusions config, jobs, entry points, DTO, modules
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/app.ts',
    '!src/swagger.ts',
    '!src/config/**',
    '!src/types/**',
    '!src/jobs/**',
    '!src/database.ts',
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  // Seuils alignés sur couverture actuelle (~31 %). Cible audit long terme ~80 % — remonter progressivement.
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 30,
      lines: 30,
    },
  },
  // Désactivé en CI pour éviter exit code 1 quand des handles (ex. pool PG)
  // restent ouverts après afterAll. En local, mettre à true pour déboguer.
  detectOpenHandles: process.env.CI !== 'true',
  // Force exit après 1s en CI si Jest ne quitte pas (pool PG, etc.)
  forceExit: process.env.CI === 'true',
};

