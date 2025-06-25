# Externals
**dity** allows for defining externals in your modules to allow for references to values in other modules or to values that are resolved from different context. You cannot instantiate **dity** container unless you resolve all the externals (both of the module and all it's submodules). The checks are done on the type level, thanks to that if you introduce new external, you will get type error unless you resolve it. Thanks to that **dity** helps you find majority of the issues with missing dependencies before runtime.

## How to resolve external dependency
There are several ways for resolving dependency:
- Provide dependency key to bind them together. All keys are statically checked on type level, so if you remove dependency you are using as a resolution, you will get type errors everywhere this dependency has been used
- Provide dependency value directly. Note: if you provide simple string value, you need to wrap it with `asValue` to prevent confusion with dependecy keys
- Resolve it inside `.build()` method call.