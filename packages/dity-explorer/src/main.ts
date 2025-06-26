import './style.css'
import * as Dity from "dity";
import { DityGraph } from 'dity-graph'

import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

import dityTypes from 'dity/dist/index.d.ts?raw'
import { handleHandle } from './handle';
import { sidebar } from './sidebar';


self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

const codeContainer = document.querySelector<HTMLDivElement>('#code-container')!
const container = document.querySelector<HTMLDivElement>('#graph-container-element')!

const code = `
import { buildContainer } from "dity";

const helpers = buildContainer(c => c
    .register({
        h1: 3424,
        h2: 43243432,
        h3: 4324324324
    })
)

return buildContainer(c => c
    .register({
        a: 55,
        b: 'hello'
    }).submodules({ helpers }).externals<{ c: number}>().resolve('c', 'helpers.h2')

)`


function resolveImports(code: string) {
    // Replace import statements with variable declarations
    return code.replace(
        /import\s*{\s*([^}]+)\s*}\s*from\s*['"]dity['"];?\s*/g,
        (match, imports) => {
            // Clean up imports and create destructuring
            const cleanImports = imports.split(',').map((imp: string) => imp.trim()).join(', ')
            return `// Import resolved: ${match}\nconst { ${cleanImports} } = dity; // Get from passed objects\n`
        }
    )
}

let graph: DityGraph | null = null

const getGraph = () => {
  return graph
}

const runCode = async function(code: string) {
    const jsCode = await compileTypeScript(resolveImports(code))
    const fn = new Function('dity', jsCode)
    const module = fn(Dity)
    if (graph !== null) {
        graph.destroy()
    }
    graph = new DityGraph(module as any, container)
    graph.render()

}

// const graph = new DityGraph(main as any, container)
// graph.render()






// monaco.languages.typescript.typescriptDefaults.addExtraLib(`
// declare global {
//     const r: LimnRenderer;
// }

// export {};
// `, 'file:///globals.d.ts')



// monaco.languages.registerCompletionItemProvider('typescript', {
//   provideCompletionItems: () => {
//     return {
//       suggestions: [
//         {
//           label: 'Limn Circle',
//           kind: monaco.languages.CompletionItemKind.Snippet,
//           documentation: 'Add basic circle in the middle',
//           insertText: `r.add(\${1:r.center}, {
//     radius: \${2:20},
//     color: '\${3:red}',
// })`,
// insertTextRules:
// 				monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
//         }
//       ]
//     };
//   }
// } as any);


// Configure TypeScript compiler options
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  experimentalDecorators: true
  // allowJs: true,
  // esModuleInterop: true,
  // strict: false
});

monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    diagnosticCodesToIgnore: [1108]
})

const wrappedDeclaration = `
declare module 'dity' {
  ${dityTypes}
}`

monaco.languages.typescript.typescriptDefaults.addExtraLib(wrappedDeclaration,
    'file:///node_modules/dity/index.d.ts'
)

let proxy: monaco.languages.typescript.TypeScriptWorker | null = null

// async function compileTypeScript(tsCode: string) {
//     const model = editor.getModel()
//     console.log('GOT MODEL', model)
//     if (!proxy) {
//         const tsWorker = await monaco.languages.typescript.getTypeScriptWorker()
//         proxy = await tsWorker(editor.getModel()!.uri)
//     }
//     const { outputFiles } = await proxy.getEmitOutput(editor.getModel()!.uri.toString())
//     console.log('OUTPUT FILES', outputFiles)
//     return outputFiles[0]
// }

async function compileTypeScript(tsCode: string) {
  // Create a model
  const uri = monaco.Uri.parse('file:///main.ts');
  const model = monaco.editor.createModel(tsCode, 'typescript', uri);
  
  // Get the TypeScript worker
  const worker = await monaco.languages.typescript.getTypeScriptWorker();
  const client = await worker(uri);
  
  // Compile the code
  const result = await client.getEmitOutput(uri.toString());
  
  // Clean up
  model.dispose();
  
  if (result.emitSkipped) {
    throw new Error('TypeScript compilation failed');
  }
  
  // Return the compiled JavaScript
  return result.outputFiles[0].text;
}


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


editor.addAction({
    id: 'dity.run-code',
    label: 'Dity: Run Code',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 0.90,
    keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
    ],
    run:function() {
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