# Introduction

**dity** is a TypeScript dependency injection and application organisation library aiming to provide extremely simple yet powerful interface.

## Why yet another DI library?
There are plenty amazing DI libraries in the TypeScript ecosystem. Unfortunately, the all have similar issues and after struggling with some limitations, I decided to implement dity.
The main issue with using DI with TypeScript is the fact of loosing some level of type safety. Because you pass reponsibility of managing your injected objects to the DI library, it naturally relaxes type safety. Most DI libraries allow to define dependencies but never solve them, which shifts a lot of type checking responsibility to the runtime.
**dity**'s approach is different. I want to guarantee as much as possible that there are no types mismatches on the compilation level. All dependencies needs to be resolved before the container is resolved and all the checks are done on the type level.
Another adventage of **dity** is ability to define `externals`. This allows to rely on other module's dependencies without having to refer them directly. All relationships between modules are easily inspectable. This helps inspect your codebase clearer and even create interactive visualisations to help with both technical and bussiness requirements, analyse team topologies and much more.
The `@dity/graph` helps with visualising the structure easily.


## Example
Here's a simple example how to get started with basic dependency injection. Note that all keys in `.get` method are fully typed. The resulting value is also automatically resolved.

```ts twoslash
import { buildContainer } from './src/builder'

const module = buildContainer(c => c.register({
  a: 5,
  b: 'hello world'
}))

const container = module.build()

// ℹ️ Container results are properly typed
const a = await container.get('a')
//    ^?




// Autocomplete shows all available keys
const res = await container.get('b')
//                               ^|




 
```