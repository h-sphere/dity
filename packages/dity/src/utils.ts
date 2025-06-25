export const MODULE_KEY = Symbol('MODULE_KEY')

export interface DependencyInfo {
    ref: string,
    [MODULE_KEY]: Symbol
}