# Reproducible Demo

After installing dependencies:

```console
corepack pnpm check
corepack pnpm pack:cli
npm install --global "artifacts/jayadityavetsa-patchproof-0.1.0-alpha.1.tgz"
patchproof --help
patchproof inspect --base origin/main
```

The orchestration integration test builds a real two-commit repository, adds a regression test with the fix, and verifies:

```text
base implementation + transplanted test -> assertion failure
head implementation + changed test     -> pass
aggregate                              -> proven
```

Run only that scenario with:

```console
corepack pnpm vitest run packages/core/test/engine.test.ts
```
