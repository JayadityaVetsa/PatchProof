# How PatchProof chooses tests

PatchProof does not map production files to tests or guess what bug is being fixed. It starts from changed test files in the Git diff.

1. Resolve immutable base and head commits.
2. Compute added and modified line ranges.
3. Parse pytest, Jest, or Vitest declarations.
4. Compare each changed range with the test's complete source span.
5. Select overlapping cases.
6. Fall back visibly to file-level targeting when syntax is dynamic or ambiguous.

```text
test("rejects zero volume", () => {   line 18 ┐
  const queue = createQueue();                 │ complete source span
  expect(() => queue.add(0)).toThrow(); line 20│ changed line
});                                    line 21 ┘
```

The result records:

- Changed ranges.
- Test source span.
- Selection reason.
- Case-level or file-level granularity.
- Fallback reason, when present.

Added tests are selected directly. Deleted tests are reported but cannot be evaluated. Explicit `tests.support` files may be transplanted with tests; production files are blocked.
