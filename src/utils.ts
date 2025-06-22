import { ContainerBuilderFunction, ContainerBuilderWithUnresolvedExternals, SubmodulesRec } from "./builder";
import { Dependencies } from "./container";
import { GetContainerTypes } from "./injector";

export interface DependencyInfo<K extends string = string, TYPE = null> {
  parameterIndex: number,
  dependencyKey: K,
  moduleName: string
  _t: TYPE
}

export type Extern<T extends string, SecondType> = Omit<DependencyInfo<T, SecondType>, 'parameterIndex'>
export type ResolveExtern<E> = E extends Extern<string, infer Second> ? Second : never

export function makeExtern<const B>(moduleName: string) {
  type Deps = GetContainerTypes<B>
  return function extern<const K extends keyof Deps & string>(k: K) {
    return {
      dependencyKey: k as string,
      moduleName: moduleName
    } as Extern<K, Deps[K]>
  }
}
type Prettify<T> = {
  [K in keyof T]: T[K]
} & {};

type Strinfgify<K extends string | number | undefined | symbol> = K extends string ? `${K}` : ''

type GetKeys<C extends ContainerBuilderFunction | ContainerBuilderWithUnresolvedExternals> = 
  C extends ContainerBuilderFunction<Dependencies, any, infer T> ?
    T
  : C extends ContainerBuilderWithUnresolvedExternals<Dependencies, any, infer T>
    ? T : never

  type GetExternals<C extends ContainerBuilderFunction | ContainerBuilderWithUnresolvedExternals> = 
  C extends ContainerBuilderFunction<Dependencies, any, any, infer T> ?
    T
  : C extends ContainerBuilderWithUnresolvedExternals<Dependencies, any, any, infer T>
    ? T : never

type PrefixKeys<Prefix extends string, T> = {
  [K in keyof T as `${Prefix}.${Strinfgify<K>}`]: T[K]
}

type PrefixContainerKeys<Prefix extends string | number | undefined, C extends ContainerBuilderFunction | ContainerBuilderWithUnresolvedExternals> =
  PrefixKeys<Strinfgify<Prefix>, GetKeys<C>>

type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

export type SubModulesToKeys<S extends SubmodulesRec> = Prettify<UnionToIntersection<{
  [K in keyof S]: K extends string ? PrefixContainerKeys<K, S[K]> : never
}[keyof S]>>

export type SubModulesToExternalKeys<S extends SubmodulesRec> = Prettify<UnionToIntersection<{
  [K in keyof S]: K extends string ? PrefixKeys<Strinfgify<K>, GetExternals<S[K]>> : never
}[keyof S]>>
