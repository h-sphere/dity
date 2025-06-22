// import 'reflect-metadata'


// // Metadata keys
// const DEPENDENCIES_KEY = Symbol('dependencies')
// const PARAM_TYPES_KEY = 'design:paramtypes'

// export interface DependencyInfo<K extends string = string, TYPE = null> {
//     parameterIndex: number,
//     dependencyKey: K,
//     moduleName: string
//     _t: TYPE
// }


// // DI Container
// type MakeContainer<K> = () => Container<K>

// export type GetContainerTypes<T> = T extends MakeContainer<infer K> ? K : T extends Container<infer K> ? K : never

// type Configuration<T> = {
//     generator: (args: any[]) => T,
//     deps: DependencyInfo[]
// }

// const isConfiguration = (k: any): k is Configuration<any> => {
//     return !!k['generator']
// }

// const getDependencies = (target: any) => {
//     console.log('GETTING DEPENDENCIES FROM TARGET', target)
//     const sortFn = (a: DependencyInfo, b: DependencyInfo) => a.parameterIndex - b.parameterIndex
//     if (target._di) {
//         return target._di.sort(sortFn)
//     }
//     const deps = (Reflect.getMetadata(DEPENDENCIES_KEY, target) || []) as DependencyInfo[]
//     return deps.sort(sortFn)
// }

// export const asClass = <T extends (new (...args: any[]) => any)>(C: T): Configuration<InstanceType<T>> => ({
//     generator: (args: any[]) => {
//         // Gathering arguments
//         return new C(...args)
//     },
//     deps: getDependencies(C)
// })

// type Factory<T> = {
//     make: (...args: any) => T
// }

// export const asFactory = <T>(fct: Factory<T>): Configuration<T> => {
//     return {
//         generator: (args: any[]) => fct.make(...args),
//         deps: getDependencies(fct)
//     }
// }

// export const asFunction = <T>(fn: () => T): Configuration<T> => {
//     console.log('GOT FUNCTION', fn)
//     return {
//         generator: () => fn(),
//         deps: (fn as any)._di || []
//     }
// }

// type Prettify<T> = {
//     [K in keyof T]: T[K]
// } & {};

// type BrandWithDependency<T, K> = T & {
//     readonly ['__deps']: T extends Record<'__deps', infer A> ? A extends Array<any> ? [...A, K] : [K] : [K]
// }


// type UnwrapConfiguration<T> = Prettify<{
//     [K in keyof T]: T[K] extends Configuration<infer U> ? Awaited<U> : Awaited<T[K]>
// }>;

// interface RegisterOptions {
//     global: boolean
// }

// const DefaultRegisterOptions = {
//     global: false
// }

// type Strinfgify<K extends string | number | undefined | symbol> =  K extends string ? `${K}` : ''

// type PrefixContainerKeys<Prefix extends string | number | undefined, C extends MakeContainer<any>> = 
//     C extends MakeContainer<infer T> ?
//     { [K in keyof T as `${Strinfgify<Prefix>}.${Strinfgify<K>}`]: T[K] }
//     : never

// type UnionToIntersection<U> = (
//   U extends any ? (k: U) => void : never
// ) extends (k: infer I) => void
//   ? I
//   : never

// type SubModulesToKeys<S extends Record<string, MakeContainer<any>>> = Prettify<UnionToIntersection<{
//     [K in keyof S]: K extends string ? PrefixContainerKeys<K, S[K]> : never
// }[keyof S]>>


// const extractSubmodulePath = (key: string) => {
//     const str = key.split('.')
//     if (str.length <= 1) {
//         return { module: null, key: key }
//     } else {
//         return { module: str[0], key: str.slice(1).join('.') }
//     }
// }

// const setInjectorKey = Symbol('SET_INJECTOR_KEY')

// export class Container<P = {}> {
//     #registers = {}
//     #instances = new Map()
//     #submoduleBuilders = {}
//     #submodules = {};
//     // #injectorKey: string = '';

//     #mocks = new Map<string, any>();
//     #containerName: string = '';

//     // [setInjectorKey](key: string) {
//     //     this.#injectorKey = key
//     // }

//     private _throwIfMissingDeps(p: Container<any>[]) {
//         Object.entries(this.#registers).forEach(([key, val]) => {
//             const deps = (val as Configuration<any>).deps
//             deps.forEach(d => {
//                 if (this.name && d.moduleName !== this.name) {
//                     if (!this.hasMock(d.dependencyKey as string)) {
//                         // We might need to load submodules for that.
//                         // FIXME: one of the submodules needs to be this dep. if not and not parent, it's missing
//                         throw new Error('Missing dependency: ' + d.dependencyKey?.toString())
//                     }
//                 }
//             })
//         })
//         return this
//     }

//     /**
//      * Function that checks if there are any missing dependencies. If there are, it throws error.
//      * It does not instantiate any dependencies that are passed as factory or class but can instantiate submodules if they are referenced
//      * @returns original container
//      * @throws Error when dependency is missing
//      */
//     throwIfMissingDeps() {
//         return this._throwIfMissingDeps([])
//     }

//     /**
//      * Registers new dependencies
//      * @param vals record of dependencies.
//      * @param options unused for now
//      * @returns original container
//      */
//     register<const V extends Record<string, any>>(vals: V, options: RegisterOptions = DefaultRegisterOptions): Container<P & UnwrapConfiguration<V>> {
//         this.#registers = {
//             ...this.#registers,
//             ...vals
//         }
//         return this as any
//     }

//     named(name: string) {
//         this.#containerName = name
//         return this
//     }

//     get name() {
//         return this.#containerName
//     }

//     /**
//      * Registers new submodules. Submodules can inject parent scope when needed.
//      * @param modules Record of submodules
//      * @returns original container
//      */
//     registerSubmodules<SubModules extends Record<string, MakeContainer<any>>>(modules: SubModules): Container<P & SubModulesToKeys<SubModules>> {
//         this.#submoduleBuilders = {
//             ...this.#submoduleBuilders,
//             ...modules
//         }

//         return this as any
//     }

//     private resolveModule(k: string) {
//         const mod = (this.#submodules as any)[k] as Container<any> | undefined
//         if (mod) {
//             return mod
//         }
//         if ((this.#submoduleBuilders as any)[k]) {
//             const newModule = ((this.#submoduleBuilders as any)[k])();
//             (this.#submodules as any)[k] = newModule
//             return newModule
//         }
//         throw new Error('Module not found: ' + k)
//     }

//     hasMock(key: string) {
//         return this.#mocks.has(key)
//     }

//     /**
//      * Mocks specific value with a given key with value.
//      * @param key key to be mocked. Can use submodules syntax, i.e. `config.url`
//      * @param value value to be mocked.
//      * @returns original container
//      */
//     mock<K extends string>(key: K, value: any) {
//         this.#mocks.set(key, value)
//         return this
//     }

//     async getForDependency(dep: DependencyInfo, parentInjectors: Container<any>[]) {
//         if (!this.name || dep.moduleName === this.name) {
//             return this.get(dep.dependencyKey as any, parentInjectors)
//         } else {
//             if (this.hasMock(dep.dependencyKey as string)) {
//                 return this.#mocks.get(dep.dependencyKey as string)
//             }
//             // We need to explore parent injectors
//             const inj = parentInjectors.find(i => i.name === dep.moduleName)
//             if (!inj) {
//                 throw new Error('Injector not found for dep: ' + dep.dependencyKey?.toString())
//             }
//             return (inj.get as any)(dep.dependencyKey)
//         }
//     }

//     async get<K extends keyof P & string>(k: K, parentInjectors: Container<any>[] = []): Promise<P[K]> {
//         if (this.#instances.has(k)) {
//             return this.#instances.get(k) as P[K]
//         }

//         if (this.#mocks.has(k)) {
//             return this.#mocks.get(k) as P[K]
//         }

//         const { module, key } = extractSubmodulePath(k)
//         if (module) {
//             // get module
//             const mod = this.resolveModule(module)
//             return mod.get(key, [this])
//         }

//         const v = (this.#registers as any)[k]
//         if (isConfiguration(v)) {
//             // GETTING DEPENDENCIES
//             const deps = await Promise.all(v.deps.map(d => this.getForDependency(d, [this, ...parentInjectors])))

//             const instance = v.generator(deps) // FIXME: here we need to pass all params properly.
//             this.#instances.set(k, instance)
//             return instance as P[K]
//         }
//         return v as P[K]
//     }
// }

// const enrichWithInjector = <T>(makeContainer: MakeContainer<T>) => {
//     const injector = makeInjector<typeof makeContainer>()
//     const fn = () => {
//         const container = makeContainer()
//         // container[setInjectorKey](injector.key)
//         return container
//     }
//     fn['injector'] = injector
//     return fn
// }

// export const containerBuilder = <T>(fn: (c: Container) => Container<T>) => {
//     const makeContainer = () => fn(new Container())
//     const container = enrichWithInjector(makeContainer)
//     return container
// }

// type BuildAnyArray<N extends number, Acc extends any[] = []> =
//     Acc['length'] extends N ? Acc : BuildAnyArray<N, [...Acc, any]>;

// // Constructor with N anys, then string, then rest any[]
// type ConstructorWithNAnysStringAndRest<N extends number, T> =
//     new (...args: [...BuildAnyArray<N>, T, ...any[]]) => any;

// type ObjectWithNAnysStringAndRest<Prop, N extends number, T> =
//     Prop extends string ? Record<Prop, (...args: [...BuildAnyArray<N>, T, ...any[]]) => any> : never

// type ResolveConstructorOrProp<Prop, NR extends number, KEY> =
// Prop extends undefined ? ConstructorWithNAnysStringAndRest<NR, KEY>
// : ObjectWithNAnysStringAndRest<Prop, NR, KEY>

// let lastInjectorKey = 0

// export function makeInjector<C extends MakeContainer<any>>(key: string = '') {
//     type T = GetContainerTypes<C>
//     let injectorKey = key
//     if (!key) {
//         injectorKey = `__injector___${lastInjectorKey}`
//         lastInjectorKey++
//     }
//     const injectFn = function inject<K extends keyof T>(k: K) {
//         return function <O, NR extends number, Prop>(target: ResolveConstructorOrProp<Prop, NR, T[K]>, _propertyKey: Prop, parameterIndex: NR) {
//             const existingDependencies: DependencyInfo[] = 
//                 Reflect.getMetadata(DEPENDENCIES_KEY, target) || []

//                 const dependencyInfo: DependencyInfo = {
//                     parameterIndex,
//                     dependencyKey: k as string,
//                     moduleName: key,
//                     _t: null
//                 }

//                 existingDependencies.push(dependencyInfo)
//                 Reflect.defineMetadata(DEPENDENCIES_KEY, existingDependencies, target)

//             // return target as BrandWithDependency<typeof target, K>
//         }
//     }
//     injectFn.key = injectorKey
//     return injectFn
// }

// // export function extern(key: string, path: string) {
// //     return `EXTERN:${key}.${path}`
// // }

// export type Extern<T, SecondType> = Omit<DependencyInfo, 'parameterIndex'>

// type ResolveExtern<E> = E extends Extern<unknown, infer Second> ? Second : never

// type ArgsToDeps<DEPS extends Record<string, any>, K extends Array<keyof DEPS | Extern<any, any>>> = {
//     [I in keyof K]: K[I] extends keyof DEPS ? DEPS[K[I]] : ResolveExtern<K[I]>
// }

// type X = ArgsToDeps<{a: number, b: string}, ['a', 'a', 'b', 'a']>

// type Constructor = new (...args: any) => any

// export type DITYWrap<C extends Constructor, Deps> = C & { _di: Deps }

// export function makeClassInjector<DEPS extends Record<string, any>>(key: string) {
//     return function injector<const INJ extends Array<keyof DEPS | Extern<any, any>>>(config: INJ) {
//         return function inject<T extends new (...args: [...ArgsToDeps<DEPS, INJ>]) => any>(constructor: T) {
//             console.log('NEW CLASS EXTENDING', constructor)
//             const modified: any = constructor as any
//             modified._di = config.map((d, i) => {
//                 if (typeof d === 'string') {
//                     // local dependency
//                     return {
//                         dependencyKey: d,
//                         moduleName: key,
//                         parameterIndex: i,
//                         _t: null
//                     } satisfies DependencyInfo
//                 } if (typeof d !== 'object') {
//                     throw new Error('Wrong Type')
//                 } else {
//                     // extern
//                     return { ...d, parameterIndex: i}
//                 }
//             })
//             console.log('EXTENDED', modified)
//             return modified
//             // return class extends constructor {
//             //     __di: INJ = config
//             // } as T & { _di: INJ }
//         }
//     }

// }

// export function makeFunctionInjector<const DEPS extends Record<string, any>>(key: string) {
//     return function injector<const INJ extends Array<keyof DEPS>>(...config: INJ) {
//         return function inject<T extends (...args: [...ArgsToDeps<Prettify<DEPS>, INJ>]) => any>(fn: T): Prettify<T> {
//             console.log('NEW CLASS EXTENDING', fn)
//             const modified: any = fn as any
//             modified._di = config
//             return modified
//             // return class extends constructor {
//             //     __di: INJ = config
//             // } as T & { _di: INJ }
//         }
//     }
// }