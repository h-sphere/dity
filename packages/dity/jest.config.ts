import type { Config } from 'jest'

const config: Config = {
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/*.test.{ts,tsx}',
		'!src/**/*.spec.{ts,tsx}'
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80
		}
	},
	transform: {
		'^.+.tsx?$': ['ts-jest', {}],
		'^.+.ts?$': ['ts-jest', {}]
	}
}

export default config
