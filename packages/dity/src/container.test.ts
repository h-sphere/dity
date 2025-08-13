import { PluginContainer } from 'vite'
import { buildContainer } from './builder'
import { Container } from './container'
import { makeInjector } from './injector'
import { asClass, asFactory } from './wrappers'

// class F {
//     make(a: number, b: string) { }
// }

// class Const {
//     constructor(a: number, b: string) { }
// }

// type AsClass = new (...args: [number, string]) => { make: undefined }
// type AsFactory = (new (...args: []) => { make(...args: [number, string]): any })

// function f<const T extends AsClass | AsFactory>(t: T ) { }

// f(F)

// f(Const)

describe('Container', () => {
	it('should properly resolve container constants', async () => {
		const container = new Container(
			{
				a: 5,
				b: 10
			},
			{}
		)

		expect(await container.get('a')).toEqual(5)
		expect(await container.get('b')).toEqual(10)
	})

	it('should properly resolve class injections', async () => {
		const mod = buildContainer(c =>
			c.register({
				a: 5,
				b: 10,
				c: asClass(SumClass)
			})
		)

		const injector = makeInjector<typeof mod>()

		@injector(['a', 'b'])
		class SumClass {
			constructor(
				public a: number,
				public b: number
			) {}
			compute() {
				return this.a + this.b
			}
		}

		const container = mod.build()
		const c = await container.get('c')
		expect(c).toBeInstanceOf(SumClass)
		expect(c.a).toEqual(5)
		expect(c.b).toEqual(10)
		expect(c.compute()).toEqual(15)
	})

	it('should properly resolve submodules', async () => {
		const helperMod = buildContainer(c =>
			c
				.register({
					date: () => 66436,
					env: 'production'
				})
				.exports('date', 'env')
		)

		const mainMod = buildContainer(c =>
			c
				.submodules({ helper: helperMod })
				.register({ a: 5, b: 7, init: asClass(Init) })
		)

		const inject = makeInjector<typeof mainMod>()

		@inject(['helper.date', 'helper.env'])
		class Init {
			constructor(
				private date: () => number,
				private env: string
			) {}

			init() {
				return this.env + ' ' + this.date()
			}
		}

		const container = mainMod.build()

		const date = await container.get('helper.date')
		const env = await container.get('helper.env')
		expect(date()).toEqual(66436)
		expect(env).toEqual('production')
		const init = await container.get('init')
		expect(init.init()).toEqual('production 66436')
	})

	it('should resolve parent types', async () => {
		const helperModule = buildContainer(c =>
			c
				.register({
					helperA: 5,
					helperB: 10,
					helperC: asClass(HelperC)
				})
				.externals<{ tA: number; tB: number }>()
				.exports('helperC')
		)

		const helperInjector = makeInjector<typeof helperModule>()

		const timerModule = buildContainer(c =>
			c
				.register({
					timerA: 100,
					timerB: 2000
				})
				.exports('timerA', 'timerB')
		)

		const mainModule = buildContainer(c =>
			c.submodules({
				helper: helperModule,
				timer: timerModule
			})
		)

		const mainInjector = makeInjector<typeof mainModule>()

		@helperInjector(['tA', 'tB'])
		class HelperC {
			constructor(
				public timerA: number,
				public timerB: number
			) {}

			run() {
				return this.timerA + this.timerB
			}
		}

		const container = mainModule
			.resolve({
				'helper.tA': 'timer.timerA',
				'helper.tB': 'timer.timerB'
			})
			.build()
		const helperC = await container.get('helper.helperC')
		expect(helperC.timerA).toEqual(100)
		expect(helperC.timerB).toEqual(2000)
		expect(helperC.run()).toEqual(2100)
	})

	it('should resolve multiple nested modules', async () => {
		const e = buildContainer(c =>
			c.register({ abc: 'abc result' }).exports('abc')
		)
		const f = buildContainer(c => c.register({ def: 443234 }).submodules({ e }))

		const a = buildContainer(c =>
			c
				.register({ k1: 5, k2: 10, k3: 11, extras: asClass(AExtras) })
				.exports('k3', 'extras')
				.externals<{ ext: string }>()
		)
		const b = buildContainer(c =>
			c.register({ k1: 10, k2: 15, k3: 100 }).submodules({ a })
		)
		const c = buildContainer(c => c.submodules({ b, f }))
		const d = buildContainer(con =>
			con.register({ abc: 'hello' }).submodules({ c })
		)

		const aInject = makeInjector<typeof a>()

		@aInject(['k1', 'ext'])
		class AExtras {
			constructor(
				public k: number,
				public b: string
			) {}
		}

		const container = d
			.resolve({
				'c.b.a.ext': 'c.f.e.abc'
			})
			.build()
		const k3 = await container.get('c.b.a.k3')
		expect(k3).toEqual(11)

		const abc = await container.get('c.f.e.abc')
		expect(abc).toEqual('abc result')

		const withFarExtern = await container.get('c.b.a.extras')
		expect(withFarExtern.b).toEqual('abc result')
		expect(withFarExtern.k).toEqual(5)
	})

	it('should properly resolve type of async factory', async () => {
		class AFactory {
			async make() {
				return Promise.resolve(5)
			}
		}

		const module = buildContainer(c =>
			c.register({
				f: asFactory(AFactory),
				f2: asFactory(BFactory)
			})
		)

		@(makeInjector<typeof module, 'factory'>()(['f']))
		class BFactory {
			async make(v: number) {
				return (await Promise.resolve(v * v)).toString()
			}
		}

		const container = module.build()
		const f1 = await container.get('f')
		expect(f1).toEqual(5)

		const f2 = await container.get('f2')
		expect(f2).toEqual('25')
	})
})
