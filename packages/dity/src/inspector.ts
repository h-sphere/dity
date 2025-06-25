import { Container, getInternals, isConfiguration, isDependencyReference } from "./container";
import { MODULE_KEY } from "./utils";

interface ChainDef {
    name: string;
    key: symbol
}


class Inspect {
    #dependencies: Record<string, any>
    #submodules: Record<string, Inspect>
    #moduleName: string
    #moduleKey: symbol
    constructor(c: Container<any>) {
        const internals = c[getInternals]()
        this.#dependencies = internals.dependencies
        this.#moduleName = internals.name
        this.#submodules = Object.fromEntries(
            Object.entries(internals.submodules).map(([k, s]) => ([k, new Inspect(s)]))
        )
        this.#moduleKey = internals.moduleKey
    }

    getSelfDepsDescriptions() {
        return Object
            .entries(this.#dependencies)
            .filter(([k]) => !k.includes('.'))
            .map(([key, value]) => {
                if (isDependencyReference(value)) {
                    return {
                        type: 'reference',
                        key,
                        ref: value.ref,
                        module: this.#moduleName,
                        moduleKey: value[MODULE_KEY]
                    } as const
                } else if (isConfiguration(value) && value.deps.length > 0) {
                    return {
                        type: 'configuration',
                        key,
                        deps: value.deps,
                        module: this.#moduleName
                    } as const
                } else {
                    return {
                        type: 'value',
                        key,
                        module: this.#moduleName
                    } as const
                }
            })
    }

    getDependencies(chain: ChainDef[] = []) {
        const self = this.getSelfDepsDescriptions()
        const subs = this.getSubDependencies(chain) as ReturnType<typeof this.getSelfDepsDescriptions>
        return [...self, ...subs]
    }

    getSubDependencies(chain: ChainDef[] = []) {
        return Object.entries(this.#submodules)
            .flatMap(([key, value]) => {
                let currentChain: ChainDef[] = [...chain]
                const deps = value.getDependencies([...currentChain, { key: this.#moduleKey, name: key }])
                return deps.map(d => {
                    if (d.type === 'reference') {
                        const index = currentChain.findIndex(c => c.key === d.moduleKey)
                        let prefix = ''
                        if (index >= 0) {
                            prefix = currentChain.slice(index - 1).map(i => i.name).join('.') + '.'
                        }

                        return {
                            ...d,
                            key: `${key}.${d.key}`,
                            ref: `${prefix}${d.ref}`
                        }
                    }
                    return {
                        ...d,
                        key: `${key}.${d.key}`
                    }
                })
            })
    }
}

export const inspect = (sub: Container<any>) => {
    return new Inspect(sub)
}