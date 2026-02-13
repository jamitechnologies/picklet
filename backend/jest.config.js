module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(octokit|@octokit|@octokit/plugin-retry|@octokit/plugin-throttling)/)'
    ],
};
