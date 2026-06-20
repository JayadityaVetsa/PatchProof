---
layout: home
title: PatchProof
titleTemplate: Prove regression tests against the real base revision
description: Prove that a changed pytest, Jest, or Vitest regression test fails before a fix and passes after it.
hero:
  name: PatchProof
  text: Prove the regression test matters.
  tagline: Deterministically run changed tests against the real base and head revisions.
  actions:
    - theme: brand
      text: Run your first proof
      link: /getting-started/
    - theme: alt
      text: See public benchmarks
      link: /benchmarks/
features:
  - title: Real counterfactual
    details: Uses the repository's actual base implementation, not a generated mutation or model opinion.
  - title: Explainable selection
    details: Reports changed ranges, complete test source spans, targeting granularity, and fallback reasons.
  - title: Conservative verdicts
    details: Infrastructure uncertainty becomes inconclusive and can never be promoted to proven.
---

## The proof

```text
base implementation + changed test  -> expected assertion failure
head implementation + changed test  -> pass
                                      = proven
```

PatchProof answers a narrow question that ordinary CI does not: **does this submitted regression test actually distinguish the fix from the code that existed before it?**

It supports pytest, Jest, and Vitest on Linux, Windows, and macOS. The CLI and GitHub Action are open source, privacy-redacted by default, and require no hosted service or API key.

## What it does not claim

PatchProof does not infer the intended bug, prove the entire patch correct, replace code review, or turn arbitrary failures into evidence. Read [the limitations](/limitations/) before using results as a merge requirement.
