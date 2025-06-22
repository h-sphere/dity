import { setSymbol, Submodule } from "./builder"

export type Dependencies = Record<string, any> // FIXME: BETTER TYPING HERE

export const constructorMethod = Symbol('constructor')
export const registerExternals = Symbol('registerExternals')

const MODULE_KEY = Symbol('module_key')

interface DependencyInfo {
    ref: string,
    [MODULE_KEY]: Symbol
}

export type Configuration<T> = {
    generator: (args: any[]) => T,
    deps: DependencyInfo[]
}

export const isConfiguration = (k: any): k is Configuration<any> => {
    return !!k['generator']
}

export class Container<D extends Dependencies> {
    #dependencyDefinitions: Dependencies = {}
    #dependencies = new Map<keyof D, D[keyof D]>()

    #submoduleDefinitions: Record<string, Submodule<any, any>> = {}
    #submodules = new Map<string, Container<any>>()

    #currentModule: symbol

    constructor(deps: Dependencies, submodules: Record<string, Submodule<any, any>>, name: symbol = Symbol()) {
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

    private isValidKey(k: string): boolean {
        console.log('IS VALID KEY', k)
        const [module, ...rest] = k.split('.')
        if (rest.length <= 0) {
            // no submodules
            return module in this.#dependencyDefinitions 
        }

        try {
            console.log('MODULE', module)
            const mod = this.getModule(module)
            return mod.isValidKey(rest.join('.'))
        } catch (e) {
            console.log('error', e)
            return false
        }
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
            console.log('EXTERNALS', k, externals)
            const builder = (def as any)[setSymbol](Symbol(`Module ${k}`))
            const built: Container<any> = builder.build(externals)
            this.#submodules.set(k, built)
            return built
        }
        throw new Error('Module not found: ' + k)
    }

    private async getDependencyInstance<const K extends keyof D & string>(key: K, parentChain: Container<any>[]): Promise<D[K]> {
        console.log('GET DEPENDENCY INSTANCE', key, parentChain, this.#dependencies, this.#dependencyDefinitions)
        if (this.#dependencies.has(key)) {
            return this.#dependencies.get(key)!
        }
        if (key in this.#dependencyDefinitions) {
            const dep = this.#dependencyDefinitions[key]
            console.log('found in dep defs', dep)
            // FIXME: if is configuration, resolving config
            if (isConfiguration(dep)) {
                console.log('is config', dep)
                // Resolving dependencies
                const deps = await Promise.all(dep.deps.map((d: DependencyInfo) => this.getWithModule(this.transformReferences(d) as any)))
                const dependency = dep.generator(deps)
                this.#dependencies.set(key, dependency)
                return dependency
            } else if (
                // FIXME: instead of this we need to check if string value can be resolved as a key.
                (typeof dep === 'string' && this.isValidKey(dep)) // string definition
                || (typeof dep === 'object' && 'ref' in dep && this.isValidKey(dep.ref))
            ) {
                console.log('is ref')
                // We have dependency that is refering to other key.
                console.log(`Key ${key} references to`, this.transformReferences(dep))
                const res: Dependencies[K] = await this.getWithModule(this.transformReferences(dep) as DependencyInfo)
                this.#dependencies.set(key, res)
                return res
            } else {
                console.log('none of the above')
                this.#dependencies.set(key, dep)
                return dep
            }
        }

        // We need to go deeper
        const [module, ...rest] = key.split('.')
        if (rest.length <= 0) {
            console.log('DEPENDENCIES FOR', this.#currentModule, this.#dependencies, this.#dependencyDefinitions)
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
    }
}


// export class Container<T extends Dependencies = {}, S extends SubmodulesRec = {}, Deps extends Dependencies = {}, Externals extends Record<string, any> = {}> {
//     #instances: Map<string, any> = new Map()
//     #moduleInstances: Map<string, Container> = new Map()

//     private getModule<const K extends string>(key: K) {
//         console.log('---GETTING MODULE ', key)
//         if (this.#moduleInstances.has(key)) {
//             console.log('--- MODULE INSTANTIATED')
//             return this.#moduleInstances.get(key)!
//         }
//         if (this.submodules[key]) {
//             console.log('--- MODULE DEFINITION EXISTS')
//             let sub = this.submodules[key] as any
//             if ('resolve' in sub) {
//                 console.log('IT HAS SOME RESOLVERS STILL WAITING', this.deps, key)
//                 // We take all externals and resolve them one by one.
//                 sub = Object.entries(this.deps)
//                     .filter(([depKey, val]) => depKey.startsWith(`${key}.`))
//                     .map(([depKey, value]) => ([depKey.substring(key.length + 1), value]))
//                     .reduce((c, [key, val]) => {
//                         console.log('ADDING RESOLVER', key, val)
//                         return c.resolve(key, val)
//                     }, sub)()
//             }

//             // const sub = (this.submodules[key] as any)() // FIXME: this should be fixed, the submodule might not be fully resolved by now and we need to provide extra data in there.
//             this.#moduleInstances.set(key, sub)
//             return sub
//         }
//         throw new Error('Module not found: ' + key + ` (for ${this._key})`)
//     }

//     private [registerExternals]<D extends Record<keyof Deps, any>>(d: D) {
//         // Note: The order here is important. We DO NOT want to override any dependencies, just add new external. The issue might arise when we had dependencies in the parent which are different
//         this.deps = {
//             ...d,
//             ...this.deps
//         }
//     }

//     private async getInstance<K extends string>(key: K, parentChain: Container[] = []) {
//         if (this.#instances.has(key)) {
//             return this.#instances.get(key)!
//         }
//         if (this.deps[key]) {
//             const dep = await this.resolveDep(key, parentChain)
//             this.#instances.set(key, dep)
//             return dep
//         }
//         throw new Error('Dependency not found: ' + key)
//     }

//     private async resolveDep(key: string, parentChain: Container[] = []) {
//         const dep = this.deps[key]
//         if (isConfiguration(dep)) {
//             const deps = await Promise.all(dep.deps.map(d => this.getFromInfo(d, parentChain)))
//             return dep.generator(deps)
//         } else {
//             return dep
//         }
//     }

//     private constructor(private readonly _key: string, private deps: T, private readonly submodules: S) {

//     }

//     static [constructorMethod]<Deps extends Dependencies, S extends SubmodulesRec>(dependencies: Dependencies, )
//         return new Container<Deps, S, FinalDeps, Externals>(key, registars, submodules)
//     }

//     private splitForModule(key: string) {
//         const [module, ...rest] = key.split('.')
//         if (rest.length <= 0) {
//             return {
//                 module: this._key,
//                 dependency: module
//             }
//         } else {
//             return {
//                 module,
//                 dependency: rest.join('.')
//             }
//         }
//     }

//     private hasModule(key: string) {
//         return Object.keys(this.submodules).includes(key)
//     }

//     private async getFromInfo(depInfo: DependencyInfo, parentChain: Container[]): Promise<any> {
//         if (depInfo.moduleName !== this._key) {
//             // we need to resolve up
//             const parentContainer = parentChain.find(p => p._key === depInfo.moduleName || p.hasModule(depInfo.moduleName))
//             if (!parentContainer) {
//                 throw new Error(`External dependency not resolved: ${depInfo.dependencyKey} (for ${depInfo.moduleName}, called from ${this._key})`)
//             }
//             return parentContainer.getFromInfo(depInfo, []) // empty chain as it just got resolved
//         }
//         const { module, dependency } = this.splitForModule(depInfo.dependencyKey)
//         if (module === this._key) {
//             return this.getInstance(dependency, parentChain)
//         }
//         const mod = this.getModule(module)
//         return await mod.getFromInfo({
//             ...depInfo,
//             moduleName: mod._key, // WE NEED TO UPDATE MODULE
//             dependencyKey: dependency
//         }, [this, ...parentChain])
//     }

//     async get<K extends keyof Deps & string>(key: K): Promise<Deps[K]> {
//         // FIXME: copy actual implementation
//         return this.getFromInfo({
//             _t: null,
//             dependencyKey: key,
//             moduleName: this._key,
//             parameterIndex: 0 // Not important here.
//         }, [])
//     }
// }