# Roadmap

PatchProof is intentionally conservative: new automation should make the evidence easier to trust, not make the verdict broader than the experiment supports.

## Now: harden the proof pipeline

- Keep dependency auditing, packaged-CLI acceptance, CodeQL, and dependency review as required CI signals.
- Exercise Linux, macOS, and Windows across supported Node.js and Python versions.
- Keep GitHub Actions pinned to immutable commit SHAs and update them through reviewed Dependabot pull requests.
- Publish the documentation and project story through the same reviewed GitHub Pages workflow.

## Next: find compatibility breaks earlier

- Add scheduled canaries for the next Node.js, TypeScript, pytest, Jest, and Vitest releases without blocking ordinary pull requests.
- Maintain small framework fixtures that cover monorepos, workspaces, custom test commands, and paths containing spaces.
- Record canary results as artifacts so compatibility claims are backed by reproducible runs.
- Split major dependency upgrades into isolated pull requests instead of combining unrelated migration risk.

## Then: strengthen release provenance

- Move npm publishing to trusted publishing with short-lived identity tokens.
- Generate an SBOM and attest the release artifact and bundled GitHub Action.
- Verify that the tarball tested in CI is the exact artifact published to npm.
- Add a release checklist covering version synchronization, action bundle drift, documentation, and rollback.

## Later: make proof quality measurable

- Dogfood PatchProof against its own regression-test pull requests.
- Expand public historical benchmarks and publish runtime, selection precision, and inconclusive-rate trends.
- Add machine-readable annotations for reason mismatches and ambiguous evidence.
- Explore opt-in mutation testing as a complementary signal while keeping it separate from PatchProof's counterfactual verdict.

## Adoption without surveillance

PatchProof will not add runtime telemetry. Project health can be estimated from public, aggregate signals such as npm downloads, repository clones, stars, issues, and downstream references. Any future usage reporting should remain explicit and opt-in.
