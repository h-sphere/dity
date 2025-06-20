import { SubmodulesRec } from "./builder"
import { DependencyInfo } from "./utils"
import { isConfiguration } from "./wrappers"

export type Dependencies = Record<string, any> // FIXME: BETTER TYPING HERE

export const constructorMethod = Symbol('constructor')

export class Container<T extends Dependencies = {}, S extends SubmodulesRec = {}, Deps extends Dependencies = {}> {
    #instances: Map<string, any> = new Map()
    #moduleInstances: Map<string, Container> = new Map()

    private getModule<const K extends string>(key: K) {
        if (this.#moduleInstances.has(key)) {
            console.log('HAS INSTANCE', this.#moduleInstances.get(key))
            return this.#moduleInstances.get(key)!
        }
        if (this.submodules[key]) {
            const sub = this.submodules[key]()
            console.log('NOT HAS INSTANCE, INSTANTIATING', sub)
            this.#moduleInstances.set(key, sub)
            return sub
        }
        throw new Error('Module not found: ' + key + ` (for ${this._key})`)
    }

    private async getInstance<K extends string>(key: K, parentChain: Container[] = []) {
        if (this.#instances.has(key)) {
            return this.#instances.get(key)!
        }
        if (this.deps[key]) {
            const dep = await this.resolveDep(key, parentChain)
            this.#instances.set(key, dep)
            return dep
        }
        throw new Error('Dependency not found: ' + key)
    }

    private async resolveDep(key: string, parentChain: Container[] = []) {
        const dep = this.deps[key]
        if (isConfiguration(dep)) {
            console.log('RESOLVING DEPS OF', key, this._key, dep.deps, parentChain)
            const deps = await Promise.all(dep.deps.map(d => this.getFromInfo(d, parentChain)))
            console.log('DEPS', dep, 'resolved', deps)
            return dep.generator(deps)
        } else {
            return dep
        }
    }

    private constructor(private readonly _key: string, private readonly deps: T, private readonly submodules: S) {

    }

    static [constructorMethod]<Deps extends Dependencies, S extends SubmodulesRec, FinalDeps extends Dependencies>(key: string, registars: Deps, submodules: S) {
        return new Container<Deps, S, FinalDeps>(key, registars, submodules)
    }

    private splitForModule(key: string) {
        const [module, ...rest] = key.split('.')
        if (rest.length <= 0) {
            return {
                module: this._key,
                dependency: module
            }
        } else {
            return {
                module,
                dependency: rest.join('.')
            }
        }
    }

    private hasModule(key: string) {
        console.log('HAS MODULES', this._key, Object.keys(this.submodules))
        return Object.keys(this.submodules).includes(key)
    }

    private async getFromInfo(depInfo: DependencyInfo, parentChain: Container[]): Promise<any> {
        console.log('GET FROM INFO', depInfo, parentChain.map(p => p._key), this._key)
        if (depInfo.moduleName !== this._key) {
            // we need to resolve up
            const parentContainer = parentChain.find(p => p._key === depInfo.moduleName || p.hasModule(depInfo.moduleName))
            if (!parentContainer) {
                throw new Error(`External dependency not resolved: ${depInfo.dependencyKey} (for ${depInfo.moduleName}, called from ${this._key})`)
            }
            return parentContainer.getFromInfo(depInfo, []) // empty chain as it just got resolved
        }
        const { module, dependency } = this.splitForModule(depInfo.dependencyKey)
        if (module === this._key) {
            return this.getInstance(dependency, parentChain)
        }
        const mod = this.getModule(module)
        console.log('GOT MODULE FOR ', module, mod, this.submodules)
        return await mod.getFromInfo({
            ...depInfo,
            moduleName: mod._key, // WE NEED TO UPDATE MODULE
            dependencyKey: dependency
        }, [this, ...parentChain])
    }

    async get<K extends keyof Deps & string>(key: K): Promise<Deps[K]> {
        // FIXME: copy actual implementation
        return this.getFromInfo({
            _t: null,
            dependencyKey: key,
            moduleName: this._key,
            parameterIndex: 0 // Not important here.
        }, [])
    }
}