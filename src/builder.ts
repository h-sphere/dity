import { constructorMethod, Container, Dependencies } from "./container"
import { UnwrapConfiguration } from "./injector"
import { SubModulesToKeys } from "./utils"

export type Rec = Record<string, any>
export type SubmodulesRec = Record<string, ContainerBuilderFunction>

const buildMethod = Symbol('build')

export class ContainerBuilder<Dependencies extends Rec = {}, SubModules extends SubmodulesRec = {}, FinalDeps extends Rec = {}> {
    #dependencies: Dependencies = {} as Dependencies
    #submodules: SubModules = {} as SubModules

    constructor(private readonly key: string) { }

    [buildMethod]() {
        return Container[constructorMethod]<Dependencies, SubModules, FinalDeps>(this.key, this.#dependencies, this.#submodules)
    }

    register<NewDeps extends Rec>(dependencies: NewDeps): ContainerBuilder<Dependencies & NewDeps, SubModules, FinalDeps & UnwrapConfiguration<NewDeps>> {
        this.#dependencies = {
            ...this.#dependencies,
            ...dependencies
        }
        return this as any
    }

    registerSubmodule<NewSubmodules extends Record<string, ContainerBuilderFunction>>(submodules: NewSubmodules): ContainerBuilder<Dependencies, SubModules & NewSubmodules, FinalDeps & SubModulesToKeys<NewSubmodules>> {
        this.#submodules = {
            ...this.#submodules,
            ...submodules
        }
        return this as any
    }
}

export type ContainerBuilderFunction<D extends Dependencies = Dependencies, S extends SubmodulesRec = {}, FinalDeps extends Dependencies = {}> = () => Container<D, S, FinalDeps>

export const containerBuilder = <T extends Rec, D extends SubmodulesRec, FinalDeps extends Rec>(name: string, fn: (c: ContainerBuilder) => ContainerBuilder<T, D, FinalDeps>): ContainerBuilderFunction<T, D, FinalDeps> => {
    const build = () => {
        const container = new ContainerBuilder(name)
        const convertedContainer = fn(container)
        return convertedContainer[buildMethod]()
    }

    return build
}