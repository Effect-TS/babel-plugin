/**
 * @since 1.0.0
 */
import type * as babel from "@babel/core"
import type { Binding } from "@babel/traverse"

/**
 * The configuration options for `@effect/babel-plugin`.
 *
 * @since 1.0.0
 * @category models
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

const targetImports = ["@fp-ts/core/Function"]

const defaultOptions: Required<PluginConfig> = {
  rewritePipe: {
    targetImports
  },
  rewriteIdentity: {
    targetImports
  }
}

const plugin = ({ types: t }: typeof babel, options: PluginConfig): babel.PluginObj<PluginConfig> => {
  const rewritePipeConfig = options.rewritePipe ?? defaultOptions.rewritePipe
  const rewriteIdentityConfig = options.rewriteIdentity ?? defaultOptions.rewriteIdentity
  return {
    name: "fp-ts",
    visitor: {
      Program: {
        exit: (path) => {
          removeUnusedImports(path, t)
        }
      },
      CallExpression: {
        enter: (path) => {
          if (typeof rewritePipeConfig === "object") {
            rewritePipe(path, t, rewritePipeConfig.targetImports)
          }
          if (typeof rewriteIdentityConfig === "object") {
            rewriteIdentity(path, rewriteIdentityConfig.targetImports)
          }
        }
      }
    }
  }
}

/**
 * The `@effect/babel-plugin` plugin.
 *
 * @since 1.0.0
 * @category plugin
 */
export default plugin

const removeUnusedImports = (
  path: babel.NodePath<babel.types.Program>,
  t: typeof babel.types
): void => {
  const unRefBindings = new Map<string, Binding | undefined>()

  for (const [_, binding] of Object.entries(path.scope.bindings)) {
    if (binding.path.parentPath == null || binding.kind !== "module") {
      continue
    }

    // Filter out any nodes that are not import declarations
    const node = binding.path.parentPath.node
    if (!t.isImportDeclaration(node)) {
      continue
    }

    // Construct the binding map key
    const importName = node.source.value
    const line = node.source.loc != null ? node.source.loc.start.line : 0
    const column = node.source.loc != null ? node.source.loc.start.column : 0
    const key = `${importName}(${line}:${column})`

    // Set the binding to de-reference if necessary
    if (!unRefBindings.has(key)) {
      unRefBindings.set(key, binding)
    }

    // Remove the binding if it is referenced
    if (binding.referenced) {
      unRefBindings.set(key, undefined)
    } else {
      // Otherwise check if it can be removed
      const bindingNode = binding.path.node
      if (t.isImportSpecifier(bindingNode)) {
        binding.path.remove()
      } else if (t.isImportDefaultSpecifier(bindingNode)) {
        binding.path.remove()
      } else if (t.isImportNamespaceSpecifier(bindingNode)) {
        binding.path.remove()
      } else if (binding.path.parentPath != null) {
        binding.path.parentPath.remove()
      }
    }
  }

  unRefBindings.forEach((binding) => {
    if (binding != null && binding.path.parentPath != null) {
      binding.path.parentPath.remove()
    }
  })
}

/**
 * The objective of this Babel transformer is to improve the performance of
 * pipeable APIs by re-writing calls to `pipe` at compile time to directly call
 * the piped methods.
 *
 * Concretely, this results in the following code example:
 *
 * ```ts
 * pipe(a, f(() => b), g(() => c))
 * ```
 *
 * being transformed into direct calls to the previously piped functions:
 *
 * ```ts
 * g(() => c)(f(() => b)(a))
 * ```
 *
 * Calls to `pipe` are considered `CallExpression`s in the Babel AST.  To ensure
 * that all calls to pipe are re-written correctly, the following cases must be
 * handled:
 *
 *   1. When `pipe` is imported as a variable from a module and referenced as an
 *      `Identifier` in the AST
 *   2. When `pipe` is imported as a namespace from a module and referenced as
 *      part of a `MemberExpression`
 */
const rewritePipe = (
  path: babel.NodePath<babel.types.CallExpression>,
  t: typeof babel.types,
  pipeImports: ReadonlyArray<string>
): void => {
  // Get the `callee` of the `CallExpression`
  const callee = path.get("callee")

  // Check if the `callee` references `pipe`
  const calleeReferencesPipe = pipeImports.some((module) => {
    return callee.referencesImport(module, "pipe")
  })

  if (calleeReferencesPipe) {
    // Build a new `CallExpression` from the arguments to `pipe`
    const args = path.node.arguments
    let newCall = args[0]
    if (newCall == null) return
    for (let i = 1; i < args.length; i++) {
      const arg = args[i] as babel.types.CallExpression
      if (arg != null) {
        newCall = t.callExpression(arg, [newCall])
      }
    }

    // Replace the call to `pipe` with the new `CallExpression`
    path.replaceWith(newCall)

    // De-reference the import binding to decrement the import's reference count
    dereferenceCallExpressionBindings(path, callee, "pipe")
  }
}

/**
 * The objective of this Babel transformer is to improve the performance of
 * pipeable APIs by re-writing calls to `identity` at compile time to remove
 * them entirely
 *
 * Concretely, this results in the following code example:
 *
 * ```ts
 * const test = identity(a)
 * ```
 *
 * being transformed to remove calls to `identity`:
 *
 * ```ts
 * const test = a
 * ```
 *
 * Calls to `identity` will also be removed when part of a `pipe` call:
 *
 * ```ts
 * pipe(a, identity, f(() => b))
 * ```
 *
 * will be transformed to:
 *
 * ```ts
 * const test = f(() => b)(a);
 * ```
 */
const rewriteIdentity = (
  path: babel.NodePath<babel.types.CallExpression>,
  identityImports: ReadonlyArray<string>
): void => {
  // Get the `callee` of the `CallExpression`
  const callee = path.get("callee")
  // Check if the `callee` references `identity`
  const calleeReferencesIdentity = identityImports.some((module) => {
    return callee.referencesImport(module, "identity")
  })

  if (calleeReferencesIdentity) {
    // Get the first (and only) argument to `identity`
    const value = path.node.arguments[0]
    if (value == null) {
      throw path.buildCodeFrameError("`identity` requires a single argument")
    }

    // Replace the call to `identity(a)` with just the value `a`
    path.replaceWith(value)

    // De-reference the import binding to decrement the import's reference count
    dereferenceCallExpressionBindings(path, callee, "identity")
  }
}

const dereferenceCallExpressionBindings = (
  path: babel.NodePath<babel.types.CallExpression>,
  callee: babel.NodePath<babel.types.V8IntrinsicIdentifier | babel.types.Expression>,
  bindingName: string
) => {
  // De-reference the import binding to decrement the import's reference
  // count
  if (callee.isIdentifier()) {
    const binding = path.scope.getBinding(bindingName)
    binding?.dereference()
  } else if (callee.isMemberExpression()) {
    const object = callee.get("object")
    if (object.isIdentifier()) {
      const binding = object.scope.getBinding(object.node.name)
      binding?.dereference()
    }
  }
}
