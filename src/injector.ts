import { ContainerBuilderFunction, Rec, SubmodulesRec } from "./builder"
import type { Container, Dependencies } from "./container"
import { ArgsToDeps } from "./types"
import { DependencyInfo, Extern } from "./utils"
import { Configuration } from "./wrappers"

export const DI_KEY = Symbol('DI_KEY')
type Prettify<T> = {
    [K in keyof T]: T[K]
} & {};

export type UnwrapConfiguration<T> = Prettify<{
    [K in keyof T]: T[K] extends Configuration<infer U> ? Awaited<U> : Awaited<T[K]>
}>;

export type ResolveContaierKeys<T extends Rec, D extends SubmodulesRec> = UnwrapConfiguration<T>

export type GetContainerTypes<T> = T extends ContainerBuilderFunction<any, any, infer K> ?
K :
T extends Container<any, any, infer K> ? K : never

export function makeInjector<const B>(moduleName: string) {
    type Deps = GetContainerTypes<B>
    return function injector<const Inject extends Array<(string & keyof Deps) | Extern<string, unknown>>>(config: Inject) {
        return function<T extends new (...args: [...ArgsToDeps<Deps, Inject>]) => any>(constructor: T) {
            // Injecting
            const modified: any = constructor
            modified[DI_KEY] = config.map((dep, i) => {
                if (typeof dep === 'string') {
                    return {
                        dependencyKey: dep,
                        moduleName,
                        parameterIndex: i,
                        _t: null // FIXME: maybe we can drop this.
                    } satisfies DependencyInfo
                } else {
                    return {
                        ...dep,
                        parameterIndex: i,
                        _t: null // FIXME: drop this.
                    } satisfies DependencyInfo
                }
            })
            return modified
        }

    }
}


export const getDependencies = (target: any) => {
    console.log('GETTING DEPENDENCIES FROM TARGET', target)
    const sortFn = (a: DependencyInfo, b: DependencyInfo) => a.parameterIndex - b.parameterIndex
    if (target[DI_KEY]) {
        return target[DI_KEY].sort(sortFn)
    }
    return []
    // const deps = (Reflect.getMetadata(DEPENDENCIES_KEY, target) || []) as DependencyInfo[]
    // return deps.sort(sortFn)
}