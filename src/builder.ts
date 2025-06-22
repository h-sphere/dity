import { constructorMethod, Container, Dependencies } from "./container"
import { getDependencies, UnwrapConfiguration } from "./injector"
import { Extern, SubModulesToExternalKeys, SubModulesToKeys } from "./utils"
import { Configuration } from "./wrappers"

// export type Rec = Record<string, any>
// export type SubmodulesRec = Record<string, ContainerBuilderFunction | ContainerBuilderWithUnresolvedExternals>

// const buildMethod = Symbol('build')

// type ConvertExternals<T extends Record<string, any>> = {
//     [K in keyof T & string as `<< ${K}`]: T[K]
// } & {}

type DependenciesObjectType = Record<string, unknown>

export type Submodule<Deps extends Record<string, any>, Unresolved extends Record<string, any>> = ContainerBuilderResolver<Deps, Unresolved> | ContainerBuilder<Deps, Unresolved>

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type BuilderDependencies<T> = T extends Submodule<infer Deps, any> ? Deps : T
type BuilderUnresolved<T> = T extends Submodule<any, infer Unresolved> ? Unresolved : never

type Strinfgify<K extends string | number | undefined | symbol> =  K extends string ? `${K}` : ''

type PrefixKeys<Prefix extends string, T> = 
    { [K in keyof T as `${Strinfgify<Prefix>}.${Strinfgify<K>}`]: T[K] }

type SubsToDependencies<Subs> = Prettify<UnionToIntersection<{
  [K in keyof Subs & string]: PrefixKeys<K, BuilderDependencies<Subs[K]>>
}[keyof Subs & string]>>

type SubsToUnresolved<Subs> = Prettify<UnionToIntersection<{
  [K in keyof Subs & string]: PrefixKeys<K, BuilderUnresolved<Subs[K]>>
}[keyof Subs & string]>>

type NoDotKeys = string extends `${string}.${string}` ? never : string;

type ObjectWithoutDotKeys = {
  [K in string]: K extends `${string}.${string}` ? never : any;
};

type WithType<Dict, Type> = {
    [K in keyof Dict]: Type extends Dict[K] ? K : never
}[keyof Dict]

const TypeWrap = { reference: '' }

type Ref<T> = {
    ref: T
}

type WithTypeUnlessString<Dict, Type> = string extends Type ? Ref<WithType<Dict, Type>> : WithType<Dict, Type>

type XAC = WithType<{ A: number, b: string, c: number }, number>

type Exact<T, U> = T & Record<Exclude<keyof U, keyof T>, never>;


type Res<T> = ({} extends T ? [] : [T])

type ResolveConfigs<T> = { [K in keyof T]: T[K] extends Configuration<infer C> ? C : T[K] }

export const setSymbol = Symbol('setSymbol')

export class ContainerBuilder<Dependencies extends DependenciesObjectType = {}, Unresolved extends DependenciesObjectType = {}> {
    #dependencies = {}
    #submodules = {}
    constructor(public readonly moduleName: string) { }
    register<NewDeps extends DependenciesObjectType>(newDeps: NewDeps): ContainerBuilder<Prettify<Dependencies & ResolveConfigs<NewDeps>>, Unresolved> {
        this.#dependencies = {
            ...this.#dependencies,
            ...newDeps
        }
        return this as any
    }

    submodules<const NewSubs extends Record<string, Submodule<any, any>>>(newSubs: NewSubs): ContainerBuilder<Prettify<Dependencies & SubsToDependencies<NewSubs>>, Unresolved & SubsToUnresolved<NewSubs>> {
        this.#submodules = {
            ...this.#submodules,
            ...newSubs
        }
        return this as any
    }

    externals<NewExternals extends Record<string, any>>(): ContainerBuilder<Dependencies, Prettify<Unresolved & NewExternals>> {
        return this as any
    }

    get<const K extends keyof Dependencies>(k: K) { }

    resolve<const K extends keyof Unresolved, const J extends Unresolved[K]>(k: K, v: Unresolved[K] | WithTypeUnlessString<Dependencies, J>): ContainerBuilder<Prettify<Dependencies & { [k in K]: Unresolved[K] }>, Prettify<Omit<Unresolved, K>>> {
        this.#dependencies = {
            ...this.#dependencies,
            [k]: v
        }
        // FIXME: adding resolutions here.
        return this as any
    }

    #symbolToSet = Symbol();
    // FIXME: this should be symbol itself
    [setSymbol](name: symbol) {
        this.#symbolToSet = name
        return this
    }

    build<const R extends Res<Unresolved>>(...args: R): Container<Dependencies> {
        if (args.length) {
            this.#dependencies = {
                ...this.#dependencies,
                ...args[0]
            }
        }

        // FIXME: creating module here.
        return new Container<Dependencies>(this.#dependencies, this.#submodules, this.#symbolToSet)
    }
}

// export type ContainerBuilderResolver<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType> = Pick<ContainerBuilder<Dependencies, Unresolved>, 'build'> & { resolve<const K extends keyof Unresolved, const J extends Unresolved[K]>(k: K, v: Unresolved[K] | WithTypeUnlessString<Dependencies, J>): ContainerBuilderResolver<Prettify<Dependencies & { [k in K]: Unresolved[K] }>, Prettify<Omit<Unresolved, K>>>}

class ContainerBuilderResolver<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType> {
    constructor(private readonly fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved>) { }

    build(...args: Parameters<ReturnType<typeof this.fn>['build']>) {
        return this.fn(new ContainerBuilder('')).build(...args)
    }

    resolve<const K extends keyof Unresolved, const J extends Unresolved[K]>(k: K, v: Unresolved[K] | WithTypeUnlessString<Dependencies, J>) {
        return new ContainerBuilderResolver((c: ContainerBuilder) => this.fn(c).resolve(k, v))
    }
    [setSymbol](name: symbol) {
        return new ContainerBuilderResolver((c: ContainerBuilder) => this.fn(c)[setSymbol](name))
    }
}


type ContainerBuilderWrapperFunction<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType> =
    (c: ContainerBuilder) => ContainerBuilder<Dependencies, Unresolved>

export const buildContainer = <Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType>(fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved>) => {
    return new ContainerBuilderResolver(fn)
    // let newDeps = {}
    // return {
    //     build(...args) {
    //         const container = fn(new ContainerBuilder('NO NAME'))
    //         const buildArgs = [{...args, ...newDeps}] as Res<Unresolved>
    //         return container.build(...buildArgs)
    //     },
    //     resolve(k, v) {
    //         newDeps = {
    //             ...newDeps,
    //             k: v
    //         }
    //         return this as any
    //     }
    // } satisfies ContainerBuilderResolver<Dependencies, Unresolved>
}

const x= new ContainerBuilder('main')


type DSADSA = Omit<{ a: number, b: number}, 'a'>


const y = new ContainerBuilder('sub')
    .register({ a: 5, b: 'fdfsa', 'dddddd': new Date()})
    .externals<{ c: string}>()
    .externals<{ d: Date }>()
    .resolve('d', new Date())

type X = SubsToUnresolved<{ a: typeof y, b: typeof z }>

const z = new ContainerBuilder('sub2').register({c: 432, d: 'dsadsad' }).externals<{ gg: number }>()

// const xxx = x.submodules({ y, z }).resolve('z.gg', 'y.a')//.resolve('y.c', { ref: 'z.d' })

// xxx.build({
//     'y.c': 'hello'
// })

// export class ContainerBuilder<Dependencies extends Rec = {}, SubModules extends SubmodulesRec = {}, FinalDeps extends Rec = {}, Externals extends Record<string, any> = {}> {
//     #dependencies: Dependencies = {} as Dependencies
//     #submodules: SubModules = {} as SubModules
//     #unresolvedExternals: Array<keyof Externals> = []

//     constructor(private readonly key: string) { }

//     [buildMethod]() {
//         return Container[constructorMethod]<Dependencies, SubModules, FinalDeps, Externals>(this.key, this.#dependencies, this.#submodules)
//     }

//     register<NewDeps extends Rec>(dependencies: NewDeps): ContainerBuilder<Dependencies & NewDeps, SubModules, FinalDeps & UnwrapConfiguration<NewDeps>, Externals> {
//         this.#dependencies = {
//             ...this.#dependencies,
//             ...dependencies
//         }
//         return this as any
//     }

//     registerSubmodule<NewSubmodules extends Record<string, ContainerBuilderFunction>>(submodules: NewSubmodules): ContainerBuilder<Dependencies, SubModules & NewSubmodules, FinalDeps & SubModulesToKeys<NewSubmodules>, Externals & SubModulesToExternalKeys<NewSubmodules>> {
//         this.#submodules = {
//             ...this.#submodules,
//             ...submodules
//         }
//         return this as any
//     }

//     externals<Deps extends Record<string, any>>(): ContainerBuilder<Dependencies, SubModules, FinalDeps & Deps, Externals & Deps> {
//         return this as any
//     }

//     resolve<K extends keyof Externals>(k: K, t: Externals[K] | Configuration<Externals[K]>): ContainerBuilder<Dependencies, SubModules, FinalDeps, Omit<Externals, K>> {
//         this.#dependencies = {
//             ...this.#dependencies,
//             [k]: t
//         }
//         return this as any
//     }
// }

// type KeysOfType<T, U> = {
//   [K in keyof T]: T[K] extends U ? K : never;
// }[keyof T];

// export type ContainerBuilderWithUnresolvedExternals<D extends Dependencies = Dependencies, S extends SubmodulesRec = {}, FinalDeps extends Dependencies = {}, Externals extends Record<string, any> = {}> = {
//     resolve: <K extends keyof Externals>(k: K, v: Externals[K] | KeysOfType<FinalDeps, Externals[K]>) => ContainerBuilderFunction<D, S, FinalDeps, Omit<Externals, K>>
// }

// export type ContainerBuilderFunction<D extends Dependencies = Dependencies, S extends SubmodulesRec = {}, FinalDeps extends Dependencies = {}, Externals extends Record<string, any> = {}> = 
// {} extends Externals
//     ? () => Container<D, S, FinalDeps, Externals>
//     : ContainerBuilderWithUnresolvedExternals<D, S, FinalDeps, Externals>


// export const containerBuilder = <T extends Rec, D extends SubmodulesRec, FinalDeps extends Rec, Externals extends Record<string, any>>(name: string, fn: (c: ContainerBuilder) => ContainerBuilder<T, D, FinalDeps, Externals>): ContainerBuilderFunction<T, D, FinalDeps, Externals> => {
//     let extraExternals: Record<keyof Externals, any> = {} as any
//     const build = () => {
//         const container = new ContainerBuilder(name)
//         const convertedContainer = fn(container)
//         const containerWithExternals = Object.entries(extraExternals).reduce((c, [key, value]) => {
//             return c.resolve(key, value)
//         }, convertedContainer)
//         return containerWithExternals[buildMethod]()
//     }

//     build.resolve = <K extends keyof Externals>(k: K, v: Externals[K] | KeysOfType<FinalDeps, Externals[K]>): ContainerBuilderFunction<T, D, FinalDeps, Omit<Externals, K>> => {
//         extraExternals = { ... extraExternals, [k]: v}
//         return build as any
//     }

//     return build as any // ContainerBuilderFunction<T, D, FinalDeps, Externals>
// }