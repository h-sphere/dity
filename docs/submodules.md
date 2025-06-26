# Submodules
**dity** allows for easy definition of the submodules. Any module can be passed to other modules submodules. This also allows to resolve all externals with parent's dependencies or dependencies from any other submodules.

## Basic example

```ts twoslash
import { buildContainer } from '@hypersphere/dity'

const submodule = buildContainer(c => c.register({
    subA: 5,
    subB: 'hello',
    subC: 'fsadsdasdas'
}))

const module = buildContainer(c => c.register({
  a: 5,
  b: 'hello world',
  'c': new Date()
}).submodules({ submodule }))

const container = module.build()

// ℹ️ Container results are properly typed
const a = await container.get('a')
//                             ^|
```

Note that parent container can access all fields of the submodule using the dot (`.`) notation. Thanks to that you can compose simple modules into more complex ones. You can also create and publish independently utility modules to be reused in your main application.

## Resolving submodule externals
By composing submodules we can create cross-module references by still keeping module separate and testable. Let's see the following example:

```ts twoslash
// @errors: 7022 7024 2304 234
import { buildContainer, makeInjector, asClass } from '@hypersphere/dity'

const db = buildContainer(c => c.register({
    db: asClass(Db)
}).externals<{
    dbUrl: string,
    env: string
}>())

const dbInject = makeInjector<typeof db>()

@dbInject([
    'dbUrl',
    'env'
])
class Db {
    constructor(url: string, env: string) { }
}

const config = buildContainer(c => c.register({
    dbUrl: 'user@localhost',
    env: 'production'
}))

const module = buildContainer(c => c.register({
  /** our main module deps */
}).submodules({ db, config }))
.resolve('db.dbUrl', 'config.dbUrl')
.resolve('db.env', 'config.env')

const container = module.build()

// ℹ️ Container results are properly typed
const database = await container.get('db.db')
//                                    ^|
```

More details about external resolutions and direction of the resolutions in the next document.