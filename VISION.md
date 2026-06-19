# Vision

## Mission

PatchProof helps reviewers answer one concrete question before spending attention on a bug-fix change:

> Does the proposed regression test fail without the patch and pass with it?

The project exists to make behavioral evidence easy to produce, inspect, and automate.

## Initial users

1. **Open-source maintainers** who receive bug-fix pull requests and need a fast signal about whether added tests are meaningful.
2. **Contributors** who want to demonstrate that their change reproduces and fixes a regression.
3. **Engineering teams** adopting coding agents while retaining deterministic quality gates.
4. **Tool authors** who want machine-readable patch evidence without depending on an LLM.

## Principles

- **Evidence over confidence.** Report observed commands and outcomes, not an opaque score.
- **Narrow claims.** `proven` describes a test/patch relationship, not total patch correctness.
- **Deterministic core.** The same repository, revisions, configuration, and environment should yield the same classification.
- **No required AI.** AI may later explain evidence, but must never be required to establish it.
- **Local first.** Source code and test output remain on the user's machine or CI runner.
- **Honest uncertainty.** Infrastructure and discovery failures are `inconclusive`, never silently converted into proof.
- **Secure defaults.** Running repository commands is treated as executing untrusted code.
- **Approachable contribution.** The repository should be understandable to a first-time open-source contributor.

## Success measures

V1 succeeds when:

- A new user can prove a JavaScript or Python regression test locally in under ten minutes.
- The same core result is available in a GitHub Action.
- Every classification includes enough evidence to reproduce it.
- Fixture tests demonstrate all four per-test statuses on Windows, Linux, and macOS.
- PatchProof produces zero false `proven` results in the maintained fixture corpus.
- Users can run the essential workflow without an account, API key, or network service beyond ordinary dependency installation.

Adoption indicators after launch:

- Independent repositories install and retain the GitHub Action.
- Maintainers cite PatchProof output during review.
- Contributors add adapters or fixture cases.
- Reported false proofs are rare, reproducible, and treated as release-blocking defects.

GitHub stars are useful distribution feedback, but they are not a correctness metric.

## Long-term direction

PatchProof may grow into a protocol for portable patch evidence: regression reproduction, existing-suite health, changed-test strength, and reproducible execution metadata. Growth must preserve the narrow semantics of existing statuses and avoid becoming a generic AI reviewer.
