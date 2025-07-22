import { Container } from "./container"
import { asValue, Configuration } from "./wrappers"

type DependenciesObjectType = Record<string, unknown>

export type Submodule<Deps extends Record<string, any>, Unresolved extends Record<string, any>, Exports extends keyof Deps = never> = ContainerBuilderResolver<Deps, Unresolved, Exports> | ContainerBuilder<Deps, Unresolved, Exports>

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

type BuilderDependencies<T> = T extends Submodule<infer Deps, any, any> ? Deps : T
type BuilderUnresolved<T> = T extends Submodule<any, infer Unresolved, any> ? Unresolved : never
type BuilderExports<T> = T extends Submodule<any, any, infer Exports> ? Exports : never

type Strinfgify<K extends string | number | undefined | symbol> =  K extends string ? `${K}` : ''

type PrefixKeys<Prefix extends string, T> = 
    { [K in keyof T as `${Strinfgify<Prefix>}.${Strinfgify<K>}`]: T[K] }



type ValidKeys<T> = T extends Submodule<infer Deps, any, infer Extras> ? Pick<Deps, Extras> : never
type DSAED  = Prettify<ValidKeys<Submodule<{a: number, b: number}, any, 'a'>>>

type DSADAS = Pick<{a: number, b: number}, 'a'>


type SubsToDependencies<Subs> = Prettify<UnionToIntersection<{
  [K in keyof Subs & string]: PrefixKeys<K, ValidKeys<Subs[K]>>
}[keyof Subs & string]>>

type SubsToUnresolved<Subs> = Prettify<UnionToIntersection<{
  [K in keyof Subs & string]: PrefixKeys<K, BuilderUnresolved<Subs[K]>>
}[keyof Subs & string]>>

type WithType<Dict, Type> = {
    [K in keyof Dict]: Type extends Dict[K] ? K : never
}[keyof Dict]

type Res<T> = ({} extends T ? [] : [T])

type ResolveConfigs<T> = { [K in keyof T]: Awaited<T[K] extends Configuration<infer C> ? C : T[K]> }

export const setSymbol = Symbol('setSymbol')

type ResolveObject<T, K extends keyof T, Main> = {
    [P in K]: 
        Exclude<WithType<T, T[P]>, P>
        | (string extends T[P] ? Configuration<T[P]> : T[P])
        | WithType<Main, T[K]>
}

type PrefixSubExports<T extends Record<string, Submodule<any, any, any>>> = { [K in keyof T & string]: `${K}.${BuilderExports<T[K]>}`}[keyof T & string]

// type ABC = PrefixSubExports<{
//     a: Submodule<{a: number}, any, 'a'>,
//     b: Submodule<{c: string, b: number}, any, 'b'|'c'>
// }>

export class ContainerBuilder<Dependencies extends DependenciesObjectType = {}, Unresolved extends DependenciesObjectType = {}, Exports extends keyof Dependencies = never> {
    #dependencies = {}
    #submodules = {}
    constructor(public readonly moduleName: string) { }
    register<NewDeps extends DependenciesObjectType>(newDeps: NewDeps) {
        const c = this.copy()
        c.#dependencies = {
            ...c.#dependencies,
            ...Object.fromEntries(Object.entries(newDeps).map(([key, value]) => ([key, typeof value === 'string' ? asValue(value) : value])))
        }
        return c as ContainerBuilder<Prettify<Dependencies & ResolveConfigs<NewDeps>>, Unresolved, Exports>
    }

    private copy() {
        const c = new ContainerBuilder<Dependencies, Unresolved>(this.moduleName)
        c.#dependencies = {...this.#dependencies}
        c.#submodules = { ...this.#submodules}
        return c
    }

    submodules<const NewSubs extends Record<string, Submodule<any, any, any>>>(newSubs: NewSubs) {
        const c = this.copy()
        c.#submodules = {
            ...c.#submodules,
            ...newSubs
        }
        // FIXME: typing here should be fixed somehow.
        return c as any as ContainerBuilder<Prettify<Dependencies & SubsToDependencies<NewSubs>>, Unresolved & SubsToUnresolved<NewSubs>, Exports | PrefixSubExports<NewSubs>>
    }

    exports<const T extends keyof Dependencies & string>(..._vals: T[]) {
        return this as ContainerBuilder<Dependencies, Unresolved, Exports | T>
    }


    externals<NewExternals extends Record<string, any>>(): ContainerBuilder<Dependencies, Prettify<Unresolved & NewExternals>, Exports> {
        return this as any
    }

    get<const K extends keyof Dependencies>(k: K) { }

    resolve<const T extends keyof Unresolved>(resolves: ResolveObject<Unresolved, T, Dependencies>): ContainerBuilder<Prettify<Dependencies & Pick<Unresolved, T>>, Prettify<Omit<Unresolved, T>>, Exports>  {

        const c = this.copy()
        const newDeps = Object.fromEntries(
            Object.entries(resolves)
            .map(([key, v]) => ([key, typeof v === 'string' ? { ref: v} : v]))
        )

        c.#dependencies = {
            ...c.#dependencies,
            ...newDeps
        }
        return c as any
    }

    // resolve<const K extends keyof Unresolved, const J extends Unresolved[K]>(k: K, v: WithType<Dependencies, J> | (string extends Unresolved[K] ? Configuration<Unresolved[K]> : Unresolved[K]) ): ContainerBuilder<Prettify<Dependencies & { [k in K]: Unresolved[K] }>, Prettify<Omit<Unresolved, K>>> {
    //     const c = this.copy()
    //     c.#dependencies = {
    //         ...c.#dependencies,
    //         [k]: typeof v === 'string' ? { ref: v } : v
    //     }
    //     // FIXME: adding resolutions here.
    //     return c as any
    // }

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

class ContainerBuilderResolver<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType, Exports extends keyof Dependencies = never> {
    constructor(private readonly fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved, Exports>) { }


    build(...args: Parameters<ReturnType<typeof this.fn>['build']>) {
        return this.fn(new ContainerBuilder('')).build(...args)
    }

    resolve<const T extends keyof Unresolved>(resolves: ResolveObject<Unresolved, T, Dependencies>) {
        return new ContainerBuilderResolver((c: ContainerBuilder) => this.fn(c).resolve(resolves))
    }
    [setSymbol](name: symbol) {
        return new ContainerBuilderResolver((c: ContainerBuilder) => this.fn(c)[setSymbol](name))
    }
}


type ContainerBuilderWrapperFunction<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType, Exports extends keyof Dependencies = never> =
    (c: ContainerBuilder) => ContainerBuilder<Dependencies, Unresolved, Exports>

export const buildContainer = <Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType, Exports extends string = never>(fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved, Exports>) => {
    return new ContainerBuilderResolver(fn)
}
