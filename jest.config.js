module.exports = {
	transform: {
		'^.+\\.tsx?$': 'ts-jest'
	},
	testRegex: '/__tests__/.*-test\\.[jt]sx?$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	// setupTestFrameworkScriptFile: './scripts/jest/setup.ts',
	roots: ['src'],
	testEnvironment: 'node',
	moduleNameMapper: {
	}
};