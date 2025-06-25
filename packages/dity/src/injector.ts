import { Submodule } from "./builder"
import { ArgsToDeps } from "./types"
import { DependencyInfo } from "./utils";
import { Configuration } from "./wrappers"

export const DI_KEY = Symbol('DI_KEY')
type Prettify<T> = {
    [K in keyof T]: T[K]
} & {};

export type UnwrapConfiguration<T> = Prettify<{
    [K in keyof T]: T[K] extends Configuration<infer U> ? Awaited<U> : Awaited<T[K]>
}>;

// export type ResolveContaierKeys<T extends Rec, D extends SubmodulesRec> = UnwrapConfiguration<T>

export type GetAllContainerTypes<T> = T extends Submodule<infer A, infer B>
? A & B : never

export function makeInjector<const B>() {
    type Deps = GetAllContainerTypes<B>
    return function injector<const Inject extends Array<(keyof Deps & string)>>(config: Inject) {
        return function<T extends (new (...args: ArgsToDeps<Deps, Inject>) => any) | ({ make(...args: ArgsToDeps<Deps, Inject>): any }) |  ((...args: ArgsToDeps<Deps, Inject>) => any)>(constructor: T): any /*T*/ {
            // Injecting
            const modified: any = constructor
            modified[DI_KEY] = config.map((dep, i) => {
                return {
                    ref: dep,
                }
            })
            return modified
        }
    }
}

export const getDependencies = (target: any) => {
    if (target[DI_KEY]) {
        return target[DI_KEY]
    }
    return []
}