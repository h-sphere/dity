type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

type Deps = Record<string, any>

type KeysExtendingType<D extends Deps, T> = {
	[I in keyof D]: Awaited<D[I]> extends T ? I : never
}[keyof D]

type KeysExtendingTypeNoAwait<D extends Deps, T> = {
	[I in keyof D]: D[I] extends T ? I : never
}[keyof D]

type Values<D extends Deps, T extends Array<keyof D>> = {
	[K in keyof T]: D[T[K]]
}

type TypesToKeys<D extends Deps, K extends Array<any>> = {
	[I in keyof K]: KeysExtendingType<D, K[I]>
}

interface IModule<D extends Record<string, any>> {
	get<K extends keyof D>(k: K): D[K]
}

type RetFn<T> = {
	fn: (d: IModule<any>) => any
	args: string[]
}

type FromRet<T> = T extends RetFn<infer K> ? K : never

type FromRetAll<T extends Record<string, any>> = {
	[K in keyof T]: T[K] extends RetFn<infer A> ? A : T[K]
}

type AnyPromise<T extends readonly unknown[]> =
	Promise<any> extends T[number] ? true : false

type WrapInPromiseIfNeeded<T, TT extends Array<any>> =
	T extends Promise<any> ? T : AnyPromise<TT> extends true ? Promise<T> : T

type DepOrRetFn<D extends Deps> = {
	[K in keyof D]: D[K] | RetFn<D[K]>
}

const isRetFn = (x: any): x is RetFn<any> => {
	return (
		typeof x === 'object' &&
		'fn' in x &&
		typeof x['fn'] === 'function' &&
		'args' in x &&
		Array.isArray(x['args'])
	)
}

type Prepend<D extends Deps, Name extends string> = {
	[K in keyof D as `${Name}.${string & K}`]: D[K]
}

class Inj<D extends Deps, Arr extends Array<any>, Ret> {
	constructor(private fn: (...a: Arr) => Ret) {}

	inject<Keys extends TypesToKeys<D, Arr>>(
		...args: Keys
	): RetFn<WrapInPromiseIfNeeded<Ret, Values<D, Keys>>> {
		let v: Ret | null = null

		const savedFn = this.fn

		function fn(this: RetFn<any>, d: Module<D>) {
			if (v) {
				return v
			}

			const res = this.args.map(a => d.get(a))
			const anyPromise = res.find(f => (f as any) instanceof Promise)
			if (anyPromise) {
				return Promise.all(res).then(vals => savedFn(...(vals as any)))
			} else {
				v = savedFn(...(res as Arr))
				return v
			}
		}

		const obj = {
			fn: fn as any, // FIXME: fix this typing error
			args: args as string[]
		}
		obj.fn = fn.bind(obj)

		return obj
	}
}

class DepConfigurator<D extends Deps> {
	fn<F extends (...args: any[]) => any>(fn: F) {
		return new Inj<D, Parameters<F>, ReturnType<F>>(fn)
	}

	cls<C extends new (...args: any[]) => any>(Cls: C) {
		const factory = (...args: any[]) => new Cls(...args)
		return new Inj<
			D,
			ConstructorParameters<typeof Cls>,
			InstanceType<typeof Cls>
		>(factory)
	}

	factory<C extends new (...args: any[]) => { make(): any }>(Cls: C) {
		const factory = (...args: any[]) => {
			const f = new Cls(...args)
			return f.make()
		}
		return new Inj<
			D,
			ConstructorParameters<typeof Cls>,
			ReturnType<InstanceType<typeof Cls>['make']>
		>(factory)
	}

	value<V>(v: V): RetFn<V> {
		return {
			args: [],
			fn: () => v
		} as RetFn<V>
	}
}

class Module<D extends Deps> {
	constructor(private values: DepOrRetFn<D>) {}
	get<K extends keyof D>(k: K): D[K] {
		const v = this.values[k]
		if (isRetFn(v)) {
			return v.fn(this as any) // FIXME: do not use as any
		}
		return this.values[k] as D[K]
	}
}

const INSPECT = Symbol('inspect')

export class Registrator<
	D extends Deps = {},
	Externals extends keyof D = never,
	Exports extends string = never,
	OutsideExternals extends Deps = {}
> {
	private values: DepOrRetFn<D> = {} as any; // FIXME: better typing here?

	[INSPECT]() {
		return Object.entries(this.values).map(([key, v]) => {
			if (isRetFn(v)) {
				return {
					key,
					args: v.args
				}
			} else {
				return {
					key,
					args: []
				}
			}
		})
	}

	import<K extends string, T>(): Registrator<
		D & Record<K, T>,
		Externals | K,
		Exports,
		OutsideExternals
	> {
		return this
	}

	export<K extends (keyof D & string)[]>(
		...k: K
	): Registrator<D, Externals, Exports | K[number], OutsideExternals> {
		return this
	}

	link<
		K extends Externals | keyof OutsideExternals,
		TYPE extends K extends Externals
			? D[K]
			: K extends keyof OutsideExternals
				? OutsideExternals[K]
				: never
	>(
		k: K,
		e: Exclude<KeysExtendingTypeNoAwait<D, TYPE> | KeysExtendingTypeNoAwait<OutsideExternals, TYPE>, K>
	): Registrator<D, Exclude<Externals, K>, Exports, Omit<OutsideExternals, K>> {
		const v = {
			args: [],
			fn: d => d.get(e)
		} satisfies RetFn<any>
		;(this.values as any)[k] = v
		return this
	}

	resolve<
		K extends Externals | keyof OutsideExternals,
		TYPE extends K extends Externals
			? D[K]
			: K extends keyof OutsideExternals
				? OutsideExternals[K]
				: never
	>(
		k: K,
		v: RetFn<TYPE> | ((d: DepConfigurator<D>) => RetFn<TYPE>)
	): Registrator<D, Exclude<Externals, K>, Exports, Omit<OutsideExternals, K>> {
		if (typeof v === 'function') {
			;(this.values as any)[k] = v(new DepConfigurator())
		} else {
			;(this.values as any)[k] = v
		}
		return this
	}

	register<const K extends string, F extends number | string | Promise<any>>(
		key: K,
		f: F
	): Registrator<D & Record<K, F>, Externals, Exports, OutsideExternals>
	register<
		const K extends string,
		F extends (d: DepConfigurator<D>) => RetFn<any>
	>(
		key: K,
		f: F
	): Registrator<
		D & Record<K, FromRet<ReturnType<F>>>,
		Externals,
		Exports,
		OutsideExternals
	>
	register<
		const K extends string,
		Ret,
		F extends
			| ((d: DepConfigurator<D>) => RetFn<Ret>)
			| number
			| string
			| Promise<any>
	>(key: K, f: F) {
		if (
			typeof f === 'number' ||
			typeof f === 'string' ||
			f instanceof Promise
		) {
			this.values[key] = f as any
			return this as Registrator<D & Record<K, F>>
		} else {
			const ret = f(new DepConfigurator())
			this.values[key] = ret
			return this as Registrator<D>
		}
	}

	registerMany<
		const M extends Record<
			string,
			number | string | Promise<any> | ((d: DepConfigurator<D>) => RetFn<any>)
		>
	>(r: M): Registrator<D & FromRetAll<M>, Exports, Exports, OutsideExternals> {
		Object.entries(r).forEach(([key, val]) => {
			this.register(key, val as any)
		})
		return this as any // FIXME: type here.
	}

	module<
		M extends string,
		MD extends Deps,
		Ext extends string,
		MExports extends string,
		MOutsideExternals extends Deps
	>(
		name: M,
		mod: Registrator<MD, Ext, MExports, MOutsideExternals>
	): Registrator<
		D & Prepend<Pick<MD, MExports>, M>,
		Externals,
		Exports,
		OutsideExternals & Prepend<MOutsideExternals, M> & Prepend<Pick<MD, Ext>, M>
	> {
		const entries = Object.entries(mod.values).map(([key, val]) => {
			const k = `${name}.${key}`
			if (isRetFn(val)) {
				return [k, { ...val, args: val.args.map(a => `${name}.${a}`) }]
			} else {
				return [k, val]
			}
		})
		entries.forEach(([key, val]) => {
			;(this.values as Record<string, any>)[key] = val as any
		})
		return this as any // FIXME: proper typing here.
	}

	build(): Module<Prettify<D>> {
		return new Module<D>(this.values)
	}
}

export const inspect = (r: Registrator) => r[INSPECT]()
