import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPTURE_CATEGORIES,
  defaultCategoryKeysForPreset,
  enabledCategoryKeysForDraft,
  enabledCategoryKeysForScanDraft,
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
  validateAuthProfile,
  validateConnectedSite,
  validateProject,
  validateWindowStateSnapshot,
  createKintoneReadOnlyClient,
  planRestMetadataCommands,
  buildKintoneScanCollectorGroups,
  calculateKintoneScanProgress,
  formatKintoneScanLogLine,
  createPasswordAuthHeader,
  redactKintoneSensitiveText,
  redactSensitiveData,
  buildFixtureScanRun,
  scanDraftFromLatestRun,
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

  assert.ok(required.every((category) => !category.locked && category.defaultEnabled));
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

test("scan draft restores preset and configure from latest history run", () => {
  const olderRun = buildFixtureScanRun({
    projectId: "project_client",
    siteId: "site_client",
    authSelection: { kind: "global_profile", authProfileId: "auth_client" },
    presetId: "quick",
    selectedAppIds: ["101"],
    startedAt: new Date("2026-07-10T04:00:00Z"),
  });
  const latestRun = buildFixtureScanRun({
    projectId: "project_client",
    siteId: "site_client",
    authSelection: { kind: "global_profile", authProfileId: "auth_client" },
    presetId: "full_discovery",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings", "form_fields", "plugin_assets"],
    sensitiveOptions: [{ categoryKey: "plugin_assets", label: "Plugin desktop / config assets (JS/CSS/HTML)", enabled: true }],
    startedAt: new Date("2026-07-10T05:00:00Z"),
  });

  const draft = scanDraftFromLatestRun([latestRun, olderRun]);

  assert.equal(draft.hydratedFromRunId, latestRun.id);
  assert.equal(draft.presetId, "full_discovery");
  assert.deepEqual(draft.enabledCategoryKeys, ["app_settings", "form_fields", "plugin_assets"]);
  assert.equal(draft.sensitiveOptions.find((option) => option.categoryKey === "plugin_assets")?.enabled, true);
});

test("scan draft category keys honor recommended toggles and sensitive opt-ins", () => {
  const keys = enabledCategoryKeysForScanDraft({
    presetId: "full_discovery",
    categoryKeys: ["users_groups", "spaces"],
    sensitiveOptions: [
      { categoryKey: "plugin_assets", label: "Plugin desktop / config assets (JS/CSS/HTML)", enabled: true },
      { categoryKey: "sample_records", label: "Sample records", enabled: false },
    ],
  });

  assert.ok(!keys.includes("app_settings"));
  assert.ok(keys.includes("users_groups"));
  assert.ok(!keys.includes("plugin_config"));
  assert.ok(keys.includes("plugin_assets"));
  assert.ok(!keys.includes("sample_records"));
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
  assert.equal(findSecretReferences({ openProjectTabs: [{ routePath: "/project/project_csi_20260710101704_h1wu5/scan" }] }).length, 0);
  assert.equal(findSecretReferences({ redirectTarget: "/project/project_csi_20260710101704_h1wu5/scan" }).length, 1);
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
  assert.equal(validateProjectAppList({ schemaVersion: 1, appListFetchedAt: null, apps: [validApp], selectedAppIds: ["101"] }).ok, true);
  assert.equal(validateProjectAppList({ schemaVersion: 1, appListFetchedAt: null, apps: [validApp], selectedAppIds: ["999"] }).ok, false);
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

test("project, site, and auth validators reject invalid timestamps and linked IDs", () => {
  const validProject = {
    id: "project_1",
    name: "Client CRM",
    folderPath: "C:\\Projects\\Client CRM",
    createdAt: "2026-07-08T10:00:00Z",
    lastOpenedAt: "2026-07-08T10:00:00Z",
    siteId: "site_1",
    authSelection: { kind: "project_local", displayName: "Local Admin", username: "admin@example.com", authType: "password", credentialStatus: "no_credential" },
    schemaVersion: 1,
  };
  const validSite = {
    id: "site_1",
    displayName: "Client A",
    domain: "client-a.cybozu.com",
    savedStatus: "saved",
    linkedProjectIds: ["project_1"],
    createdAt: "2026-07-08T10:00:00Z",
  };
  const validProfile = {
    id: "auth_1",
    displayName: "Client A Admin",
    username: "admin@example.com",
    authType: "password",
    credentialStatus: "saved",
    keychainRef: "keychain://pending/auth_1",
    linkedProjectIds: ["project_1"],
    lastTestedAt: "2026-07-08T10:00:00Z",
  };

  assert.equal(validateProject(validProject).ok, true);
  assert.equal(validateProject({ ...validProject, createdAt: "not-a-date" }).ok, false);
  assert.equal(validateProject({ ...validProject, authSelection: { ...validProject.authSelection, keychainRef: "" } }).ok, false);
  assert.equal(validateConnectedSite(validSite).ok, true);
  assert.equal(validateConnectedSite({ ...validSite, linkedProjectIds: ["../bad"] }).ok, false);
  assert.equal(validateConnectedSite({ ...validSite, createdAt: "not-a-date" }).ok, false);
  assert.equal(validateAuthProfile(validProfile).ok, true);
  assert.equal(validateAuthProfile({ ...validProfile, credentialStatus: "stored" }).ok, false);
  assert.equal(validateAuthProfile({ ...validProfile, linkedProjectIds: ["project_1", "../bad"] }).ok, false);
  assert.equal(validateAuthProfile({ ...validProfile, lastTestedAt: "not-a-date" }).ok, false);
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

test("kintone password auth header uses base64 username and password without exposing the password", () => {
  assert.equal(createPasswordAuthHeader("demo@example.com", "secret"), "ZGVtb0BleGFtcGxlLmNvbTpzZWNyZXQ=");
  assert.equal(redactKintoneSensitiveText("X-Cybozu-Authorization: ZGVtbzpwYXNz"), "X-Cybozu-Authorization: [REDACTED]");
  assert.equal(redactKintoneSensitiveText("Authorization: Bearer abc.def.ghi"), "Authorization: [REDACTED]");
});

test("redactor removes sensitive keys and token-like values before snapshot writes", () => {
  const result = redactSensitiveData({
    config: {
      apiToken: "raw-token",
      nested: {
        authorization: "Bearer abcdefghijklmnop",
      },
      safeLabel: "Customer Care",
    },
  });

  assert.equal(result.value.config.apiToken, "[REDACTED]");
  assert.equal(result.value.config.nested.authorization, "[REDACTED]");
  assert.equal(result.value.config.safeLabel, "Customer Care");
  assert.deepEqual(result.findings.map((finding) => finding.path), ["config.apiToken", "config.nested.authorization"]);
});

test("kintone app list client paginates apps and preserves kintone response order", async () => {
  const requests = [];
  const client = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    now: () => new Date("2026-07-10T05:00:00Z"),
    transport: async (request) => {
      requests.push(request);
      const url = new URL(request.url);
      const offset = Number(url.searchParams.get("offset"));
      const firstPageApps = Array.from({ length: 100 }, (_, index) => ({
        appId: String(index + 1),
        name: `App ${index + 1}`,
      }));
      const secondPageApps = [
        { appId: "201", name: "Zeta" },
        { appId: "150", name: "Alpha" },
      ];
      return {
        status: 200,
        ok: true,
        bodyText: JSON.stringify({ apps: offset === 0 ? firstPageApps : secondPageApps }),
      };
    },
  });

  const result = await client.fetchApps();

  assert.equal(result.status, "connected");
  assert.equal(result.fetchedAt, "2026-07-10T05:00:00Z");
  assert.equal(result.apps.length, 102);
  assert.deepEqual(result.apps.slice(-2).map((app) => app.id), ["201", "150"]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].headers["X-Cybozu-Authorization"], "ZGVtb0BleGFtcGxlLmNvbTpzZWNyZXQ=");
});

test("kintone app list client resolves space names for visible apps", async () => {
  const requests = [];
  const client = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    transport: async (request) => {
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/space.json")) {
        return {
          status: 200,
          ok: true,
          bodyText: JSON.stringify({ id: url.searchParams.get("id"), name: "Customer Care" }),
        };
      }

      return {
        status: 200,
        ok: true,
        bodyText: JSON.stringify({
          apps: [
            { appId: "101", name: "Support Tickets", spaceId: "42" },
            { appId: "103", name: "Support FAQ", spaceId: "42" },
            { appId: "102", name: "Standalone" },
          ],
        }),
      };
    },
  });

  const result = await client.fetchApps();

  assert.equal(result.status, "connected");
  assert.equal(result.apps[0].spaceName, "Customer Care");
  assert.equal(result.apps[1].spaceName, "Customer Care");
  assert.equal(result.apps[2].spaceName, undefined);
  assert.equal(result.message, "Fetched 3 apps from kintone. Resolved 1 space name.");
  assert.equal(requests.some((request) => request.url.includes("/k/v1/spaces.json")), false);
  assert.equal(requests.filter((request) => request.url.includes("/k/v1/space.json?id=42")).length, 1);
});

test("kintone app list client keeps space ID fallback when space lookup is inaccessible", async () => {
  const requests = [];
  const client = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    transport: async (request) => {
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/space.json")) {
        return { status: 403, ok: false, bodyText: JSON.stringify({ message: "No space permission" }) };
      }

      return {
        status: 200,
        ok: true,
        bodyText: JSON.stringify({ apps: [{ appId: "101", name: "Sales Management", spaceId: "77" }] }),
      };
    },
  });

  const result = await client.fetchApps();

  assert.equal(result.status, "connected");
  assert.equal(result.apps[0].spaceName, "Space ID 77");
  assert.equal(result.message, "Fetched 1 app from kintone. Resolved 0 of 1 space names; unresolved private or inaccessible spaces are shown by Space ID.");
  assert.equal(requests.some((request) => request.url.includes("/k/v1/space.json?id=77")), true);
});

test("kintone connection validation maps auth and permission failures", async () => {
  const authClient = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    transport: async () => ({ status: 401, ok: false, bodyText: JSON.stringify({ message: "Invalid login" }) }),
  });
  const permissionClient = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    transport: async () => ({ status: 403, ok: false, bodyText: JSON.stringify({ message: "No app permission" }) }),
  });

  assert.equal((await authClient.validateConnection()).status, "auth_failed");
  assert.equal((await permissionClient.validateConnection()).status, "permission_denied");
});

test("kintone REST command plan expands selected apps and enabled categories without API calls", () => {
  const plan = planRestMetadataCommands(
    {
      selectedApps: [
        { id: "101", kintoneAppId: 101, name: "Sales", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" },
        { id: "102", kintoneAppId: 102, name: "Support", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
      ],
      enabledCategoryKeys: ["app_settings", "sample_records", "plugin_config"],
      sensitiveOptions: [{ categoryKey: "sample_records", label: "Sample records", enabled: true, limit: 12 }],
    },
    "2026-07-10T05:00:00Z",
  );

  assert.equal(plan.commands.length, 6);
  assert.deepEqual(plan.commands.map((command) => command.endpointPath), [
    "/k/v1/app/settings.json?app=101",
    "/k/v1/preview/app/settings.json?app=101",
    "/k/v1/records.json?app=101&totalCount=true&query=limit%2012",
    "/k/v1/app/settings.json?app=102",
    "/k/v1/preview/app/settings.json?app=102",
    "/k/v1/records.json?app=102&totalCount=true&query=limit%2012",
  ]);
  assert.equal(plan.commands.every((command, index) => command.orderIndex === index && command.totalCommands === 6), true);
  assert.equal(plan.skippedCaptures.length, 1);
  assert.equal(plan.skippedCaptures[0].endpointKey, "plugin_config");
});

test("kintone REST command executor runs exactly one request and redacts the capture", async () => {
  const requests = [];
  const client = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    now: () => new Date("2026-07-10T05:00:00Z"),
    transport: async (request) => {
      requests.push(request);
      return { status: 200, ok: true, bodyText: JSON.stringify({ name: "Sales", apiToken: "raw-token" }) };
    },
  });
  const [command] = planRestMetadataCommands({
    selectedApps: [{ id: "101", kintoneAppId: 101, name: "Sales", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" }],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  }).commands;

  const capture = await client.executeRestMetadataCommand(command);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://client-a.cybozu.com/k/v1/app/settings.json?app=101");
  assert.equal(capture.status, "captured");
  assert.equal(capture.payload.apiToken, "[REDACTED]");
  assert.equal(capture.redactions.length, 1);
});

test("kintone scan progress and collector groups are derived from real commands and captures", () => {
  const plan = planRestMetadataCommands({
    selectedApps: [
      { id: "101", kintoneAppId: 101, name: "Sales", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" },
      { id: "102", kintoneAppId: 102, name: "Support", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
    ],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });
  const captures = [
    {
      categoryKey: "app_settings",
      endpointKey: "app-settings",
      label: "Sales · App settings",
      kind: "required",
      appId: "101",
      kintoneAppId: 101,
      state: "live",
      endpointPath: "/k/v1/app/settings.json?app=101",
      status: "captured",
      httpStatus: 200,
      payload: {},
      redactions: [],
      startedAt: "2026-07-10T05:00:00Z",
      finishedAt: "2026-07-10T05:00:01Z",
    },
    {
      categoryKey: "app_settings",
      endpointKey: "app-settings-preview",
      label: "Sales · App settings preview",
      kind: "required",
      appId: "101",
      kintoneAppId: 101,
      state: "preview",
      endpointPath: "/k/v1/preview/app/settings.json?app=101",
      status: "failed",
      httpStatus: 403,
      redactions: [],
      message: "No permission",
      startedAt: "2026-07-10T05:00:01Z",
      finishedAt: "2026-07-10T05:00:02Z",
    },
  ];

  const progress = calculateKintoneScanProgress(plan.commands, captures, "paused");
  const groups = buildKintoneScanCollectorGroups(plan.commands, captures, plan.commands[2]);

  assert.equal(progress.completedCount, 2);
  assert.equal(progress.totalCount, 5);
  assert.equal(progress.progressPercent, 40);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "Sales");
  assert.equal(groups[0].done, 1);
  assert.equal(groups[0].failed, 1);
  assert.equal(groups[0].status, "failed");
  assert.equal(groups[1].label, "Support");
  assert.equal(groups[1].running, 1);
  assert.equal(groups[1].queued, 1);
});

test("kintone scan log formatter redacts secret-bearing text", () => {
  const line = formatKintoneScanLogLine({
    id: "line_1",
    at: "2026-07-10T05:00:00Z",
    tone: "run",
    message: "GET /k/v1/app/settings.json Authorization: Bearer abc.def Cookie: sid=secret apiToken=raw-token",
  });

  assert.match(line.message, /Authorization: \[REDACTED\]/);
  assert.match(line.message, /Cookie: \[REDACTED\]/);
  assert.match(line.message, /apiToken=\[REDACTED\]/);
  assert.doesNotMatch(line.message, /abc\.def|sid=secret|raw-token/);
});

test("kintone REST metadata collector captures selected endpoints and redacts payloads", async () => {
  const requests = [];
  const client = createKintoneReadOnlyClient({
    domain: "client-a.cybozu.com",
    auth: { username: "demo@example.com", password: "secret" },
    now: () => new Date("2026-07-10T05:00:00Z"),
    transport: async (request) => {
      requests.push(request);
      const url = new URL(request.url);
      if (url.pathname.endsWith("/app/settings.json")) {
        return { status: 200, ok: true, bodyText: JSON.stringify({ name: "Sales", apiToken: "raw-token" }) };
      }
      if (url.pathname.endsWith("/app/plugins.json")) {
        return { status: 200, ok: true, bodyText: JSON.stringify({ plugins: [{ id: "plugin_a", name: "Approval Helper" }] }) };
      }
      if (url.pathname.endsWith("/records.json")) {
        return { status: 200, ok: true, bodyText: JSON.stringify({ records: [{ $id: { value: "1" }, secretMemo: "hide me" }] }) };
      }
      return { status: 200, ok: true, bodyText: "{}" };
    },
  });

  const collection = await client.collectRestMetadata({
    projectId: "project_client",
    siteId: "site_client",
    presetId: "full_discovery",
    selectedApps: [{ id: "101", kintoneAppId: 101, name: "Sales", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" }],
    enabledCategoryKeys: ["app_settings", "plugin_inventory", "plugin_config", "sample_records"],
    sensitiveOptions: [{ categoryKey: "sample_records", label: "Sample records", enabled: true, limit: 25 }],
  });

  assert.equal(collection.status, "completed_with_warnings");
  assert.equal(collection.result.requiredOk, 4);
  assert.equal(collection.result.requiredTotal, 4);
  assert.equal(collection.result.pluginsCaptured, 1);
  assert.ok(collection.result.redaction.totalRedactions >= 2);
  assert.ok(collection.captures.some((capture) => capture.endpointKey === "plugin_config" && capture.status === "skipped"));
  assert.equal(collection.captures.find((capture) => capture.endpointKey === "app-settings")?.payload.apiToken, "[REDACTED]");
  assert.equal(collection.captures.find((capture) => capture.endpointKey === "sample-records")?.payload.records[0].secretMemo, "[REDACTED]");
  assert.ok(requests.some((request) => request.url.includes("/k/v1/app/settings.json?app=101")));
  assert.ok(requests.some((request) => request.url.includes("/k/v1/records.json?app=101")));
});

test("fixture scan runner creates completed runs without snapshot output", () => {
  const run = buildFixtureScanRun({
    projectId: "project_client",
    siteId: "site_client",
    authSelection: { kind: "global_profile", authProfileId: "auth_client", displayName: "Client Admin" },
    presetId: "quick",
    selectedAppIds: ["201", "101"],
    outcome: "completed",
    startedAt: new Date("2026-07-10T05:00:00Z"),
  });

  assert.equal(run.id, "scan_20260710050000");
  assert.equal(run.status, "completed");
  assert.equal(run.snapshotId, undefined);
  assert.deepEqual(run.selectedAppIds, ["201", "101"]);
  assert.equal(run.result.requiredOk, run.result.requiredTotal);
  assert.equal(run.result.collectors.every((collector) => collector.kind !== "required" || collector.status === "done"), true);
});

test("fixture scan runner maps optional skips to completed with warnings", () => {
  const run = buildFixtureScanRun({
    projectId: "project_client",
    siteId: "site_client",
    authSelection: { kind: "project_local", displayName: "Local Admin", username: "admin@example.com", authType: "password" },
    presetId: "standard",
    selectedAppIds: ["101"],
    outcome: "warnings",
    startedAt: new Date("2026-07-10T05:00:00Z"),
  });

  assert.equal(run.status, "completed_with_warnings");
  assert.equal(run.result.optionalSkipped, 1);
  assert.equal(run.result.requiredOk, run.result.requiredTotal);
  assert.ok(run.result.collectors.some((collector) => collector.kind === "optional" && collector.status === "skipped"));
});

test("fixture scan runner fails on required collector failures without claiming partial snapshot data", () => {
  const run = buildFixtureScanRun({
    projectId: "project_client",
    siteId: "site_client",
    authSelection: { kind: "global_profile", authProfileId: "auth_client" },
    presetId: "quick",
    selectedAppIds: ["101", "102"],
    outcome: "failed",
    startedAt: new Date("2026-07-10T05:00:00Z"),
  });

  assert.equal(run.status, "failed");
  assert.ok(run.result.requiredOk < run.result.requiredTotal);
  assert.equal(run.result.error.code, "REQUIRED_COLLECTOR_FAILED");
  assert.equal(run.result.error.partialDataKept, false);
  assert.equal(run.result.partialSummaryPath, undefined);
  assert.equal(run.snapshotId, undefined);
});
