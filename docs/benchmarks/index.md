# Public historical benchmarks

PatchProof benchmarks are reproducible, read-only evaluations of pinned historical bug-fix commits. They are not endorsements by the upstream maintainers.

The benchmark records:

- Repository and immutable base/head SHAs.
- Adapter and explicit commands.
- Selection reasons and granularity.
- Expected and actual canonical status.
- Duration, fallbacks, unsupported cases, and false-negative causes.

Results are generated from [`benchmarks/manifest.json`](https://github.com/JayadityaVetsa/PatchProof/blob/main/benchmarks/manifest.json). Unsupported and inconclusive cases remain visible rather than being excluded.

## First full run

The first full run evaluated all ten repositories on June 20, 2026:

- Two repositories produced `proven` targeted evidence: one axios test and four Zod tests.
- Two repositories produced `not_proven` targeted evidence.
- Six repositories produced `inconclusive` targeted evidence.
- One case exposed a pre-execution nested-project transplant bug, which was fixed and rerun.
- All ten aggregate results remained `inconclusive` because the historical clean suites did not run reliably in the minimal modern environment.

This is not presented as a 10/10 success story. It demonstrates that PatchProof preserves uncertainty and that historical dependency reconstruction is the primary benchmark challenge. See the permanent [machine-readable results](https://github.com/JayadityaVetsa/PatchProof/blob/main/benchmarks/check-results.json) and the [workflow run](https://github.com/JayadityaVetsa/PatchProof/actions/runs/27885630451).

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
