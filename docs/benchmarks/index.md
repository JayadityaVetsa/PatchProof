# Public historical benchmarks

PatchProof benchmarks are reproducible, read-only evaluations of pinned historical bug-fix commits. They are not endorsements by the upstream maintainers.

The benchmark records:

- Repository and immutable base/head SHAs.
- Adapter and explicit commands.
- Selection reasons and granularity.
- Expected and actual canonical status.
- Duration, fallbacks, unsupported cases, and false-negative causes.

Results are generated from [`benchmarks/manifest.json`](https://github.com/JayadityaVetsa/PatchProof/blob/main/benchmarks/manifest.json). Unsupported and inconclusive cases remain visible rather than being excluded.

<!-- benchmark-summary:start -->

| Case                          | Mode    | Status   | Tests |
| ----------------------------- | ------- | -------- | ----: |
| axios-http-adapter-error      | inspect | selected |     1 |
| click-fish-completion         | inspect | selected |     1 |
| date-fns-chinese-month        | inspect | selected |     2 |
| httpx-request-timeout         | inspect | selected |     1 |
| pydantic-generator-max-length | inspect | selected |     1 |
| pytest-initial-conftest       | inspect | selected |     1 |
| requests-file-wrapper         | inspect | selected |     1 |
| vite-null-export-glob         | inspect | selected |     1 |
| vitest-inline-diff-config     | inspect | selected |     1 |
| zod-default-map-set-clone     | inspect | selected |     4 |

<!-- benchmark-summary:end -->
