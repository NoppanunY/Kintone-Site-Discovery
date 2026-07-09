import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPTURE_CATEGORIES,
  defaultCategoryKeysForPreset,
  enabledCategoryKeysForDraft,
  evaluateScanRouteGuard,
  findSecretReferences,
  hasArmedSensitiveOptions,
  stringifyDeterministic,
  defaultProjectFolderPath,
  appIdsForDiscoveryScope,
  filterAppsForPicker,
  groupAppsBySpace,
  projectLocalAuthDisplayName,
  projectNameToFolderName,
  selectedAppCountsBySpace,
  validateAppSelection,
  validateKintoneDomain,
  validateLocalId,
  validateProjectName,
  validateWindowsSafeLocalPath,
  createDefaultSensitiveOptions,
  createCollisionSafeLocalId,
  validateAppIndex,
  validateCurrentSnapshotPointer,
  validateProjectAppList,
  validateProjectHistory,
  validateWindowStateSnapshot,
} from "../dist/index.js";

test("domain, project name, path, and local id validators accept safe input", () => {
  assert.equal(validateKintoneDomain("Client-A.cybozu.com").ok, true);
  assert.equal(validateProjectName("Client CRM Discovery").ok, true);
  assert.equal(validateWindowsSafeLocalPath("C:\\KintoneDiscovery\\Client CRM").ok, true);
  assert.equal(validateLocalId("project_client-crm_2026").ok, true);
});

test("validators reject unsafe domains, paths, and empty app selection", () => {
  assert.equal(validateKintoneDomain("https://client.cybozu.com").ok, false);
  assert.equal(validateProjectName("CON").ok, false);
  assert.equal(validateWindowsSafeLocalPath("..\\relative").ok, false);
  assert.equal(validateAppSelection([], ["101"]).ok, false);
});

test("preset defaults keep additional sensitive capture off", () => {
  const required = CAPTURE_CATEGORIES.filter((category) => category.tier === "required");
  const recommended = CAPTURE_CATEGORIES.filter((category) => category.tier === "recommended");
  const additional = CAPTURE_CATEGORIES.filter((category) => category.tier === "additional");

  assert.ok(required.every((category) => category.locked && category.defaultEnabled));
  assert.ok(recommended.every((category) => category.defaultEnabled));
  assert.ok(additional.every((category) => !category.defaultEnabled && category.sensitive));
  assert.deepEqual(defaultCategoryKeysForPreset("quick"), required.map((category) => category.key));
  assert.deepEqual(defaultCategoryKeysForPreset("full_discovery"), [...required, ...recommended].map((category) => category.key));
});

test("sensitive confirmation derives from actual armed options", () => {
  const options = createDefaultSensitiveOptions().map((option) => (option.categoryKey === "sample_records" ? { ...option, enabled: true } : option));

  assert.equal(hasArmedSensitiveOptions(options), true);
  assert.ok(enabledCategoryKeysForDraft("full_discovery", options).includes("sample_records"));

  const guard = evaluateScanRouteGuard({
    routePath: "/project/client/scan/confirm",
    selectedAppIds: ["101"],
    armedSensitiveOptions: [],
    appsRoutePath: "/project/client/apps",
    runRoutePath: "/project/client/scan/run",
  });
  assert.deepEqual(guard, { ok: false, redirectTo: "/project/client/scan/run", reason: "confirm_without_sensitive_options" });
});

test("scan route guard allows setup without apps but blocks the run route", () => {
  const setupGuard = evaluateScanRouteGuard({
    routePath: "/project/client/scan",
    selectedAppIds: [],
    armedSensitiveOptions: [],
    appsRoutePath: "/project/client/apps",
    scanRoutePath: "/project/client/scan",
    runRoutePath: "/project/client/scan/run",
  });
  const advancedGuard = evaluateScanRouteGuard({
    routePath: "/project/client/scan/advanced",
    selectedAppIds: [],
    armedSensitiveOptions: [],
    appsRoutePath: "/project/client/apps",
    scanRoutePath: "/project/client/scan",
    runRoutePath: "/project/client/scan/run",
  });
  const runGuard = evaluateScanRouteGuard({
    routePath: "/project/client/scan/run",
    selectedAppIds: [],
    armedSensitiveOptions: [],
    appsRoutePath: "/project/client/apps",
    scanRoutePath: "/project/client/scan",
    runRoutePath: "/project/client/scan/run",
  });
  assert.deepEqual(setupGuard, { ok: true });
  assert.deepEqual(advancedGuard, { ok: true });
  assert.deepEqual(runGuard, { ok: false, redirectTo: "/project/client/scan", reason: "no_selected_apps" });
});

test("deterministic serialization sorts keys and refuses secret-bearing metadata", () => {
  assert.equal(stringifyDeterministic({ b: 1, a: { d: 4, c: 3 } }), '{\n  "a": {\n    "c": 3,\n    "d": 4\n  },\n  "b": 1\n}\n');

  const findings = findSecretReferences({ metadata: { password: "never-write-this" } });
  assert.equal(findings.length, 1);
  assert.throws(() => stringifyDeterministic({ token: "abc" }), /Refusing to serialize/);
  assert.equal(findSecretReferences({ metadata: { harmlessKey: "sk-1234567890abcdef" } }).length, 1);
  assert.equal(findSecretReferences({ metadata: { source: "eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.signature" } }).length, 1);
  assert.equal(findSecretReferences({ id: "project_client_crm_discovery_copy_20260708100000_abcde" }).length, 0);
  assert.equal(findSecretReferences({ linkedProjectIds: ["project_client_crm_discovery_copy_20260708100000_abcde"] }).length, 0);
  assert.equal(findSecretReferences({ id: "sk-1234567890abcdef" }).length, 1);
});

test("collision-safe local IDs include suffixes and avoid existing IDs", () => {
  const options = { suffix: "20260708100000_abcde" };
  const first = createCollisionSafeLocalId("project", "Client CRM", [], options);
  const second = createCollisionSafeLocalId("project", "Client CRM", [first], options);

  assert.match(first, /^project_client_crm_20260708100000_abcde$/);
  assert.equal(second, `${first}_2`);
});

test("metadata file validators accept valid shapes and reject parseable invalid metadata", () => {
  const validApp = { id: "101", kintoneAppId: 101, name: "Sales", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" };

  assert.equal(validateProjectAppList({ schemaVersion: 1, appListFetchedAt: null, apps: [validApp] }).ok, true);
  assert.equal(validateProjectAppList({ schemaVersion: 1, appListFetchedAt: "not-a-date", apps: [validApp] }).ok, false);
  assert.equal(
    validateAppIndex({
      schemaVersion: 1,
      recentProjects: [{ projectId: "project_1", name: "Client CRM", folderPath: "C:\\Projects\\Client CRM", siteId: "site_1", lastOpenedAt: "2026-07-08T10:00:00Z" }],
    }).ok,
    true,
  );
  assert.equal(validateCurrentSnapshotPointer({ projectId: "project_1", siteId: "site_1", currentSnapshotId: null, currentSnapshotPath: null, updatedAt: null }).ok, true);
  assert.equal(validateCurrentSnapshotPointer({ projectId: "project_1", siteId: "site_1", currentSnapshotId: "snap_1", currentSnapshotPath: "../snapshots/snap_1", updatedAt: "2026-07-08T10:00:00Z" }).ok, false);
  assert.equal(validateProjectHistory({ schemaVersion: 1, runs: [] }).ok, true);
  assert.equal(validateWindowStateSnapshot({ openProjectTabs: [{ id: "project_1", title: "Client CRM", projectId: "project_1", routePath: "/project/project_1/overview" }], activeTabId: "project_1", restored: true }).ok, true);
});

test("project folder helper follows project name until user overrides path", () => {
  assert.equal(projectNameToFolderName(" Client: CRM / Discovery Copy. "), "Client CRM Discovery Copy");
  assert.equal(defaultProjectFolderPath("C:\\Users\\User\\Projects", "Client: CRM / Discovery Copy."), "C:\\Users\\User\\Projects\\Client CRM Discovery Copy");
  assert.equal(defaultProjectFolderPath("/tmp/projects", "  "), "/tmp/projects/Untitled Project");
  assert.equal(projectLocalAuthDisplayName("ca-admin@client-a"), "Project auth · ca-admin@client-a");
});

test("app picker helpers filter, group, and count selection by space", () => {
  const apps = [
    { id: "101", kintoneAppId: 101, name: "Sales", spaceName: "CRM", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
    { id: "102", kintoneAppId: 102, name: "Support", spaceName: "CRM", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
    { id: "201", kintoneAppId: 201, name: "Invoices", spaceName: "Finance", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  ];

  assert.deepEqual(
    filterAppsForPicker(apps, { query: "plugin", spaceName: "CRM" }).map((app) => app.id),
    ["101"],
  );
  assert.deepEqual(
    groupAppsBySpace(apps).map((group) => [group.spaceName, group.apps.map((app) => app.id)]),
    [
      ["CRM", ["101", "102"]],
      ["Finance", ["201"]],
    ],
  );
  assert.deepEqual(selectedAppCountsBySpace(apps, ["101", "201"]), { CRM: 1, Finance: 1 });
});

test("discovery scope helper maps onboarding scope to selected app ids", () => {
  const apps = [
    { id: "101", kintoneAppId: 101, name: "Sales", spaceName: "CRM", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
    { id: "102", kintoneAppId: 102, name: "Support", spaceName: "CRM", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
    { id: "201", kintoneAppId: 201, name: "Invoices", spaceName: "Finance", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  ];

  assert.deepEqual(appIdsForDiscoveryScope(apps, "all"), ["101", "102", "201"]);
  assert.deepEqual(appIdsForDiscoveryScope(apps, "by_space", ["CRM"]), ["101", "102"]);
  assert.deepEqual(appIdsForDiscoveryScope(apps, "later", ["CRM"]), []);
});

test("choose-later discovery draft keeps app selection empty and secret-free", () => {
  const draft = {
    project: {
      selectedAppIds: appIdsForDiscoveryScope([], "later"),
      authSelection: {
        kind: "project_local",
        displayName: "Project auth · ca-admin@client-a",
        username: "ca-admin@client-a",
        authType: "password",
        credentialStatus: "saved",
      },
    },
  };

  assert.deepEqual(draft.project.selectedAppIds, []);
  assert.equal(findSecretReferences(draft).length, 0);
  assert.match(stringifyDeterministic(draft), /"selectedAppIds": \[\]/);
});
