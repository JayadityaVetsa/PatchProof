# @jayadityavetsa/patchproof

Prove that a changed pytest, Jest, or Vitest regression test fails before the fix and passes after it.

```console
npm install --global @jayadityavetsa/patchproof@alpha
patchproof inspect --base origin/main --head HEAD
patchproof check --base origin/main --head HEAD
```

PatchProof is deterministic and conservative: setup failures, timeouts, crashes, collection failures, and unknown output become `inconclusive`, never `proven`.

- [Documentation](https://jayadityavetsa.github.io/PatchProof/)
- [Source and GitHub Action](https://github.com/JayadityaVetsa/PatchProof)
- [Security model](https://jayadityavetsa.github.io/PatchProof/security/)
- [Public benchmarks](https://jayadityavetsa.github.io/PatchProof/benchmarks/)

Apache-2.0. No telemetry, hosted account, required AI service, or postinstall script.
