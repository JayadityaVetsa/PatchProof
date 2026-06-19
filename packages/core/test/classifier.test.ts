import { describe, expect, it } from "vitest";
import { aggregateStatus, classifyTest, compareSuites, exitCodeFor } from "../src/index.js";

describe("classifyTest", () => {
  it.each([
    ["assertion_failure", "pass", "proven"],
    ["pass", "pass", "not_proven"],
    ["assertion_failure", "assertion_failure", "still_failing"],
    ["infrastructure_failure", "pass", "inconclusive"],
    ["timeout", "pass", "inconclusive"],
    ["assertion_failure", "infrastructure_failure", "inconclusive"],
    ["interrupted", "pass", "inconclusive"],
  ] as const)("%s + %s = %s", (base, head, expected) => {
    expect(classifyTest(base, head)).toBe(expected);
  });

  it("never promotes infrastructure uncertainty to proven", () => {
    const outcomes = ["infrastructure_failure", "timeout", "interrupted"] as const;
    for (const base of outcomes) {
      for (const head of ["pass", "assertion_failure", ...outcomes] as const) {
        expect(classifyTest(base, head)).not.toBe("proven");
      }
    }
  });
});

describe("aggregate and suite policy", () => {
  it("uses the highest test severity", () => {
    expect(aggregateStatus(["proven", "not_proven", "still_failing"], "healthy")).toBe(
      "still_failing",
    );
  });

  it("lets a demonstrated suite regression override proof", () => {
    expect(aggregateStatus(["proven"], "regression")).toBe("regression");
  });

  it("compares suite evidence without blaming pre-existing failures", () => {
    expect(compareSuites("pass", "assertion_failure")).toBe("regression");
    expect(compareSuites("assertion_failure", "assertion_failure")).toBe("pre_existing_failure");
    expect(compareSuites("assertion_failure", "pass")).toBe("improved");
  });

  it.each([
    ["proven", 0],
    ["not_proven", 1],
    ["still_failing", 1],
    ["no_tests", 1],
    ["regression", 1],
    ["error", 2],
    ["inconclusive", 3],
  ] as const)("maps %s to exit %i", (status, code) => {
    expect(exitCodeFor(status)).toBe(code);
  });
});
