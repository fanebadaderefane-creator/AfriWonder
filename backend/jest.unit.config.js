/** Tests unitaires sans Prisma / setup global (évite import.meta dans database.ts). */
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
        isolatedModules: true,
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
      },
    }],
  },
  testMatch: ['**/__tests__/unit/**/*.test.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};
