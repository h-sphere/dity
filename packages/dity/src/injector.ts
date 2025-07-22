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

export type GetAllContainerTypes<T> = T extends Submodule<infer A, infer B, any>
? A & B : never

export function makeInjector<const B, const T extends 'factory' | 'class' = 'class'>() {
    type Deps = GetAllContainerTypes<B>

    return function injector<const Inject extends Array<(keyof Deps & string)>>(config: Inject) {
        type Args = ArgsToDeps<Deps, Inject>
        type AsClass = new (...args: Args) => any
        type AsFactory = (new (...args: []) => { make(...args: Args): any })
        type TTT = T extends 'factory' ? AsFactory : AsClass
        return function<const T extends TTT>(constructor: T): any /*T*/ {
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