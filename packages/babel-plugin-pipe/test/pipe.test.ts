import plugin from "@repo-tooling/babel-plugin-pipe"
import pluginTester from "babel-plugin-tester"

pluginTester({
  plugin,
  pluginName: "fp-ts",
  tests: {
    "testing": {
      code: `
        import { pipe } from "@fp-ts/data/Function"

        const test = pipe(a, map(() => b))
      `,
      output: `
        import { pipe } from "@fp-ts/data/Function";
        const test = map(() => b)(a);
      `
    }
  }
})
