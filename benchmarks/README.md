# PatchProof historical benchmark

The benchmark evaluates immutable historical bug-fix commits from public repositories. It is read-only and does not imply endorsement by upstream maintainers.

```console
node scripts/run-benchmark.mjs --mode inspect
node scripts/run-benchmark.mjs --case requests-file-wrapper --mode check
node scripts/render-benchmarks.mjs
```

Each result records the selected tests, canonical status, duration, fallback information, and any unsupported or infrastructure failure. Failures remain in the published dataset.
