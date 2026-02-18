export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    moduleFileExtensions: [
        "js",
        "json",
        "ts"
    ],
    rootDir: "src",
    testRegex: ".*\\.spec\\.ts$",
    transform: {
        "^.+\\.(t|j)s$": "ts-jest"
    },
    collectCoverageFrom: [
        "**/*.(t|j)s"
    ],
    coverageDirectory: "../coverage",
    moduleNameMapper: {
        "^@/auth/(.*)$": "<rootDir>/modules/auth/$1",
        "^@/user/(.*)$": "<rootDir>/modules/user/$1",
        "^@/company/(.*)$": "<rootDir>/modules/company/$1",
        "^@/shared/(.*)$": "<rootDir>/modules/shared/$1",
        "^@/event/(.*)$": "<rootDir>/modules/event/$1",
        "^@/hive/(.*)$": "<rootDir>/modules/hive/$1",
        "^@/mesh/(.*)$": "<rootDir>/modules/mesh/$1",
        "^@/orbit/(.*)$": "<rootDir>/modules/orbit/$1",
        "^src/(.*)$": "<rootDir>/$1"
    }
};
