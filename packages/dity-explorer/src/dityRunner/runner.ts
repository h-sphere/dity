import * as Dity from '@hypersphere/dity'
import { DityGraph } from '@hypersphere/dity-graph'

function resolveImports(code: string) {
	// Replace import statements with variable declarations
	return code.replace(
		/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@hypersphere\/dity['"];?\s*/g,
		(match, imports) => {
			// Clean up imports and create destructuring
			const cleanImports = imports
				.split(',')
				.map((imp: string) => imp.trim())
				.join(', ')
			return `// Import resolved: ${match}\nconst { ${cleanImports} } = dity; // Get from passed objects\n`
		}
	)
}

let graph: DityGraph | null = null

export const dityCodeRunner = (
	container: HTMLDivElement,
	compileTypeScript: (code: string) => Promise<string>
) => {
	const runCode = async (code: string) => {
		const jsCode = await compileTypeScript(resolveImports(code))
		const fn = new Function('dity', jsCode)
		const module = fn(Dity)
		if (graph !== null) {
			graph.destroy()
		}
		graph = new DityGraph(module as any, container)
		graph.render()
	}

	return {
		getGraph: () => graph,
		runCode
	}
}
