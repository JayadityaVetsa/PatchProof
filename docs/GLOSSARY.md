# Glossary

## Adapter

An ecosystem-specific component that discovers and runs tests and normalizes framework outcomes.

## Aggregate status

The run-level result derived from all per-test statuses and head-suite health.

## Base

The Git revision representing the implementation before the proposed patch.

## Head

The Git revision containing the proposed patch and its tests.

## Head suite

The configured existing test scope run on head to detect regressions beyond targeted proof tests.

## Infrastructure failure

A setup, import, collection, process, timeout, environment, or tool failure that prevents a reliable behavioral observation.

## New regression test

A test added or materially changed on head with the intent to capture behavior corrected by the patch.

## Proof

Evidence that a transplanted test has an expected assertion failure against base and passes against head. Proof is limited to that test, those revisions, and the execution environment.

## Proven

The canonical per-test status for a valid base assertion failure and head pass.

## Not proven

The canonical status when a test passes on both base and head.

## Still failing

The canonical status when a test has an expected assertion failure on both base and head.

## Inconclusive

The canonical status when reliable comparison was prevented by infrastructure, discovery, transplant, timeout, interruption, or unsupported behavior.

## Test-support file

A test-only helper, fixture, snapshot, or configuration file needed to execute the submitted test on base.

## Transplant

Applying eligible head-side test and test-support changes to the base worktree without applying production implementation changes.

## Worktree

A Git-managed working directory attached to a revision. PatchProof uses temporary worktrees to isolate evaluation from the user's active checkout.
