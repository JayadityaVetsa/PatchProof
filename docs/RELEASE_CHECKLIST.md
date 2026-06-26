# Alpha Release Checklist

## Code and evidence

- [ ] `corepack pnpm check`
- [ ] `corepack pnpm acceptance:package`
- [ ] `corepack pnpm release:verify`
- [ ] Cross-platform Node and Python matrices pass.
- [ ] CodeQL and dependency review pass.
- [ ] Demonstration PRs cover public statuses.
- [ ] Historical-repository trials and limitations are recorded.

## Privacy and security

- [ ] Repository, Action bundle, tarball, reports, and artifacts pass the privacy scan.
- [ ] Private vulnerability reporting is enabled.
- [ ] Secret scanning and push protection are enabled where available.
- [ ] Third-party Actions are pinned to immutable SHAs.
- [ ] Release workflow uses the protected `npm-release` environment.

## Package and release

- [ ] Package identity is `@jayadityavetsa/patchproof@0.1.0-alpha.3`.
- [ ] Tarball contents are manually reviewed.
- [ ] npm account has two-factor authentication.
- [ ] First scoped package publication is confirmed interactively.
- [ ] npm trusted publishing is configured for `.github/workflows/release.yml`.
- [ ] `v0.1.0-alpha.3` points at the verified commit.
- [ ] GitHub prerelease contains the tarball, SHA256 checksums, SBOM, notes, and known limitations.
