import type * as babel from "@babel/core"
import type { CallExpression } from "@babel/types"

const pipeModules = ["@fp-ts/data/Function"]

export default function plugin({ types: t }: typeof babel): babel.PluginObj {
  return {
    name: "pipe",
    visitor: {
      CallExpression(path: babel.NodePath<CallExpression>) {
        const callee = path.node.callee
        if (t.isIdentifier(callee) && callee.name === "pipe") {
          const binding = path.scope.getBinding("pipe").path.parent
          if (
            t.isImportDeclaration(binding) &&
            pipeModules.includes(binding.source.value)
          ) {
            const args = path.node.arguments
            let newCall = args[0]
            for (let i = 1; i < args.length; i++) {
              newCall = t.callExpression(args[i], [newCall])
            }
            path.replaceWith(newCall)
          }
        }
      }
    }
  }
}
