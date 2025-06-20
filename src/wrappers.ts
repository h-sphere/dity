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