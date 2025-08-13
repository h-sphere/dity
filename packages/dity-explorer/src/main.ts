import './style.css'
import * as Dity from '@hypersphere/dity'
import { DityGraph } from '@hypersphere/dity-graph'

import { handleHandle } from './handle'
import { sidebar } from './sidebar'
import { setupEditor } from './editor/editor'
import { basicDemo } from './codeDemos'
import { dityCodeRunner } from './dityRunner/runner'
import { KeyMod, KeyCode } from 'monaco-editor'

const codeContainer = document.querySelector<HTMLDivElement>('#code-container')!
const container = document.querySelector<HTMLDivElement>(
	'#graph-container-element'
)!

const { editor, compileTypeScript } = setupEditor(codeContainer, basicDemo)
const { getGraph, runCode } = dityCodeRunner(container, compileTypeScript)

editor.addAction({
	id: 'dity.run-code',
	label: 'Dity: Run Code',
	contextMenuGroupId: 'navigation',
	contextMenuOrder: 0.9,
	keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
	run: function () {
		// run code
		runCode(editor.getValue())
	}
})

runCode(editor.getValue())

// HANDLER
handleHandle(
	document.querySelector<HTMLDivElement>('.app-content')!,
	document.querySelector<HTMLDivElement>('.handle')!,
	getGraph,
	editor
)

sidebar(document.querySelector<HTMLDivElement>('.sidebar')!, getGraph)
