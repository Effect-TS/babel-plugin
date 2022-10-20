import plugin from "@repo-tooling/babel-plugin"
import pluginTester from "babel-plugin-tester"

pluginTester({
  plugin,
  pluginName: "fp-ts",
  tests: {
    "should rewrite pipe and remove the import": {
      code: `
        import { pipe } from "@fp-ts/data/Function"
        const test = pipe(a, map(() => b))
      `,
      output: "const test = map(() => b)(a);"
    }
    // TODO: figure out how to remove namespaced pipe imports
    // "should remove namespaced pipe imports": {
    //   code: `
    //     import * as F from "@fp-ts/data/Function"
    //     const test = F.pipe(a, map(() => b))
    //   `,
    //   output: "const test = map(() => b)(a);"
    // }
  }
})
