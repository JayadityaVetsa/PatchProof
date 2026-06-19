# Market Research

**Research snapshot:** June 18, 2026  
**Method:** public documentation and repositories were reviewed to compare adjacent tool categories. This is not a complete patent, trademark, or prior-art search.

## Problem hypothesis

Maintainers need stronger evidence that a newly added regression test actually detects the behavior changed by a patch. Existing tools commonly answer adjacent questions:

- Was changed code executed?
- Do tests pass?
- Do tests detect synthetic mutations?
- Does an automated reviewer see likely issues?

PatchProof asks whether the submitted test distinguishes the base revision from the head revision.

## Adjacent categories

### Patch and diff coverage

[Codecov commit status](https://docs.codecov.com/docs/commit-status) can enforce project and patch coverage targets. [diff-cover](https://github.com/Bachmann1234/diff_cover) reports coverage for lines changed in a diff.

**Overlap:** changed-code and changed-line test evidence.  
**Difference:** execution coverage does not establish that a new test fails before the fix.

### Mutation testing

[Stryker Mutator](https://stryker-mutator.io/docs/) evaluates test effectiveness by introducing artificial code changes (“mutants”) and checking whether tests detect them.

**Overlap:** test-strength evidence through counterfactual execution.  
**Difference:** PatchProof uses the repository's actual base implementation as the counterfactual rather than generated mutations.

### CI and required checks

[GitHub status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks) communicate whether external processes pass and can gate merging.

**Overlap:** automated PR feedback and merge policy.  
**Difference:** GitHub provides the mechanism, not the base-plus-transplanted-test proof.

### AI pull-request review

[PR-Agent](https://github.com/qodo-ai/pr-agent) and similar projects generate descriptions, reviews, and suggestions using language models.

**Overlap:** reducing reviewer effort and analyzing pull requests.  
**Difference:** PatchProof's canonical result is derived from execution and requires no model or API key.

### Test-impact and selective testing

Test-selection tools choose which tests to run based on changed code or dependency graphs.

**Overlap:** changed-test discovery and targeted execution.  
**Difference:** selection optimizes test cost; PatchProof compares behavior across revisions.

## Gap assessment

The apparent opening is a polished, cross-platform, open-source workflow centered on:

```text
base implementation + submitted test
versus
head implementation + submitted test
```

This workflow can be implemented manually in many repositories, and isolated scripts or internal systems may already do it. The market claim is therefore deliberately modest:

> As of the research date, we did not identify a prominent, language-adapter-based CLI and GitHub Action whose primary public contract is this proof.

That statement must be revalidated before launch. Discovery of a close competitor should trigger comparison and differentiation, not denial.

## Why the wedge may work

- The one-line explanation is understandable.
- The demonstration is visually clear.
- The deterministic core avoids model cost and privacy concerns.
- It complements rather than replaces CI, coverage, and review.
- It serves both AI-assisted and traditional contributors.
- Small fixture repositories are sufficient to develop and verify it.

## Risks

| Risk                                       | Why it matters                                 | Mitigation                                                                   |
| ------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Test transplant is brittle                 | Tests may depend on head-only support changes. | Explicit support-file model; classify uncertainty as `inconclusive`.         |
| Base may not build in a modern environment | Historical dependencies can fail.              | Separate infrastructure failure from assertion failure.                      |
| Tests may be flaky                         | A single failure/pass pair may mislead.        | Future repeat policy; v1 records limitations and supports configured reruns. |
| “Proven” may be overread                   | Users may think the whole patch is correct.    | Always say “test proven”; include a limitation banner.                       |
| Language frameworks vary                   | Discovery and targeting can sprawl.            | Narrow adapter support and explicit commands before broad automation.        |
| Untrusted code execution                   | Test commands can compromise hosts or secrets. | Consent, least privilege, warnings, ephemeral hosted runners, no secrets.    |
| Existing/internal prior art                | The idea may not be unique.                    | Compete on usability, adapters, evidence format, and trustworthiness.        |

## Evidence versus inference

**Observed evidence**

- Coverage products expose patch/diff coverage.
- Mutation tools run altered implementations against tests.
- GitHub Actions can surface required status checks.
- AI PR reviewers require model-backed interpretation for their AI features.
- GitHub documents that workflows and third-party actions can access sensitive runner capabilities and recommends least privilege and immutable pins.

**Product inference**

- Maintainers will value base/head proof enough to add another check.
- A narrow proof tool can earn adoption alongside existing CI.
- JavaScript and Python provide sufficient initial reach.
- Clear evidence will be more trusted than a synthetic score.

These inferences require validation through interviews, prototype use, issue feedback, and public pilot repositories.

## Validation plan

Before calling v1 market-ready:

1. Re-run competitor discovery using GitHub, package registries, and web search.
2. Interview at least five maintainers who routinely review bug-fix PRs.
3. Test historical bug-fix commits in at least ten public repositories.
4. Measure how often test transplant is automatic, configurable, or impossible.
5. Publish limitations and representative failures.

## Sources

- [Codecov: Status Checks](https://docs.codecov.com/docs/commit-status)
- [diff-cover repository](https://github.com/Bachmann1234/diff_cover)
- [Stryker: What is mutation testing?](https://stryker-mutator.io/docs/)
- [GitHub: About status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [GitHub Actions: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [PR-Agent repository](https://github.com/qodo-ai/pr-agent)
- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
