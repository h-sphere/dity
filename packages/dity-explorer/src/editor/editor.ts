import { setupExtraLibraries } from './extraLibraries'
import { setupTypescript } from './typescript'
import { setupWorkers } from './workers'
import * as monaco from 'monaco-editor'

export const setupEditor = (codeContainer: HTMLDivElement, code: string) => {
	setupWorkers()
	setupExtraLibraries()
	const compileTypeScript = setupTypescript()

	const editor = monaco.editor.create(codeContainer, {
		value: code,
		language: 'typescript',
		theme: 'vs-dark',
		automaticLayout: false,
		minimap: { enabled: false },
		scrollBeyondLastLine: false,
		fontSize: 14,
		tabSize: 2,
		wordWrap: 'on',
		lineNumbers: 'on',
		suggest: {
			showWords: false,
			showKeywords: false,
			showEnums: false,
			showClasses: false,
			showConstructors: false
		}
	})

	return { editor, compileTypeScript }
}
