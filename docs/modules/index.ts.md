---
title: index.ts
nav_order: 1
parent: Modules
---

## index overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [PluginConfig (interface)](#pluginconfig-interface)

---

# models

## PluginConfig (interface)

The configuration options for `@effect/babel-plugin`.

**Signature**

```ts
export interface PluginConfig {
  /**
   * Rewrites calls to `pipe` to directly call the piped functions.
   *
   * By default, the plugin will only rewrite calls to `pipe` imported from
   * `@fp-ts/core/Function`. However, the `targetImports` configuration option
   * can be used to allow the plugin to rewrite calls to `pipe` imported from
   * custom paths.
   */
  readonly rewritePipe?:
    | false
    | {
        targetImports: ReadonlyArray<string>
      }
  /**
   * Rewrites calls to `identity` to remove them entirely.
   *
   * By default, the plugin will only rewrite calls to `identity` imported from
   * `@fp-ts/core/Function`. However, the `targetImports` configuration option
   * can be used to allow the plugin to rewrite calls to `identity` imported
   * from custom paths.
   */
  readonly rewriteIdentity?:
    | false
    | {
        targetImports: ReadonlyArray<string>
      }
}
```

Added in v1.0.0
