import { getDependencies } from "./injector"
import { DependencyInfo } from "./utils"

export type Configuration<T> = {
    generator: (args: any[]) => T,
    deps: DependencyInfo[]
}

export const isConfiguration = (k: any): k is Configuration<any> => {
    return !!k['generator']
}


export const asClass = <T extends (new (...args: any[]) => any)>(C: T): Configuration<InstanceType<T>> => ({
    generator: (args: any[]) => {
        // Gathering arguments
        return new C(...args)
    },
    deps: getDependencies(C)
})

interface MakeableConstructor<Args extends Array<any>, R> {
  new (...args: any[]): { make(...args: Args): R };
}

type MakeableConstructorReturn<T> = T extends MakeableConstructor<any, infer R> ? R : never

export const asFactory = <const T extends MakeableConstructor<Array<any>, any>>(C: T): Configuration<MakeableConstructorReturn<T>> => ({
    deps: getDependencies(C),
    generator: (args: any[]) => {
        return new C().make(...args)
    }
})

export const asValue = <T>(v: T): Configuration<T> => ({
    deps: [],
    generator: () => v
})

export const asFunction = <T extends (...args: any[]) => any>(c: T): Configuration<ReturnType<T>> => {
    const ret: any = ({
        generator: (args: any[]) => {
            return c(...args)
        },
        deps: getDependencies(c)
    })

    return ret as any as Configuration<ReturnType<T>>
}