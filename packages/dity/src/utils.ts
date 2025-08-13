export const MODULE_KEY = Symbol('MODULE_KEY')
export const INJECTOR_PLACEHOLDER = Symbol('INJECTOR_PLACEHOLDER')

export interface DependencyInfo {
	ref: string
	[MODULE_KEY]: Symbol
}
