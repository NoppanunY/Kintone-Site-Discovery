import { CAPTURE_CATEGORIES, defaultCategoryKeysForPreset } from "./constants.js";
import type {
  CaptureCategory,
  CollectorResult,
  PresetId,
  ScanResult,
  ScanRun,
  SensitiveCaptureOption,
  SnapshotAuthSelection,
} from "./types.js";

export type FixtureScanOutcome = "completed" | "warnings" | "failed";

export interface BuildFixtureScanRunInput {
  projectId: string;
  siteId: string;
  authSelection: SnapshotAuthSelection;
  presetId: PresetId;
  selectedAppIds: string[];
  enabledCategoryKeys?: string[];
  sensitiveOptions?: SensitiveCaptureOption[];
  outcome?: FixtureScanOutcome;
  startedAt?: Date;
}

const fixtureDurationsMs: Record<FixtureScanOutcome, number> = {
  completed: 72_000,
  warnings: 84_000,
  failed: 31_000,
};

export function buildFixtureScanRun(input: BuildFixtureScanRunInput): ScanRun {
  const outcome = input.outcome ?? "warnings";
  const startedAt = input.startedAt ?? new Date();
  const durationMs = fixtureDurationsMs[outcome];
  const finishedAt = new Date(startedAt.getTime() + durationMs);
  const enabledCategoryKeys = input.enabledCategoryKeys ?? defaultCategoryKeysForPreset(input.presetId);
  const categories = categoriesForKeys(enabledCategoryKeys);
  const requiredCategories = categories.filter((category) => category.collectorKind === "required");
  const optionalCategories = categories.filter((category) => category.collectorKind === "optional");
  const selectedAppIds = [...input.selectedAppIds];
  const warningCategory = optionalCategories.find((category) => category.key === "plugin_config") ?? optionalCategories[0];
  const failedCategory = requiredCategories.find((category) => category.key === "form_fields") ?? requiredCategories[0];
  const collectors = buildCollectors(categories, {
    outcome,
    warningCategoryKey: warningCategory?.key,
    failedCategoryKey: failedCategory?.key,
  });
  const requiredTotal = requiredCategories.length * Math.max(selectedAppIds.length, 1);
  const failedRequiredUnits = outcome === "failed" && failedCategory ? Math.max(selectedAppIds.length, 1) : 0;
  const requiredOk = Math.max(0, requiredTotal - failedRequiredUnits);
  const optionalSkipped = outcome === "warnings" && warningCategory ? 1 : 0;
  const status = outcome === "completed" ? "completed" : outcome === "warnings" ? "completed_with_warnings" : "failed";
  const warningCount = outcome === "failed" ? 1 : optionalSkipped;
  const result: ScanResult = {
    status,
    durationMs,
    requiredOk,
    requiredTotal,
    optionalSkipped,
    warningCount,
    appsCaptured: outcome === "failed" ? Math.max(0, selectedAppIds.length - 1) : selectedAppIds.length,
    pluginsCaptured: outcome === "failed" ? 0 : selectedAppIds.length,
    redaction: {
      enabled: true,
      totalRedactions: 0,
      byType: { fieldValues: 0, comments: 0, attachments: 0, other: 0 },
      logPath: "",
    },
    collectors,
    ...(outcome === "failed" ? { error: fixtureFailureError() } : {}),
  };

  return {
    id: `scan_${timestampId(startedAt)}`,
    projectId: input.projectId,
    siteId: input.siteId,
    authSelection: input.authSelection,
    presetId: input.presetId,
    selectedAppIds,
    enabledCategoryKeys: [...enabledCategoryKeys],
    sensitiveOptions: input.sensitiveOptions ?? [],
    startedAt: toIso(startedAt),
    finishedAt: toIso(finishedAt),
    status,
    result,
  };
}

function buildCollectors(
  categories: CaptureCategory[],
  options: { outcome: FixtureScanOutcome; warningCategoryKey?: string; failedCategoryKey?: string },
): CollectorResult[] {
  return categories.map((category) => {
    if (options.outcome === "failed" && category.key === options.failedCategoryKey) {
      return {
        key: `fixture.${category.key}`,
        label: category.label,
        kind: category.collectorKind,
        status: "failed",
        message: "Fixture required collector failed before any snapshot output was written.",
      };
    }
    if (options.outcome === "warnings" && category.key === options.warningCategoryKey) {
      return {
        key: `fixture.${category.key}`,
        label: category.label,
        kind: category.collectorKind,
        status: "skipped",
        message: "Fixture optional collector skipped; required collectors can still complete.",
      };
    }

    return {
      key: `fixture.${category.key}`,
      label: category.label,
      kind: category.collectorKind,
      status: "done",
      message: "Fixture collector completed.",
    };
  });
}

function categoriesForKeys(keys: string[]) {
  const keySet = new Set(keys);
  return CAPTURE_CATEGORIES.filter((category) => keySet.has(category.key));
}

function fixtureFailureError(): ScanResult["error"] {
  return {
    code: "REQUIRED_COLLECTOR_FAILED",
    title: "Required fixture collector failed",
    body: "A required fixture collector failed. No snapshot was written in this phase.",
    tone: "danger",
    actions: [
      { label: "Retry scan", actionKey: "retry", primary: true },
      { label: "Review scan setup", actionKey: "settings" },
    ],
    partialDataKept: false,
  };
}

function timestampId(date: Date) {
  return date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function toIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
