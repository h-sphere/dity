import dityTypes from '@hypersphere/dity/dist/index.d.ts?raw'
import * as monaco from 'monaco-editor'

export const setupExtraLibraries = () => {
    const wrappedDeclaration = `
    declare module '@hypersphere/dity' {
    ${dityTypes}
    }`

    monaco.languages.typescript.typescriptDefaults.addExtraLib(wrappedDeclaration,
        'file:///node_modules/@hypersphere/dity/index.d.ts'
    )
}