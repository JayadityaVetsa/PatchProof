# Alpha Compatibility

PatchProof `0.1.0-alpha.2` is tested against:

| Surface               | Supported versions                 |
| --------------------- | ---------------------------------- |
| PatchProof runtime    | Node.js 22 and 24                  |
| GitHub Action runtime | Node.js 24                         |
| JavaScript tests      | Vitest and Jest                    |
| Python tests          | pytest on Python 3.10 through 3.14 |
| Operating systems     | Linux, Windows, and macOS          |
| Package managers      | pnpm, npm, Yarn, and Bun           |

One project is evaluated per invocation. Repositories with multiple detected projects must set `projectRoot`.

Unknown test frameworks can use explicit setup, targeted-test, and suite commands, but PatchProof remains conservative: an unrecognized non-zero result is infrastructure failure rather than proof.

This matrix is an alpha target, not a claim that every project using these runtimes is supported. Dynamic tests and unusual layouts may require explicit configuration or file-level fallback.
