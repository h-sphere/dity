import { defineConfig } from 'vite'
import dts from 'unplugin-dts/vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.ts',
			name: '@hypersphere/dity',
			fileName: format => `dity.${format}.js`
		}
		// rollupOptions: {
		//   external: ['signia'],
		//   output: {
		//     globals: {
		//       signia: 'Signia'
		//     }
		//   }
		// }
	},
	plugins: [
		dts({
			bundleTypes: true,
			insertTypesEntry: true
		})
	]
})
