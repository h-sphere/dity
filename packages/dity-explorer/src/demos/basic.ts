import { buildContainer } from '@hypersphere/dity'

const helpers = buildContainer(c =>
	c.register({
		h1: 3424,
		h2: 43243432,
		h3: 4324324324
	})
)
// @ts-expect-error
return buildContainer(c =>
	c
		.register({
			a: 55,
			b: 'hello'
		})
		.submodules({ helpers })
		.externals<{ c: number }>()
		.resolve({
			c: 'helpers.h2'
		})
)
