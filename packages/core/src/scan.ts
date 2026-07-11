import { CAPTURE_CATEGORIES, defaultCategoryKeysForPreset, getScanPreset } from "./constants.js";
import type { CaptureCategory, Id, PresetId, ScanRun, SensitiveCaptureOption } from "./types.js";

export interface ScanDraft {
  presetId: PresetId;
  enabledCategoryKeys: string[];
  sensitiveOptions: SensitiveCaptureOption[];
  hydratedFromRunId?: Id;
}

export interface EnabledCategoryKeysForScanDraftInput {
  presetId: PresetId;
  categoryKeys?: string[];
  recommendedCategoryKeys?: string[];
  sensitiveOptions?: SensitiveCaptureOption[];
  categories?: CaptureCategory[];
}

export function createDefaultSensitiveOptions(categories: CaptureCategory[] = CAPTURE_CATEGORIES): SensitiveCaptureOption[] {
  return categories
    .filter((category) => category.sensitive)
    .map((category) => ({
      categoryKey: category.key,
      label: category.label,
      enabled: false,
      meta: category.key === "sample_records" ? "redacted - max 25" : "Off by default",
      limit: category.key === "sample_records" ? 25 : undefined,
    }));
}

export function enabledSensitiveOptions(options: SensitiveCaptureOption[]): SensitiveCaptureOption[] {
  return options.filter((option) => option.enabled);
}

export function hasArmedSensitiveOptions(options: SensitiveCaptureOption[]): boolean {
  return enabledSensitiveOptions(options).length > 0;
}

export function turnOffSensitiveOptions(options: SensitiveCaptureOption[]): SensitiveCaptureOption[] {
  return options.map((option) => ({ ...option, enabled: false }));
}

export function createDefaultScanDraft(presetId: PresetId = "standard"): ScanDraft {
  return {
    presetId,
    enabledCategoryKeys: defaultCategoryKeysForPreset(presetId),
    sensitiveOptions: createDefaultSensitiveOptions(),
  };
}

export function enabledCategoryKeysForDraft(presetId: PresetId, sensitiveOptions: SensitiveCaptureOption[]): string[] {
  const keys = new Set(defaultCategoryKeysForPreset(presetId));
  enabledSensitiveOptions(sensitiveOptions).forEach((option) => keys.add(option.categoryKey));
  return [...keys];
}

export function enabledCategoryKeysForScanDraft(input: EnabledCategoryKeysForScanDraftInput): string[] {
  const categories = input.categories ?? CAPTURE_CATEGORIES;
  const defaultNonSensitiveKeys =
    input.presetId === "quick"
      ? categories.filter((category) => category.tier === "required" && category.defaultEnabled).map((category) => category.key)
      : categories.filter((category) => category.tier !== "additional" && category.defaultEnabled).map((category) => category.key);
  const configuredKeys =
    input.categoryKeys ??
    input.recommendedCategoryKeys ??
    defaultNonSensitiveKeys;
  const keys = new Set<string>(configuredKeys);
  enabledSensitiveOptions(input.sensitiveOptions ?? []).forEach((option) => keys.add(option.categoryKey));

  return categories.map((category) => category.key).filter((key) => keys.has(key));
}

export function scanDraftFromRun(run: ScanRun): ScanDraft {
  const enabledCategoryKeys = run.enabledCategoryKeys.length > 0 ? [...run.enabledCategoryKeys] : defaultCategoryKeysForPreset(run.presetId);
  return {
    presetId: run.presetId,
    enabledCategoryKeys,
    sensitiveOptions: mergeSensitiveOptionsWithDefaults(run.sensitiveOptions),
    hydratedFromRunId: run.id,
  };
}

export function scanDraftFromLatestRun(runs: ScanRun[], fallbackPresetId: PresetId = "standard"): ScanDraft {
  return runs[0] ? scanDraftFromRun(runs[0]) : createDefaultScanDraft(fallbackPresetId);
}

export type ScanStartDestination = "advanced" | "confirm" | "run";

export function nextScanDestination(presetId: PresetId, sensitiveOptions: SensitiveCaptureOption[]): ScanStartDestination {
  const preset = getScanPreset(presetId);
  if (preset.opensSensitiveConfig) {
    return "advanced";
  }

  return hasArmedSensitiveOptions(sensitiveOptions) ? "confirm" : "run";
}

export interface ScanRouteGuardInput {
  routePath: string;
  selectedAppIds: Id[];
  armedSensitiveOptions: SensitiveCaptureOption[];
  appsRoutePath: string;
  scanRoutePath?: string;
  runRoutePath: string;
}

export type ScanRouteGuardResult =
  | { ok: true }
  | { ok: false; redirectTo: string; reason: "no_selected_apps" | "confirm_without_sensitive_options" };

export function evaluateScanRouteGuard(input: ScanRouteGuardInput): ScanRouteGuardResult {
  if (input.routePath.endsWith("/scan/run") && input.selectedAppIds.length === 0) {
    return { ok: false, redirectTo: input.scanRoutePath ?? input.appsRoutePath, reason: "no_selected_apps" };
  }

  if (input.routePath.endsWith("/scan/confirm") && !hasArmedSensitiveOptions(input.armedSensitiveOptions)) {
    return { ok: false, redirectTo: input.runRoutePath, reason: "confirm_without_sensitive_options" };
  }

  return { ok: true };
}

function mergeSensitiveOptionsWithDefaults(options: SensitiveCaptureOption[]) {
  const byKey = new Map(options.map((option) => [option.categoryKey, option]));
  return createDefaultSensitiveOptions().map((defaultOption) => {
    const storedOption = byKey.get(defaultOption.categoryKey);
    return storedOption
      ? {
          ...defaultOption,
          label: storedOption.label || defaultOption.label,
          enabled: storedOption.enabled,
          meta: storedOption.meta ?? defaultOption.meta,
          limit: storedOption.limit ?? defaultOption.limit,
        }
      : defaultOption;
  });
}
