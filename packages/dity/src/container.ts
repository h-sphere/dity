import { setSymbol, Submodule } from "./builder"
import { DependencyInfo, MODULE_KEY, INJECTOR_PLACEHOLDER } from "./utils"
import { createDependencyNotFoundError, createModuleNotFoundError, CircularDependencyError } from "./errors"

export type Dependencies = Record<string, unknown>

export const constructorMethod = Symbol('constructor')
export const registerExternals = Symbol('registerExternals')
export const getInternals = Symbol('getInternals')

export type Configuration<T> = {
    generator: (args: unknown[]) => T,
    deps: DependencyInfo[]
}

export const isConfiguration = <T = unknown>(k: unknown): k is Configuration<T> => {
    return typeof k === 'object' && k !== null && 'generator' in k && typeof k.generator === 'function'
}

export const isDependencyReference = (t: unknown): t is DependencyInfo => {
    return typeof t === 'object' && t !== null && 'ref' in t
}

export class Container<D extends Dependencies> {
    #dependencyDefinitions: Dependencies = {}
    #dependencies = new Map<keyof D, D[keyof D]>()

    #submoduleDefinitions: Record<string, Submodule<any, any, any>> = {}
    #submodules = new Map<string, Container<any>>()

    #currentModule: symbol

    constructor(deps: Dependencies, submodules: Record<string, Submodule<any, any, any>>, name: symbol = Symbol()) {
        this.#dependencyDefinitions = deps
        this.#submoduleDefinitions = submodules
        this.#currentModule = name
    }

    private transformReferences(v: unknown) {
        if (typeof v === 'string') {
            return {
                ref: v,
                [MODULE_KEY]: this.#currentModule
            } satisfies DependencyInfo
        }
        if (typeof v === 'object' && v !== null && 'ref' in v && typeof v.ref === 'string') {
            return {
                ref: v.ref,
                [MODULE_KEY]: MODULE_KEY in v && typeof v[MODULE_KEY] === 'symbol' && v[MODULE_KEY] !== INJECTOR_PLACEHOLDER ? v[MODULE_KEY] : this.#currentModule
            } satisfies DependencyInfo
        }
        return v
    }

    private getModule(k: string): Container<any> {
        if (this.#submodules.has(k)) {
            return this.#submodules.get(k)!
        }
        if (k in this.#submoduleDefinitions) {
            const def = this.#submoduleDefinitions[k]
            const externalEntries = Object
                .entries(this.#dependencyDefinitions)
                .filter(([key, _value]) => key.startsWith(`${k}.`))
                .map(([key, value]) => ([key.substring(k.length + 1), value]))
                .map(([key, value]) => ([key, this.transformReferences(value)]))
            const externals = Object.fromEntries(externalEntries)
            const builder = (def as any)[setSymbol](Symbol(`Module ${k}`))
            const built: Container<any> = builder.build(externals)
            this.#submodules.set(k, built)
            return built
        }
        const availableModules = Object.keys(this.#submoduleDefinitions)
        throw createModuleNotFoundError(k, this.#currentModule.description ?? 'unknown', availableModules)
    }

    private async getDependencyInstance<const K extends keyof D & string>(key: K, parentChain: Container<any>[], resolutionChain: string[] = []): Promise<D[K]> {
        // Create fully qualified key for resolution tracking
        const modulePrefix = this.#currentModule.description ?? 'unknown'
        const fullyQualifiedKey = modulePrefix === 'toplevel' ? key : `${modulePrefix}.${key}`
        
        // Check for circular dependencies using fully qualified keys
        if (resolutionChain.includes(fullyQualifiedKey)) {
            throw new CircularDependencyError([...resolutionChain, fullyQualifiedKey])
        }
        if (this.#dependencies.has(key)) {
            return this.#dependencies.get(key)! as D[K]
        }
        if (key in this.#dependencyDefinitions) {
            const dep = this.#dependencyDefinitions[key]
            // Handle different dependency types
            if (isDependencyReference(dep)) {
                return this.getWithModule(this.transformReferences(dep) as DependencyInfo, parentChain, [...resolutionChain, fullyQualifiedKey]) as D[K]
            } else if (isConfiguration(dep)) {
                // Resolving dependencies
                let deps = []
                const newChain = [...resolutionChain, fullyQualifiedKey]
                for (const d of dep.deps) {
                    deps.push(await this.getWithModule(this.transformReferences(d) as DependencyInfo, parentChain, newChain))
                }
                const dependency = await dep.generator(deps)
                this.#dependencies.set(key, dependency as D[keyof D])
                return dependency as D[K]
            } else if (typeof dep === 'object' && dep !== null && 'ref' in dep) {
                const res: Dependencies[K] = await this.getWithModule(this.transformReferences(dep) as DependencyInfo, parentChain, [...resolutionChain, fullyQualifiedKey])
                this.#dependencies.set(key, res as D[keyof D])
                return res as D[K]
            } else {
                this.#dependencies.set(key, dep as D[keyof D])
                return dep as D[K]
            }
        }

        // We need to go deeper
        const [module, ...rest] = key.split('.')
        if (rest.length <= 0) {
            const availableDeps = Object.keys(this.#dependencyDefinitions)
            throw createDependencyNotFoundError(
                key, 
                this.#currentModule.description ?? 'unknown', 
                availableDeps,
                parentChain.map(p => p.#currentModule.description ?? 'unknown')
            )
        }
        const subKey = rest.join('.')
        return this.getModule(module).getWithModule(subKey, [this, ...parentChain], [...resolutionChain, fullyQualifiedKey])
    }

    private async getWithModule<const K extends keyof D & string>(conf: K | DependencyInfo, parentChain: Container<any>[] = [], resolutionChain: string[] = []): Promise<D[K]> {
        let { module, key } = typeof conf === 'string' ? {
            module: this.#currentModule, key: conf
        } : {
            module: conf[MODULE_KEY],
            key: conf.ref
        }

        if (module === this.#currentModule) {
            return this.getDependencyInstance(key, parentChain, resolutionChain) as D[K]
        }
        // We need to go up the tree?
        const matchingParent = parentChain.find(p => p.#currentModule === module)
        if (matchingParent) {
            // Cut the parent chain to avoid circular references
            const parentIndex = parentChain.findIndex(p => p.#currentModule === module)
            const trimmedChain = parentIndex >= 0 ? parentChain.slice(0, parentIndex) : parentChain
            return matchingParent.getWithModule(conf, trimmedChain, resolutionChain)
        }
        throw createModuleNotFoundError(
            module.description ?? 'unknown',
            this.#currentModule.description ?? 'unknown',
            parentChain.map(p => p.#currentModule.description ?? 'unknown')
        )
    }

    async get<const K extends keyof D & string>(key: K): Promise<D[K]> {
        return this.getWithModule(key, [], [])
    };

    [getInternals]() {
        return {
            dependencies: this.#dependencyDefinitions,
            submodules: Object.fromEntries(Object.keys(this.#submoduleDefinitions)
                .map((key) => ([key, this.getModule(key)]))),
            name: this.#currentModule.description ?? 'toplevel',
            moduleKey: this.#currentModule
        }
    }
}