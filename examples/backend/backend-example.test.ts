import { mainModule } from './main'

describe('Example structure', () => {
	it('should properly instantiate whole example app', async () => {
		const container = mainModule.build()
		const init = await container.get('init')
		expect(init()).toEqual('Starting app at full 123')
	})
})
