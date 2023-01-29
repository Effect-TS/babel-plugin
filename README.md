# @effect/babel-plugin <!-- omit in toc -->

- [Why?](#why)
- [Installation](#installation)
- [Usage](#usage)
  - [Via `.babelrc` (Recommended)](#via-babelrc-recommended)
  - [Via CLI](#via-cli)
  - [Via Node API](#via-node-api)
- [Transformers](#transformers)
  - [Rewrite Pipe](#rewrite-pipe)
  - [Rewrite Identity](#rewrite-identity)

## Why?

This Babel plugin helps to improve the performance of functional code written with the `@fp-ts/*` and `@effect/*` ecosystem of libraries.

There are two transformers contained within this plugin:
- `rewritePipe`
- `rewriteIdentity`

## Installation

```sh
npm install -D @effect/babel-plugin
```

or

```sh
yarn add -D @effect/babel-plugin
```

or

```sh
pnpm install -D @effect/babel-plugin
```

## Usage

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["@effect/babel-plugin"]
}
```

### Via CLI

```sh
babel --plugins @effect/babel-plugin script.js
```

### Via Node API

```javascript
require('babel-core').transform('var inc = add(1)', {
  plugins: ['annotate-pure-calls'],
})
```

The following configuration options can also be passed to `@effect/babel-plugin`:

```ts
/**
 * The configuration options for `@effect/babel-plugin`.
 */
export interface PluginConfig {
  /**
   * Rewrites calls to `pipe` to directly call the piped functions.
   *
   * By default, the plugin will only rewrite calls to `pipe` imported from
   * `@fp-ts/core/Function`. However, the `targetImports` configuration option
   * can be used to allow the plugin to rewrite calls to `pipe` imported from
   * custom paths.
   */
  readonly rewritePipe?: false | {
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
  readonly rewriteIdentity?: false | {
    targetImports: ReadonlyArray<string>
  }
}
```

## Transformers

### Rewrite Pipe

The objective of this Babel transformer is to improve the performance of pipeable APIs by re-writing calls to `pipe` at compile time to directly call the piped methods.

Concretely, this results in the following code example:

```ts
pipe(a, f(() => b), g(() => c))
```

being transformed into direct calls to the previously piped functions:

```ts
g(() => c)(f(() => b)(a))
```

Calls to `pipe` are considered `CallExpression`s in the Babel AST.  To ensure that all calls to pipe are re-written correctly, the following cases are handled:

  1. When `pipe` is imported as a variable from a module and referenced as an `Identifier` in the AST
  2. When `pipe` is imported as a namespace from a module and referenced as part of a `MemberExpression`

### Rewrite Identity

The objective of this Babel transformer is to improve the performance of
pipeable APIs by re-writing calls to `identity` at compile time to remove
them entirely

Concretely, this results in the following code example:

```ts
identity(a)
```

being transformed to remove calls to `identity`:

```ts
a;
```

Calls to `identity` will also be removed when part of a `pipe` call:

```ts
pipe(a, identity, f(() => b))
```

will be transformed to:

```ts
f(() => b)(a);
```

