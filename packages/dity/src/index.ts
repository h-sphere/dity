import { buildContainer, ContainerBuilder } from "./builder";
import { Container } from './container'
import { makeInjector, DI_KEY } from "./injector";
import { asClass, asFactory, asValue, asFunction } from './wrappers'
import { inspect } from "./inspector";

// Core API
export {
    buildContainer,
    makeInjector,
    asClass, asFactory, asValue, asFunction,
    Container,
    ContainerBuilder,
    inspect,
    DI_KEY
}

// Error types for better error handling
export { DependencyError, ModuleError, CircularDependencyError } from './errors'

// Type utilities
export type { Configuration } from './wrappers'
export type { Dependencies } from './container'