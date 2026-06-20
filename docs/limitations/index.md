# Limitations

- PatchProof proves only the selected changed tests against the reported revisions.
- It does not infer product intent or map every production change to a relevant test.
- It does not prove untested behavior or replace complete CI.
- A `proven` test does not prove the full patch correct, secure, or complete.
- File-level fallback is less precise than case-level targeting.
- Historical bases may no longer install on modern toolchains.
- Flaky tests can produce misleading single-run evidence; repeated-run policy is future work.
- Host execution is not containment.
