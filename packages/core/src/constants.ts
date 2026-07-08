import type { CaptureCategory, PresetId, ScanPreset } from "./types.js";

export const STORAGE_SCHEMA_VERSION = 1;

export const CAPTURE_CATEGORIES: CaptureCategory[] = [
  {
    key: "app_settings",
    label: "App settings",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "form_fields",
    label: "Form fields",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "form_layout",
    label: "Form layout",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "views_process_permissions",
    label: "Views, process and permissions",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "plugin_inventory",
    label: "Plugin inventory",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "customization_metadata",
    label: "Customization metadata",
    tier: "required",
    collectorKind: "required",
    locked: true,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "users_groups",
    label: "Users, groups and departments",
    tier: "recommended",
    collectorKind: "optional",
    locked: false,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "spaces",
    label: "Spaces and members",
    tier: "recommended",
    collectorKind: "optional",
    locked: false,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "app_customization_files",
    label: "App customization JS / CSS files",
    tier: "recommended",
    collectorKind: "optional",
    locked: false,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "plugin_config",
    label: "Plugin saved config",
    tier: "recommended",
    collectorKind: "optional",
    locked: false,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "dependencies_preview_diff",
    label: "Dependency detection and preview-vs-live diff",
    tier: "recommended",
    collectorKind: "optional",
    locked: false,
    sensitive: false,
    defaultEnabled: true,
  },
  {
    key: "plugin_assets",
    label: "Plugin desktop / config assets (JS/CSS/HTML)",
    tier: "additional",
    collectorKind: "optional",
    locked: false,
    sensitive: true,
    defaultEnabled: false,
  },
  {
    key: "sample_records",
    label: "Sample records",
    tier: "additional",
    collectorKind: "optional",
    locked: false,
    sensitive: true,
    defaultEnabled: false,
  },
  {
    key: "record_comments",
    label: "Record comments and attachment metadata",
    tier: "additional",
    collectorKind: "optional",
    locked: false,
    sensitive: true,
    defaultEnabled: false,
  },
  {
    key: "full_records",
    label: "Full record capture",
    tier: "additional",
    collectorKind: "optional",
    locked: false,
    sensitive: true,
    defaultEnabled: false,
  },
];

const requiredKeys = CAPTURE_CATEGORIES.filter((category) => category.tier === "required").map((category) => category.key);
const recommendedKeys = CAPTURE_CATEGORIES.filter((category) => category.tier === "recommended").map((category) => category.key);

export const SCAN_PRESETS: ScanPreset[] = [
  {
    id: "quick",
    name: "Quick Scan",
    description: "Required structure and inventory only.",
    isRecommended: false,
    includedCategoryKeys: requiredKeys,
    opensSensitiveConfig: false,
  },
  {
    id: "standard",
    name: "Standard Scan",
    description: "Required data plus recommended context.",
    isRecommended: true,
    includedCategoryKeys: [...requiredKeys, ...recommendedKeys],
    opensSensitiveConfig: false,
  },
  {
    id: "full_discovery",
    name: "Full Discovery",
    description: "Opens sensitive configuration. Additional captures remain off until selected.",
    isRecommended: false,
    includedCategoryKeys: [...requiredKeys, ...recommendedKeys],
    opensSensitiveConfig: true,
  },
];

export function getScanPreset(id: PresetId): ScanPreset {
  return SCAN_PRESETS.find((preset) => preset.id === id) ?? SCAN_PRESETS[1];
}

export function defaultCategoryKeysForPreset(id: PresetId): string[] {
  return [...getScanPreset(id).includedCategoryKeys];
}
