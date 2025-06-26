# Defining the first module
You can define your module by using a builder. It allows to register constant values, class dependencies and externals. Once the module is defined *and all externals are resolved*, you can build and use it.

## Defining constants
To define constants use `.register` method:

```ts twoslash
import { buildContainer } from 'dity'

const module = buildContainer(c => c.register({
  a: 5,
  b: 'hello world'
}))

const container = module.build()

// ℹ️ Container results are properly typed
const a = await container.get('a')
//    ^?
```

## Defining class dependencies
To define class dependency, you need to wrap it constructor class with `asClass` function. You should also decorate it with all dependencies you want to resolve:

## Succesful resolution

```ts twoslash
import { buildContainer, makeInjector, asClass } from 'dity'

const module = buildContainer(c => c.register({
  a: 5,
  b: 'hello world',
  dep: asClass(ClassDep)
}))

const injector = makeInjector<typeof module>()

@injector([
    'a',
    'b'
])
class ClassDep {
    constructor(a: number, b: string) { }
}

const container = module.build()

// ℹ️ Container results are properly typed
const a = await container.get('a')
//    ^?
```

## Type error on type mismatch

```ts twoslash
// @errors: 1238
import { buildContainer, makeInjector, asClass } from 'dity'

const module = buildContainer(c => c.register({
  a: 5,
  b: 'hello world',
  dep: asClass(ClassDep)
}))

const injector = makeInjector<typeof module>()

@injector([
    'a',
    'b'
])
class ClassDep {
    constructor(a: number, b: number) { }
}

const container = module.build()

// ℹ️ Container results are properly typed
const a = await container.get('a')
//    ^?
```