import * as monaco from 'monaco-editor'

export const setupTypescript = () => {
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
    
    
    let proxy: monaco.languages.typescript.TypeScriptWorker | null = null
    
    return async function compileTypeScript(tsCode: string) {
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
}