import { Registrator } from './new-version'

describe('Dity', () => {
	it('should properly inject basic deps', () => {
		const a = new Registrator()
			.register('a', 5)
			.register('b', 'hello')
			.register('c', d =>
				d.fn((a: number, b: string) => a + ' ' + b).inject('a', 'b')
			)

		const r = a.build()
		expect(r.get('a')).toEqual(5)
		expect(r.get('b')).toEqual('hello')
		expect(r.get('c')).toEqual('5 hello')
	})

	it('should properly set async deps', async () => {
		const fn = (a: number, b: string) => a + ' ' + b
		const a = new Registrator()
			.register('a', 5)
			.register('b', 'hello')
			.register('asyncA', Promise.resolve(10))
			.register('asyncB', Promise.resolve('world'))
			.register('fnA', d => d.fn(fn).inject('a', 'b'))
			.register('fnB', d => d.fn(fn).inject('a', 'asyncB'))
		const r = a.build()
		expect(r.get('a')).toEqual(5)
		expect(r.get('b')).toEqual('hello')
		expect(r.get('fnA')).toEqual('5 hello')
		const fnB = r.get('fnB')
		expect(fnB).toBeInstanceOf(Promise)
		expect(await fnB).toEqual('5 world')
	})

	it('should properly setup submodules', () => {
		const sub = new Registrator()
			.register('a', 5000)
			.register('b', 10)
			.register('c', 'hello world')
			.import<'imp', string>()
			.export('c', 'a', 'imp')

		const mod = new Registrator()
			.register('d', 5)
			.import<'iii', number>()
			.module('mod', sub)
			.register('fn', d =>
				d.fn((a: number, b: string) => a + b).inject('iii', 'mod.c')
			)
			.link('iii', 'mod.a')
			.link('mod.imp', 'fn')
			.build()

		expect(mod.get('iii')).toEqual(5000)
		expect(mod.get('mod.imp')).toEqual('5000hello world')
	})

	it('should allow to register complex objects', () => {
		const configObject = {
			a: 5,
			b: 134
		}

		const mod = new Registrator()
			.register('config', d => d.value(configObject))
			.build()

		expect(mod.get('config')).toEqual(configObject)
	})

	it('should allow values to imports', () => {
		const a = new Registrator()
			.import<'a', string>()
			.resolve('a', d => d.value('hello'))
			.build()

		expect(a.get('a')).toEqual('hello')
	})

	it('should register multiple values at the same time', () => {
		const a = new Registrator()
			.registerMany({
				a: 5,
				b: 'hello',
				c: d => d.value('hello world')
			})
			.register('fn', d =>
				d.fn((a: number, b: number) => a + b).inject('a', 'a')
			)
			.build()

		expect(a.get('a')).toEqual(5)
		expect(a.get('b')).toEqual('hello')
		expect(a.get('c')).toEqual('hello world')
		expect(a.get('fn')).toEqual(10)
	})

	it('should properly test class registration', () => {
		class Test {
			constructor(
				private a: number,
				b: number
			) {}
		}

		const mod = new Registrator()
			.register('a', 5)
			.register('test', d => d.cls(Test).inject('a', 'a'))

		expect(mod.build().get('test')).toBeInstanceOf(Test)
	})

	it('should properly test factory registration', () => {
		class TestFactory {
			constructor(
				private a: number,
				private b: number
			) {}

			make() {
				return this.a + this.b
			}
		}

		const mod = new Registrator()
			.register('a', 5)
			.register('b', 10)
			.register('fac', d => d.factory(TestFactory).inject('a', 'b'))
			.build()

		expect(mod.get('fac')).toEqual(15)
	})

	it('shold not call function twice', () => {
		const fn = jest.fn((a: number, b: number) => a + b)

		const mod = new Registrator()
			.register('a', 5)
			.register('b', 10)
			.register('fn', d => d.fn(fn).inject('a', 'b'))
			.build()

		expect(mod.get('fn')).toEqual(15)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(mod.get('fn')).toEqual(15)
		expect(fn).toHaveBeenCalledTimes(1) // No second call
	})
})
