import type * as babel from "@babel/core"
import type { Binding } from "@babel/traverse"

const pipeModules = ["@fp-ts/data/Function"]

export default function plugin({ types: t }: typeof babel): babel.PluginObj {
  return {
    name: "pipe",
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
          const callee = path.node.callee
          if (
            (t.isIdentifier(callee) && callee.name === "pipe") ||
            (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) && callee.property.name === "pipe"
          ) {
            const pipeBinding = path.scope.getBinding("pipe")
            if (pipeBinding != null) {
              const binding = pipeBinding.path.parent
              if (
                t.isImportDeclaration(binding) &&
                pipeModules.includes(binding.source.value)
              ) {
                console.log("HERE")
                const args = path.node.arguments
                let newCall = args[0]
                if (newCall != null) {
                  for (let i = 1; i < args.length; i++) {
                    const arg = args[i]
                    if (arg != null) {
                      newCall = t.callExpression(
                        arg as babel.types.CallExpression,
                        [newCall]
                      )
                    }
                  }
                  // Rewrite the call to `pipe`
                  path.replaceWith(newCall)
                  // De-reference the call to `pipe`
                  pipeBinding.dereference()
                }
              }
            }
          }
        }
      }
    }
  }
}
