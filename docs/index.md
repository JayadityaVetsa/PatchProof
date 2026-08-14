---
layout: home
title: PatchProof
titleTemplate: Prove regression tests against the real base revision
description: Prove that a changed pytest, Jest, or Vitest regression test fails before a fix and passes after it.
hero:
  name: PatchProof
  text: Prove the test. Not just the patch.
  tagline: Deterministic counterfactual testing for pull requests—run the changed regression test against the real code before and after the fix.
  actions:
    - theme: brand
      text: Run a proof in 5 minutes
      link: /getting-started/
    - theme: alt
      text: View on GitHub
      link: https://github.com/JayadityaVetsa/PatchProof
features:
  - title: Real before-and-after evidence
    details: Transplants the changed test onto the actual base revision, then compares it with head.
  - title: Safe by construction
    details: Read-only GitHub permissions, temporary worktrees, bounded output, and no required secrets.
  - title: Deterministic verdicts
    details: No model decides the result. Infrastructure uncertainty can never become proof.
---

<section class="pp-section">
<p class="pp-kicker">The missing CI check</p>
<h2>A passing regression test is not enough.</h2>
<p class="pp-lede">Ordinary CI tells you the branch passes. PatchProof answers the harder review question: would this exact test have caught the bug before the fix existed?</p>

<div class="pp-proof-grid">
  <article class="pp-proof-card"><span>1</span><strong>Find the changed test</strong><p>Diff-aware adapters identify added and materially changed pytest, Jest, and Vitest cases.</p></article>
  <article class="pp-proof-card"><span>2</span><strong>Run the counterfactual</strong><p>The test-side patch is transplanted onto an isolated worktree of the real base revision—never the production fix.</p></article>
  <article class="pp-proof-card"><span>3</span><strong>Issue a conservative verdict</strong><p>Base assertion failure plus head pass can become <code>proven</code>; uncertainty stays <code>inconclusive</code>.</p></article>
</div>
</section>

<section class="pp-section">
<p class="pp-kicker">Evidence you can inspect</p>
<h2>One command. A review artifact with receipts.</h2>

<div class="pp-terminal">
  <div class="pp-terminal-bar"><i></i><i></i><i></i></div>
  <pre><span class="muted">$</span> patchproof check --base origin/main --head HEAD
PatchProof 0.1.0-alpha.3
Base: 41e8c91b0f21
Head: a02f7d43c8aa
<span class="ok">PROVEN</span> tests/orders.test.ts::rejects negative quantity
base: assertion_failure
head: pass
Aggregate: <span class="ok">PROVEN</span></pre>

</div>
</section>

<section class="pp-section">
<p class="pp-kicker">Designed for trust</p>
<h2>Useful in a portfolio. Serious enough for a pipeline.</h2>
<div class="pp-trust-grid">
  <article class="pp-trust-card"><b>3 frameworks</b><p>pytest, Jest, and Vitest with case-aware selection and conservative fallback.</p></article>
  <article class="pp-trust-card"><b>3 operating systems</b><p>Continuously exercised on Linux, macOS, and Windows with Node.js 22 and 24.</p></article>
  <article class="pp-trust-card"><b>0 hosted dependency</b><p>No telemetry, API key, required AI model, or external proof service.</p></article>
</div>
</section>

<section class="pp-section">
<p class="pp-kicker">Built for honest automation</p>
<h2>Proof stays narrow—and that is the point.</h2>
<p class="pp-lede">PatchProof does not claim the whole patch is correct. It verifies one valuable fact with reproducible evidence: the submitted test distinguishes the fixed implementation from its base. Opt-in reason checks can also require the base failure to match the intended assertion exactly.</p>

Explore the [public historical benchmarks](/benchmarks/), read the [security model](/security/), or see [how PatchProof compares](/comparisons/) with mutation testing and coverage.

</section>

<section class="pp-cta">
  <div><h2>Make “the test passes” mean more.</h2><p>Inspect first, approve the commands, then produce deterministic evidence locally or in GitHub Actions.</p></div>
  <a href="/PatchProof/getting-started/">Run your first proof →</a>
</section>
