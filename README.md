# dity
![Dity Logo](./docs/public/dity.svg)

**D**ependency **I**njection. **Ty**ped.

## Motivation
Dependency Injection helps organise your code but often introduces new problems. Due to the nature of dependencies being dynamic and loose, it negates some of the biggest strengths of using typed language. It moves some type checks into the execution time, which in turn makes the code more error-prone. Moreover, in big applications it is hard to track your dependencies tree, especially if you want to keep your dependency lazy.
What if you could use Dependency Injection without compromising on static typing?

DITy interface is similar to other popular IC/DI libraries but enforces decorators typings. Thanks to that you get extra layer of certainty that your code will compile and run.
Moreover, by enabling modularity by default, it solves problem of defining and testing cross-module dependencies. Modules can be composed together and cross module communication is clearly defined by requiring explicit exports (to be implemented).

## Main features
- Full Dependency Injection typing using smart decorators
- Easy mocking of foreign dependencies
- Static typing of foreign dependency types and method to check their presence in runtime (but without instatiating).
- Ability to inject classes, factories, functions and constants
- (Future): Dependency tree generation
- (Future): Lifecycle configuration for modules and dependencies