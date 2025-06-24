# Markdown Extension Examples

This page demonstrates some of the built-in markdown extensions provided by VitePress.

## Syntax Highlighting

VitePress provides Syntax Highlighting powered by [Shiki](https://github.com/shikijs/shiki), with additional features like line-highlighting:

**Input**

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
<!-- 
```ts twoslash
import { containerBuilder } from './src/index'

const helper = containerBuilder('helper', c => c.register({
  currentDate: () => Date.now(),
  sthElse: '555'
}))

const config = containerBuilder('config', c => c.register({
  env: 'production',
  dbUrl: 'dsakfjhaslfjsfa'
}))

const module = containerBuilder('main', c => c.register({
  a: 5,
  b: 'hello world'
}).registerSubmodule({ helper, config }))

const container = module()
const a = await container.get('a')
//                             ^|
``` -->