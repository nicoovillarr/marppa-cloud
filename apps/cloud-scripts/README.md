# MCP - Cloud Scripts

## AppContainer — DI container internals

`src/app/container.ts` wires the application using [Awilix](https://github.com/jeffijoe/awilix) in `PROXY` injection mode. Entry point is `AppContainer.build()`, which returns `{ container, modules }`.

### Token key mapping

Awilix requires string keys. Symbols and class constructors used as `ProviderToken`s are mapped to stable string keys via identity-based maps (`_symKeys`, `_clsKeys`) — never by name or description, so minification and duplicate class names are safe.

`_freshKey()` generates internal keys for registrations that have no external token (processors, module instances). It must never be used for `ProviderToken`s.

`REGISTRY_KEY` is the stable key for `ProcessorRegistry`, computed once at class initialization and registered as a plain value after all providers are wired.

### Parameter resolution (`_resolveParamTokens`)

All constructor parameters are injected. Token sources, in priority order:

1. `@Inject(token)` per-param annotation — takes precedence
2. `design:paramtypes` reflected type — requires `emitDecoratorMetadata`

If a reflected type resolves to `Object`, the TypeScript type was erased at runtime (interface, type alias, generic, `any`). The error message will tell you to add `@Inject(token)` to that parameter.

Parameter count is `max(reflected length, highest @Inject index + 1)` — no heuristics.

### Class resolver (`_makeClassResolver`)

Uses Awilix `PROXY` mode: each `asFunction` factory receives the full cradle as its single argument. Dependencies are looked up by string key explicitly. `CLASSIC` mode would destructure by parameter name, which conflicts with token-keyed resolution.

### Module graph collection (`_buildGraph`)

Walks the module import tree depth-first, collecting providers, processors, and sub-modules. Keys for processors and modules are generated during this traversal so that `_validateGraph` has the complete registration picture before any Awilix registration occurs. The root module itself is not added to the module list (it is never instantiated as a sub-module).

### Dependency graph validation (`_validateGraph`)

Runs before any Awilix registration. Checks:

- No duplicate provider tokens
- No duplicate processors for the same event type
- All constructor parameters of `useClass` providers, processors, and sub-modules refer to known tokens
- No circular provider dependencies (three-color DFS over the provider dependency graph)

Known tokens are: all registered provider tokens + `REGISTRY_KEY`. Processors and sub-modules are internal instances with no external token — they are not injectable by other providers and are excluded from the known set.

`useFactory` providers are excluded from static dependency analysis: their captured closures are opaque and cannot be introspected.

### Bootstrap order (`build`)

1. Collect and validate the module graph.
2. Register all providers.
3. Resolve all processors immediately, hand them to `ProcessorRegistry`, then register the registry as a value. Internal processor keys are never externally resolved.
4. Register and resolve sub-modules (after all providers and `ProcessorRegistry` are wired, so sub-modules can inject the registry).
5. Return `{ container, modules }`.
