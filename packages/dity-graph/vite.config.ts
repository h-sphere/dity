import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'dity-graph',
      fileName: (format) => `dity.${format}.js`
    },
    rollupOptions: {
      external: ['@hypersphere/dity', 'lodash', 'chroma-js', 'graphology', 'graphology-layout-forceatlas2', 'sigma', '@sigma/node-border'],
      output: {
        globals: {
          '@hypersphere/dity': 'dity',
          lodash: 'lodash',
          'chroma-js': 'chroma',
          'graphology': 'Graph',
          'sigma': 'Sigma',
          '@sigma/node-border': 'nodeBorder',
          'graphology-layout-forceatlas2': 'forceAtlas2'
        }
      }
    }
  },
  plugins: [
    dts({
      insertTypesEntry: true
    })
  ]
})