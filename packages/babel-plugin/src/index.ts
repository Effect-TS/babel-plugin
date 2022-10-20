import type * as babel from "@babel/core"
import type { Binding } from "@babel/traverse"

const pipeModules = ["@fp-ts/data/Function"]

/**
 * The objective of this Babel plugin is to improve the performance of pipeable
 * APIs by re-writing calls to `pipe` at compile time to be directly call the
 * piped methods.
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
export default function plugin({ types: t }: typeof babel): babel.PluginObj {
  return {
    name: "fp-ts",
    visitor: {
      Program: {
        exit: (path) => {
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
      },
      CallExpression: {
        enter: (path) => {
          // Get the `callee` of the `CallExpression`
          const callee = path.get("callee")
          // Check if the `callee` references `pipe`
          const calleeReferencesPipe = pipeModules.some((module) => {
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

            // De-reference the import binding to decrement the import's reference
            // count
            if (callee.isIdentifier()) {
              const binding = path.scope.getBinding("pipe")
              binding?.dereference()
            } else if (callee.isMemberExpression()) {
              const object = callee.get("object")
              if (object.isIdentifier()) {
                const binding = object.scope.getBinding(object.node.name)
                binding?.dereference()
              }
            }
          }
        }
      }
    }
  }
}
