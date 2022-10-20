import plugin from "@repo-tooling/babel-plugin"
import pluginTester from "babel-plugin-tester"

pluginTester({
  plugin,
  pluginName: "fp-ts",
  tests: {
    "should re-write named pipe imports": {
      code: `
        import { pipe } from "@fp-ts/data/Function"
        const test = pipe(a, map(() => b))
      `,
      output: "const test = map(() => b)(a);"
    },
    "should re-write namespaced pipe imports": {
      code: `
        import * as F from "@fp-ts/data/Function"
        const test = F.pipe(a, map(() => b))
      `,
      output: "const test = map(() => b)(a);"
    },
    "should not remove named imports if they are still referenced": {
      code: `
        import { pipe, identity } from "@fp-ts/data/Function"
        const test = pipe(a, identity)
      `,
      output: `
        import { identity } from "@fp-ts/data/Function";
        const test = identity(a);
      `
    },
    "should not remove namespaced imports if they are still referenced": {
      code: `
        import * as F from "@fp-ts/data/Function"
        const test = F.pipe(a, F.identity)
      `,
      output: `
        import * as F from "@fp-ts/data/Function";
        const test = F.identity(a);
      `
    }
  }
})
