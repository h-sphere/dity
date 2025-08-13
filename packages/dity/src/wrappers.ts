import { getDependencies } from './injector'
import { DependencyInfo } from './utils'

export type Configuration<T> = {
	generator: (args: any[]) => T
	deps: DependencyInfo[]
}

export const isConfiguration = <T = unknown>(
	k: unknown
): k is Configuration<T> => {
	return (
		typeof k === 'object' &&
		k !== null &&
		'generator' in k &&
		typeof k.generator === 'function'
	)
}

/**
 * Wrap a class constructor as a dependency configuration
 *
 * @param C - The class constructor
 * @returns Configuration that creates instances of the class
 *
 * @example
 * ```ts
 * @inject(['apiUrl', 'timeout'])
 * class ApiService {
 *   constructor(private url: string, private timeout: number) {}
 * }
 *
 * const module = buildContainer(c => c.register({
 *   apiService: asClass(ApiService)
 * }))
 * ```
 */
export const asClass = <T extends new (...args: any[]) => any>(
	C: T
): Configuration<InstanceType<T>> => ({
	generator: (args: any[]) => {
		// Gathering arguments
		return new C(...args)
	},
	deps: getDependencies(C)
})

interface MakeableConstructor<Args extends Array<any>, R> {
	new (...args: any[]): { make(...args: Args): R }
}

type MakeableConstructorReturn<T> =
	T extends MakeableConstructor<any, infer R> ? R : never

/**
 * Wrap a factory class as a dependency configuration
 *
 * @param C - The factory class with a make() method
 * @returns Configuration that uses the factory to create instances
 *
 * @example
 * ```ts
 * @inject(['config'])
 * class DatabaseFactory {
 *   make(config: Config) {
 *     return new Database(config.connectionString)
 *   }
 * }
 *
 * const module = buildContainer(c => c.register({
 *   database: asFactory(DatabaseFactory)
 * }))
 * ```
 */
export const asFactory = <const T extends MakeableConstructor<Array<any>, any>>(
	C: T
): Configuration<MakeableConstructorReturn<T>> => ({
	deps: getDependencies(C),
	generator: (args: any[]) => {
		return new C().make(...args)
	}
})

/**
 * Wrap a static value as a dependency configuration
 *
 * @param v - The value to be provided as a dependency
 * @returns Configuration that provides the static value
 *
 * @example
 * ```ts
 * const module = buildContainer(c => c.register({
 *   apiUrl: asValue('https://api.example.com'),
 *   timeout: asValue(5000)
 * }))
 * ```
 */
export const asValue = <T>(v: T): Configuration<T> => ({
	deps: [],
	generator: () => v
})

export const asFunction = <T extends (...args: any[]) => any>(
	c: T
): Configuration<ReturnType<T>> => {
	const ret: Configuration<ReturnType<T>> = {
		generator: (args: any[]) => {
			return c(...args)
		},
		deps: getDependencies(c)
	}

	return ret
}
