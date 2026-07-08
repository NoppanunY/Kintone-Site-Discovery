import { CAPTURE_CATEGORIES, defaultCategoryKeysForPreset, getScanPreset } from "./constants.js";
import type { CaptureCategory, Id, PresetId, SensitiveCaptureOption } from "./types.js";

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

export function enabledCategoryKeysForDraft(presetId: PresetId, sensitiveOptions: SensitiveCaptureOption[]): string[] {
  const keys = new Set(defaultCategoryKeysForPreset(presetId));
  enabledSensitiveOptions(sensitiveOptions).forEach((option) => keys.add(option.categoryKey));
  return [...keys];
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
