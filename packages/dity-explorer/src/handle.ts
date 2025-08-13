import { DityGraph } from '@hypersphere/dity-graph'
import { editor } from 'monaco-editor'

type Sigma = DityGraph['sigma']

const graphContainer = document.querySelector<HTMLDivElement>(
	'#graph-container-element'
)!
const mainContainer =
	document.querySelector<HTMLDivElement>('#graph-container')!

let lastRatio = 0.5

export const handleHandle = (
	container: HTMLElement,
	handle: HTMLDivElement,
	graph: () => DityGraph | null,
	editor: editor.IStandaloneCodeEditor
) => {
	const setRatio = (r: number) => {
		lastRatio = r
		container.style.setProperty('--ratio', r.toString())
	}

	let isResizing = false
	handle.addEventListener('mousedown', e => {
		e.preventDefault()
		isResizing = true
		graph()?.sigma?.setSetting('allowInvalidContainer', true)
		editor.updateOptions({
			automaticLayout: false
		})
		editor.layout({ width: 0, height: 0 })
		// graph()?.sigma?.setSetting('', false)
		// document.querySelector<HTMLDivElement>('#graph-container')!.style.display = 'hidden'
		mainContainer.removeChild(graphContainer)
	})

	container.addEventListener('mouseup', e => {
		e.preventDefault()
		if (isResizing) {
			isResizing = false

			if (lastRatio < 0.1) {
				// HIDING CODE
				setRatio(0)
			}

			mainContainer.appendChild(graphContainer)
			const rescale = graph()?.sigma?.getSetting('autoRescale').valueOf()!
			if (!rescale) {
				graph()?.sigma?.setSetting('autoRescale', true)
			}
			editor.layout()
			editor.updateOptions({
				automaticLayout: true
			})
		}
	})

	container.addEventListener('mousemove', e => {
		e.preventDefault()
		if (!isResizing) {
			return
		}
		// Computing proper location
		const box = container.getBoundingClientRect()
		const x = e.layerX
		const ratio = (x - box.left + 5) / box.width

		setRatio(ratio > 0.1 ? ratio : 0)
	})
}
