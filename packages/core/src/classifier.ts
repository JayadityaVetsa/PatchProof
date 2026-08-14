import type {
  AggregateStatus,
  ExpectedFailureRule,
  FailureReasonExtraction,
  NormalizedOutcome,
  SuiteStatus,
  TestStatus,
} from "@patchproof/adapter-api";

export interface ReasonClassification {
  readonly status: TestStatus;
  readonly code:
    | "PP_REASON_MATCH"
    | "PP_REASON_MISMATCH"
    | "PP_REASON_PARTIAL_MATCH"
    | "PP_REASON_AMBIGUOUS"
    | "PP_REASON_UNAVAILABLE"
    | "PP_REASON_TRUNCATED";
}

export function classifyExpectedFailure(
  base: NormalizedOutcome,
  head: NormalizedOutcome,
  rule: ExpectedFailureRule,
  observed: FailureReasonExtraction,
): ReasonClassification {
  if (base !== "assertion_failure" || head !== "pass") {
    return { status: classifyTest(base, head), code: "PP_REASON_UNAVAILABLE" };
  }
  if (observed.status === "truncated") {
    return { status: "inconclusive", code: "PP_REASON_TRUNCATED" };
  }
  if (observed.status === "ambiguous") {
    return { status: "inconclusive", code: "PP_REASON_AMBIGUOUS" };
  }
  if (observed.status === "unavailable") {
    return { status: "inconclusive", code: "PP_REASON_UNAVAILABLE" };
  }
  if (observed.type === rule.type && observed.message === rule.message) {
    return { status: "proven", code: "PP_REASON_MATCH" };
  }
  if (rule.contains && observed.message.includes(rule.contains)) {
    return { status: "not_proven", code: "PP_REASON_PARTIAL_MATCH" };
  }
  return { status: "not_proven", code: "PP_REASON_MISMATCH" };
}

export function classifyTest(base: NormalizedOutcome, head: NormalizedOutcome): TestStatus {
  if (base === "assertion_failure" && head === "pass") return "proven";
  if (base === "pass" && head === "pass") return "not_proven";
  if (base === "assertion_failure" && head === "assertion_failure") return "still_failing";
  return "inconclusive";
}

const severity: Record<TestStatus, number> = {
  proven: 0,
  not_proven: 1,
  still_failing: 2,
  inconclusive: 3,
};

export function aggregateStatus(
  statuses: readonly TestStatus[],
  suiteStatus: SuiteStatus,
): AggregateStatus {
  if (suiteStatus === "regression") return "regression";
  if (suiteStatus === "inconclusive") return "inconclusive";
  if (!statuses.length) return "no_tests";
  return statuses.reduce((current, status) =>
    severity[status] > severity[current] ? status : current,
  );
}

export function exitCodeFor(status: AggregateStatus): number {
  if (status === "proven") return 0;
  if (["not_proven", "still_failing", "no_tests", "regression"].includes(status)) return 1;
  if (status === "error") return 2;
  return 3;
}

export function compareSuites(base: NormalizedOutcome, head: NormalizedOutcome): SuiteStatus {
  if (base === "pass" && head === "pass") return "healthy";
  if (base === "pass" && head === "assertion_failure") return "regression";
  if (base === "assertion_failure" && head === "pass") return "improved";
  if (base === "assertion_failure" && head === "assertion_failure") return "pre_existing_failure";
  return "inconclusive";
}
