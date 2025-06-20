import type { MAIN_DEPS } from "."
import { DependencyInfo, Extern, GetContainerTypes, makeInjector } from "../../src/di"

export const MODULE_NAME = 'main'
export const mainInjector = makeInjector<MAIN_DEPS>(MODULE_NAME)

type TYPES = GetContainerTypes<MAIN_DEPS>


export const extern = <const K extends keyof TYPES>(k: K) => ({
    dependencyKey: k as string,
    moduleName: MODULE_NAME 
}) as Extern<K, TYPES[K]>