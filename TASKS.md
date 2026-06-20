# Release tasks

## Completed for `0.1.0-alpha.2`

- [x] Publish `0.1.0-alpha.1` to npm and verify public `npx` execution.
- [x] Add identical-revision refusal and bounded, redacted setup diagnostics.
- [x] Add structured Jest/Vitest result normalization.
- [x] Build the GitHub Pages documentation site and executable documentation checks.
- [x] Add canonical metadata, local search, sitemap, robots, JSON-LD, `llms.txt`, schema, and citation metadata.
- [x] Add the ten-repository historical benchmark manifest, runner, workflow, and report generator.
- [x] Upgrade GitHub Action dependencies and patch vulnerable transitive dependencies.
- [x] Generalize the release workflow for tag-derived versions and npm provenance.

## Alpha.2 release gates

- [ ] Record inspect results for all ten benchmark cases.
- [ ] Record full proof results and document unsupported or inconclusive cases.
- [ ] Pass the complete cross-platform CI matrix and privacy/release scans.
- [ ] Publish GitHub Pages and set the repository homepage.
- [ ] Configure npm Trusted Publishing for `release.yml` and `npm-release`.
- [ ] Remove the accidental npm `latest` tag from the alpha.
- [ ] Publish `v0.1.0-alpha.2` through GitHub OIDC and verify provenance.
- [ ] Confirm no open high-severity dependency alert remains.

## After alpha.2

- [ ] Recruit opt-in external pilot repositories.
- [ ] Evaluate repeated-run/flakiness policy.
- [ ] Consider GitHub Marketplace listing after fork-safety evidence is complete.
