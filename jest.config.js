module.exports = {
	testEnvironment: 'jsdom',
	testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
		// pdf.js is browser-only ESM; see __mocks__/pdfjs-dist.ts
		'^pdfjs-dist$': '<rootDir>/__mocks__/pdfjs-dist.ts',
	},
	transform: {
		'^.+\\.(js|jsx|ts|tsx)$': [
			'babel-jest',
			{ presets: [['next/babel', { 'preset-react': { runtime: 'automatic' } }]] },
		],
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	transformIgnorePatterns: ['/node_modules/(?!(your-module-to-transform|other-module)/)'],
};
