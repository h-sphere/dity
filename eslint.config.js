const tseslint = require('@typescript-eslint/eslint-plugin')
const tsparser = require('@typescript-eslint/parser')
const prettierConfig = require('eslint-config-prettier')
const prettierPlugin = require('eslint-plugin-prettier')

module.exports = [
	{
		files: ['**/*.{ts,tsx,js,jsx}'],
		ignores: [
			'node_modules/**',
			'dist/**',
			'build/**',
			'**/*.d.ts',
			'docs/node_modules/**',
			'packages/*/node_modules/**',
			'packages/*/dist/**',
			'packages/*/babel.config.js'
		],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				project: './tsconfig.json'
			}
		},
		plugins: {
			'@typescript-eslint': tseslint,
			prettier: prettierPlugin
		},
		rules: {
			// Prettier integration
			'prettier/prettier': 'error',

			// TypeScript specific rules
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-inferrable-types': 'error',

			// General rules
			'no-console': 'warn',
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',

			// Best practices
			eqeqeq: ['error', 'always'],
			'no-duplicate-imports': 'error',
			'no-unused-expressions': 'error'
		}
	},
	{
		files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
		rules: {
			// Relax some rules for test files
			'@typescript-eslint/no-explicit-any': 'off',
			'no-console': 'off'
		}
	}
]
