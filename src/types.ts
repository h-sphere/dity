import { Extern, ResolveExtern } from "./utils";

export type ArgsToDeps<DEPS extends Record<string, any>, K extends Array<keyof DEPS | Extern<any, any>>> = {
    [I in keyof K]: K[I] extends keyof DEPS ? DEPS[K[I]] : ResolveExtern<K[I]>
}