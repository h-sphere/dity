/**
 * Ergonomic helper functions and utility types for DITy
 */

import { buildContainer, ContainerBuilder } from './builder'
import { asValue, asClass, asFactory, asFunction, Configuration } from './wrappers'
import { Container } from './container'

/**
 * Utility types for better type inference
 */
export type InferDependencies<T> = T extends Container<infer D> ? D : never
export type InferModuleDependencies<T> = T extends ContainerBuilder<infer D, unknown, unknown> ? D : never

/**
 * Helper for creating simple value modules
 */
export function createValueModule<T extends Record<string, unknown>>(values: T) {
    return buildContainer(c => c.register(
        Object.fromEntries(
            Object.entries(values).map(([key, value]) => [key, asValue(value)])
        ) as { [K in keyof T]: Configuration<T[K]> }
    ))
}

/**
 * Helper for creating service modules with class-based dependencies
 */
export function createServiceModule<T extends Record<string, new (...args: unknown[]) => unknown>>(services: T) {
    return buildContainer(c => c.register(
        Object.fromEntries(
            Object.entries(services).map(([key, ServiceClass]) => [key, asClass(ServiceClass)])
        ) as { [K in keyof T]: Configuration<InstanceType<T[K]>> }
    ))
}

/**
 * Helper for creating factory modules
 */
export function createFactoryModule<T extends Record<string, new () => { make(...args: unknown[]): unknown }>>(factories: T) {
    return buildContainer(c => c.register(
        Object.fromEntries(
            Object.entries(factories).map(([key, FactoryClass]) => [key, asFactory(FactoryClass)])
        )
    ))
}

/**
 * Helper for creating function-based modules
 */
export function createFunctionModule<T extends Record<string, (...args: unknown[]) => unknown>>(functions: T) {
    return buildContainer(c => c.register(
        Object.fromEntries(
            Object.entries(functions).map(([key, fn]) => [key, asFunction(fn)])
        ) as { [K in keyof T]: Configuration<ReturnType<T[K]>> }
    ))
}

/**
 * Fluent API for common module composition patterns
 */
export class ModuleComposer<D extends Record<string, unknown> = {}, U extends Record<string, unknown> = {}> {
    constructor(private builder: ContainerBuilder<D, U>) {}

    /**
     * Add values to the module
     */
    withValues<T extends Record<string, unknown>>(values: T) {
        const valueConfigs = Object.fromEntries(
            Object.entries(values).map(([key, value]) => [key, asValue(value)])
        ) as { [K in keyof T]: Configuration<T[K]> }
        
        return new ModuleComposer(this.builder.register(valueConfigs))
    }

    /**
     * Add services to the module
     */
    withServices<T extends Record<string, new (...args: unknown[]) => unknown>>(services: T) {
        const serviceConfigs = Object.fromEntries(
            Object.entries(services).map(([key, ServiceClass]) => [key, asClass(ServiceClass)])
        ) as { [K in keyof T]: Configuration<InstanceType<T[K]>> }
        
        return new ModuleComposer(this.builder.register(serviceConfigs))
    }

    /**
     * Add factories to the module
     */
    withFactories<T extends Record<string, new () => { make(...args: unknown[]): unknown }>>(factories: T) {
        const factoryConfigs = Object.fromEntries(
            Object.entries(factories).map(([key, FactoryClass]) => [key, asFactory(FactoryClass)])
        )
        
        return new ModuleComposer(this.builder.register(factoryConfigs))
    }

    /**
     * Add external dependencies
     */
    withExternals<T extends Record<string, unknown>>() {
        return new ModuleComposer(this.builder.externals<T>())
    }

    /**
     * Add submodules
     */
    withSubmodules<T extends Record<string, unknown>>(submodules: T) {
        return new ModuleComposer(this.builder.submodules(submodules))
    }

    /**
     * Export dependencies
     */
    exporting<T extends keyof D>(...exports: T[]) {
        return new ModuleComposer(this.builder.exports(...exports))
    }

    /**
     * Build the final module
     */
    build() {
        return buildContainer(c => this.builder)
    }

    /**
     * Get the underlying builder for advanced usage
     */
    getBuilder() {
        return this.builder
    }
}

/**
 * Start composing a new module
 */
export function composeModule(name: string = 'composed-module'): ModuleComposer {
    return new ModuleComposer(new ContainerBuilder(name))
}

/**
 * Create a testing module with easy mocking
 */
export function createTestModule<T extends Record<string, unknown>>(mocks: T) {
    return createValueModule(mocks)
}

/**
 * Utility for type-safe dependency key extraction
 */
export function getDependencyKeys<T extends Container<unknown>>(container: T): Array<keyof InferDependencies<T>> {
    // This is primarily for type-level usage
    return [] as Array<keyof InferDependencies<T>>
}

/**
 * Create a configuration object directly (advanced usage)
 */
export function createConfiguration<T>(generator: () => T, dependencies: string[] = []): Configuration<T> {
    return {
        generator: () => generator(),
        deps: dependencies.map(dep => ({ ref: dep }))
    }
}