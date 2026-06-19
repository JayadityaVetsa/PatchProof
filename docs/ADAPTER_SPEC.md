# Adapter Specification

## Purpose

Adapters isolate ecosystem and test-framework behavior from the proof engine. JavaScript/TypeScript and Python are the v1 adapters.

## Contract

Conceptual TypeScript interface:

```ts
interface PatchProofAdapter {
  readonly name: "javascript" | "python";
  detect(context: RepositoryContext): Promise<DetectionResult>;
  validate(context: AdapterContext): Promise<ValidationResult>;
  discoverTests(diff: RepositoryDiff): Promise<DiscoveredTest[]>;
  supportFiles(test: DiscoveredTest): Promise<RepositoryPath[]>;
  setupPlan(worktree: WorktreeContext): Promise<CommandPlan | null>;
  targetedTestPlan(test: DiscoveredTest, worktree: WorktreeContext): Promise<CommandPlan>;
  suitePlan(worktree: WorktreeContext): Promise<CommandPlan>;
  normalize(result: ProcessResult): NormalizedTestOutcome;
}
```

This is a behavioral specification, not final source code.

## Detection

Detection returns confidence and evidence, such as manifests, lockfiles, and test configuration. If multiple adapters are plausible and none is unambiguous, the core stops and requests explicit configuration.

## Test discovery

Each discovered test has:

- Stable test ID.
- Repository-relative file.
- Display name when available.
- Change kind.
- Discovery evidence.
- Targeting confidence.

File-level targeting is acceptable when framework-level test-case targeting is unreliable, but the report must disclose the granularity.

## Support files

Adapters may declare test-only helpers, fixtures, snapshots, and test configuration required on base. They must not include production implementation changes. Ambiguous files cause `inconclusive` unless explicitly classified by configuration.

## Setup

Adapters prefer lockfile-respecting, reproducible setup. Setup may be user-supplied. A setup failure is infrastructure failure and cannot count as an expected base assertion failure.

## Normalization

Raw outcomes normalize to:

- `pass`
- `assertion_failure`
- `infrastructure_failure`
- `timeout`
- `interrupted`

Adapters must be conservative. Collection errors, syntax errors, missing modules, process crashes, and malformed runner output are infrastructure failures.

## Contract tests

Every adapter must demonstrate:

- Correct positive and negative detection.
- Stable test IDs.
- Targeted execution.
- Expected assertion recognition.
- Setup/import/collection failure rejection.
- Safe support-file classification.
- Cross-platform command behavior.

The classifier remains core-owned and adapter-independent.
