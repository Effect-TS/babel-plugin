import plugin from "@repo-tooling/babel-plugin-fp-ts"
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
        import { pipe, double } from "@fp-ts/data/Function"
        const test = pipe(a, double)
      `,
      output: `
        import { double } from "@fp-ts/data/Function";
        const test = double(a);
      `
    },
    "should not remove namespaced imports if they are still referenced": {
      code: `
        import * as F from "@fp-ts/data/Function"
        const test = F.pipe(a, F.double)
      `,
      output: `
        import * as F from "@fp-ts/data/Function";
        const test = F.double(a);
      `
    },
    "should re-write named identity imports": {
      code: `
        import { identity } from "@fp-ts/data/Function"
        const test = identity(a)
      `,
      output: `const test = a;`
    },
    "should re-write namespaced identity imports": {
      code: `
        import * as F from "@fp-ts/data/Function"
        const test = F.identity(a)
      `,
      output: `const test = a;`
    },
    "should re-write identity when used within a pipe": {
      code: `
        import { identity, pipe } from "@fp-ts/data/Function"
        const test = pipe(a, identity, f(() => b))
      `,
      output: `const test = f(() => b)(a);`
    },
    "should allow a user to override targeted imports": {
      pluginOptions: {
        pipeImports: ["foo"],
        identityImports: ["bar"]
      },
      code: `
        import { pipe } from "@fp-ts/data/Function"
        const test = pipe(a, map(() => b))
      `,
      output: `
        import { pipe } from "@fp-ts/data/Function";
        const test = pipe(
          a,
          map(() => b)
        );
      `
    }
  }
})
