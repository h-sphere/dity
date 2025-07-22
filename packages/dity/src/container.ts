import { setSymbol, Submodule } from "./builder"
import { DependencyInfo, MODULE_KEY } from "./utils"

export type Dependencies = Record<string, any> // FIXME: BETTER TYPING HERE

export const constructorMethod = Symbol('constructor')
export const registerExternals = Symbol('registerExternals')
export const getInternals = Symbol('getInternals')

export type Configuration<T> = {
    generator: (args: any[]) => T,
    deps: DependencyInfo[]
}

export const isConfiguration = (k: any): k is Configuration<any> => {
    return !!k['generator']
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
                [MODULE_KEY]: MODULE_KEY in v && typeof v[MODULE_KEY] === 'symbol' ? v[MODULE_KEY] : this.#currentModule
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
        throw new Error('Module not found: ' + k + ` (in ${this.#currentModule.toString()})`)
    }

    private async getDependencyInstance<const K extends keyof D & string>(key: K, parentChain: Container<any>[]): Promise<D[K]> {
        if (this.#dependencies.has(key)) {
            return this.#dependencies.get(key)! as D[K]
        }
        if (key in this.#dependencyDefinitions) {
            const dep = this.#dependencyDefinitions[key]
            // FIXME: if is configuration, resolving config
            if (isDependencyReference(dep)) {
                return this.getWithModule(this.transformReferences(dep) as any, parentChain) as any
            } else if (isConfiguration(dep)) {
                // Resolving dependencies
                let deps = []
                for (const d of dep.deps) {
                    deps.push(await this.getWithModule(this.transformReferences(d) as any, parentChain))
                }
                const dependency = await dep.generator(deps)
                this.#dependencies.set(key, dependency)
                return dependency
            } else if (typeof dep === 'object' && 'ref' in dep) {
                const res: Dependencies[K] = await this.getWithModule(this.transformReferences(dep) as DependencyInfo, parentChain)
                this.#dependencies.set(key, res)
                return res
            } else {
                this.#dependencies.set(key, dep)
                return dep
            }
        }

        // We need to go deeper
        const [module, ...rest] = key.split('.')
        if (rest.length <= 0) {
            throw new Error('Dependency not found: ' + key + ` (for ${this.#currentModule.toString()})`)
        }
        const subKey = rest.join('.')
        return this.getModule(module).getWithModule(subKey, [this, ...parentChain])
    }

    private async getWithModule<const K extends keyof D & string>(conf: K | DependencyInfo, parentChain: Container<any>[] = []): Promise<D[K]> {
        let { module, key } = typeof conf === 'string' ? {
            module: this.#currentModule, key: conf
        } : {
            module: conf[MODULE_KEY],
            key: conf.ref
        }

        if (module === this.#currentModule) {
            return this.getDependencyInstance(key, parentChain) as D[K]
        }
        // We need to go up the tree?
        const matchingParent = parentChain.find(p => p.#currentModule === module)
        if (matchingParent) {
            return matchingParent.getWithModule(conf, parentChain) // FIXME: we should probably cut chain to the parent's index here.
        }
        throw new Error('Module not found for: ' + key)
    }

    async get<const K extends keyof D & string>(key: K): Promise<D[K]> {
        return this.getWithModule(key)
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