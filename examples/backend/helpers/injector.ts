import { GetContainerTypes, makeClassInjector, makeFunctionInjector, makeInjector } from "../../src/di"
import type { HELPER_DEPS } from "."
export const MODULE_NAME = 'helpers'
export const helperInjector = makeInjector<HELPER_DEPS>(MODULE_NAME)
type T<KEY extends keyof GetContainerTypes<HELPER_DEPS>> = GetContainerTypes<HELPER_DEPS>[KEY]

export const classInjector = makeClassInjector<GetContainerTypes<HELPER_DEPS>>(MODULE_NAME)
export const functionInjector = makeFunctionInjector<GetContainerTypes<HELPER_DEPS>>(MODULE_NAME)