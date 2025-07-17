import { Container } from "./container"
import { asValue, Configuration } from "./wrappers"

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

export class ContainerBuilder<Dependencies extends DependenciesObjectType = {}, Unresolved extends DependenciesObjectType = {}> {
    #dependencies = {}
    #submodules = {}
    constructor(public readonly moduleName: string) { }
    register<NewDeps extends DependenciesObjectType>(newDeps: NewDeps) {
        const c = this.copy()
        c.#dependencies = {
            ...c.#dependencies,
            ...Object.fromEntries(Object.entries(newDeps).map(([key, value]) => ([key, typeof value === 'string' ? asValue(value) : value])))
        }
        return c as ContainerBuilder<Prettify<Dependencies & ResolveConfigs<NewDeps>>, Unresolved>
    }

    private copy() {
        const c = new ContainerBuilder<Dependencies, Unresolved>(this.moduleName)
        c.#dependencies = {...this.#dependencies}
        c.#submodules = { ...this.#submodules}
        return c
    }

    submodules<const NewSubs extends Record<string, Submodule<any, any>>>(newSubs: NewSubs) {
        const c = this.copy()
        c.#submodules = {
            ...c.#submodules,
            ...newSubs
        }
        // FIXME: typing here should be fixed somehow.
        return c as any as ContainerBuilder<Prettify<Dependencies & SubsToDependencies<NewSubs>>, Unresolved & SubsToUnresolved<NewSubs>>
    }

    externals<NewExternals extends Record<string, any>>(): ContainerBuilder<Dependencies, Prettify<Unresolved & NewExternals>> {
        return this as any
    }

    get<const K extends keyof Dependencies>(k: K) { }

    resolve<const T extends keyof Unresolved>(resolves: ResolveObject<Unresolved, T, Dependencies>): ContainerBuilder<Prettify<Dependencies & Pick<Unresolved, T>>, Prettify<Omit<Unresolved, T>>>  {

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

class ContainerBuilderResolver<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType> {
    constructor(private readonly fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved>) { }


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


type ContainerBuilderWrapperFunction<Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType> =
    (c: ContainerBuilder) => ContainerBuilder<Dependencies, Unresolved>

export const buildContainer = <Dependencies extends DependenciesObjectType, Unresolved extends DependenciesObjectType>(fn: ContainerBuilderWrapperFunction<Dependencies, Unresolved>) => {
    return new ContainerBuilderResolver(fn)
}
