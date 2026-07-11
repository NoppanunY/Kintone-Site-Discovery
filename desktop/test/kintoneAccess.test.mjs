import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createKintoneAccessService } from "../../dist-desktop/desktop/kintoneAccess.cjs";
import { createWorkspaceStorage } from "../../dist-desktop/desktop/workspaceStorage.cjs";

const fixedNow = () => new Date("2026-07-10T05:00:00Z");

function sampleConnectedSite() {
  return {
    id: "site_client_a",
    displayName: "Client A Production",
    domain: "client-a.cybozu.com",
    savedStatus: "saved",
    linkedProjectIds: [],
    createdAt: "2026-07-10T05:00:00Z",
  };
}

function sampleAuthProfile(credentialStatus = "saved") {
  return {
    id: "auth_client_a",
    displayName: "Client A Admin",
    username: "ca-admin@client-a",
    authType: "password",
    credentialStatus,
    keychainRef: "keychain://ksd/auth_profile/auth_client_a",
    linkedProjectIds: [],
  };
}

async function createProjectStorage(authProfile = sampleAuthProfile()) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ksd-kintone-access-"));
  const storage = createWorkspaceStorage({ appDataRoot: path.join(root, "AppData"), now: fixedNow });
  const created = await storage.createProject({
    name: "Client CRM",
    folderPath: path.join(root, "Client CRM"),
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: authProfile.id },
    authProfile,
    appSummaries: [
      {
        id: "101",
        kintoneAppId: 101,
        name: "Old Sales",
        isGuestSpace: false,
        hasPlugins: false,
        hasCustomization: false,
        captureStatus: "not_captured",
      },
      {
        id: "102",
        kintoneAppId: 102,
        name: "Old Support",
        isGuestSpace: false,
        hasPlugins: false,
        hasCustomization: false,
        captureStatus: "not_captured",
      },
    ],
  });

  return { root, storage, project: created.project };
}

function capturedCommand(command, overrides = {}) {
  return {
    categoryKey: command.categoryKey,
    endpointKey: command.endpointKey,
    label: command.label,
    kind: command.kind,
    appId: command.appId,
    kintoneAppId: command.kintoneAppId,
    state: command.state,
    endpointPath: command.endpointPath,
    status: "captured",
    httpStatus: 200,
    payload: { ok: true },
    redactions: [],
    message: "Captured from test client.",
    startedAt: "2026-07-10T05:00:00Z",
    finishedAt: "2026-07-10T05:00:01Z",
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function waitForScanProgress(service, sessionId, predicate, label = "scan progress") {
  const deadline = Date.now() + 3000;
  let last;
  while (Date.now() < deadline) {
    const result = await service.getKintoneScanRunProgress({ sessionId });
    assert.equal(result.ok, true);
    last = result.progress;
    if (predicate(last)) {
      return last;
    }
    await delay(10);
  }

  assert.fail(`${label} timed out; last status ${last?.status ?? "unknown"}, completed ${last?.completedCount ?? "?"}/${last?.totalCount ?? "?"}`);
}

test("kintone access validates connection through saved credential without exposing the credential", async () => {
  const { storage, project } = await createProjectStorage();
  const seen = [];
  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse(keychainRef) {
        seen.push(["credential", keychainRef]);
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: ({ domain, auth }) => {
      seen.push(["client", domain, auth.username, auth.password]);
      return {
        async validateConnection() {
          return { status: "connected", checkedAt: "2026-07-10T05:00:00Z", message: "Connected." };
        },
        async fetchApps() {
          throw new Error("fetchApps should not be called");
        },
      };
    },
  });

  const result = await service.validateKintoneConnection({ projectId: project.id });

  assert.equal(result.ok, true);
  assert.equal(result.status, "connected");
  assert.equal(result.message, "Connected.");
  assert.deepEqual(seen, [
    ["credential", "keychain://ksd/auth_profile/auth_client_a"],
    ["client", "client-a.cybozu.com", "ca-admin@client-a", "secret"],
  ]);
  assert.equal("credential" in result, false);
});

test("kintone access fetches apps, preserves selected ids, and writes fetched timestamp", async () => {
  const { storage, project } = await createProjectStorage();
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Old Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
    {
      id: "102",
      kintoneAppId: 102,
      name: "Old Support",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["102"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        return {
          status: "connected",
          fetchedAt: "2026-07-10T05:00:00Z",
          message: "Fetched 2 apps from kintone.",
          apps: [
            {
              id: "201",
              kintoneAppId: 201,
              name: "New Finance",
              isGuestSpace: false,
              hasPlugins: false,
              hasCustomization: false,
              captureStatus: "not_captured",
            },
            {
              id: "102",
              kintoneAppId: 102,
              name: "Support",
              isGuestSpace: false,
              hasPlugins: false,
              hasCustomization: false,
              captureStatus: "not_captured",
            },
          ],
        };
      },
    }),
  });

  const result = await service.fetchKintoneAppList({ projectId: project.id });
  const home = await storage.readWorkspaceHome();

  assert.equal(result.ok, true);
  assert.deepEqual(result.apps.map((app) => app.id), ["201", "102"]);
  assert.deepEqual(result.appList.selectedAppIds, ["102"]);
  assert.equal(home.projectAppListsByProjectId[project.id].appListFetchedAt, "2026-07-10T05:00:00Z");
});

test("kintone access returns no_credential before creating a client when credential is missing", async () => {
  const { storage, project } = await createProjectStorage(sampleAuthProfile("no_credential"));
  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        throw new Error("Credential store should not be read");
      },
    },
    createClient: () => {
      throw new Error("Client should not be created");
    },
  });

  const result = await service.validateKintoneConnection({ projectId: project.id });

  assert.equal(result.ok, false);
  assert.equal(result.status, "no_credential");
  assert.match(result.message, /saved credential/i);
});

test("kintone access scan writes a local snapshot, current pointer, and history", async () => {
  const { storage, project } = await createProjectStorage();
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["101"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by normal scan sessions");
      },
      async executeRestMetadataCommand(command) {
        return capturedCommand(command, {
          payload: command.endpointKey === "app-settings" ? { name: "Sales", apiToken: "[REDACTED]" } : { name: "Sales preview" },
          redactions: command.endpointKey === "app-settings" ? [{ path: "apiToken", reason: "sensitive-key:apiToken", replacement: "[REDACTED]" }] : [],
        });
      },
    }),
  });

  const started = await service.startKintoneScanRun({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });
  assert.equal(started.ok, true);
  assert.match(started.sessionId, /^scan_run_/);

  const active = await service.getActiveKintoneScanRun({ projectId: project.id });
  assert.equal(active.ok, true);
  assert.equal(active.progress.sessionId, started.sessionId);

  const progress = await waitForScanProgress(service, started.sessionId, (state) => state.status === "completed" && state.run, "completed scan");
  const current = JSON.parse(await fs.readFile(path.join(project.folderPath, "current.json"), "utf8"));
  const history = await storage.getProjectScanHistory(project.id);
  const manifestPath = path.join(project.folderPath, "snapshots", progress.run.snapshotId, "manifest.json");
  const payloadPath = path.join(project.folderPath, "snapshots", progress.run.snapshotId, "data", "apps", "101", "live", "app-settings.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const payloadText = await fs.readFile(payloadPath, "utf8");

  assert.equal(progress.run.status, "completed");
  assert.equal(progress.progressPercent, 100);
  assert.equal(current.currentSnapshotId, progress.run.snapshotId);
  assert.equal(history.runs.length, 1);
  assert.equal(history.runs[0].snapshotId, progress.run.snapshotId);
  assert.equal(manifest.isCurrent, true);
  assert.match(payloadText, /"\[REDACTED\]"/);
  assert.doesNotMatch(payloadText, /secret/);
  assert.ok(progress.logLines.some((line) => line.message.includes("GET /k/v1/app/settings.json?app=101")));
  assert.ok(progress.logLines.some((line) => line.message.includes("HTTP 200")));
});

test("kintone normal scan returns a live session before all API commands finish", async () => {
  const { storage, project } = await createProjectStorage();
  const firstCommandGate = createDeferred();
  const executed = [];
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["101"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by normal scan sessions");
      },
      async executeRestMetadataCommand(command) {
        executed.push(command.endpointPath);
        if (executed.length === 1) {
          await firstCommandGate.promise;
        }
        return capturedCommand(command);
      },
    }),
  });

  const started = await service.startKintoneScanRun({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });

  assert.equal(started.ok, true);
  assert.equal(executed.length, 1);
  assert.equal(started.progress.completedCount, 0);
  assert.equal(started.progress.totalCount, 3);
  const active = await service.getActiveKintoneScanRun({ projectId: project.id });
  assert.equal(active.ok, true);
  assert.equal(active.progress.status, "running");
  assert.match(active.progress.currentCommand.endpointPath, /app\/settings\.json\?app=101$/);

  firstCommandGate.resolve();
  const finished = await waitForScanProgress(service, started.sessionId, (state) => state.status === "completed" && state.run, "live session completion");

  assert.equal(executed.length, 2);
  assert.equal(finished.completedCount, 3);
  assert.equal(finished.progressPercent, 100);
});

test("kintone normal scan pauses on API error until resumed", async () => {
  const { storage, project } = await createProjectStorage();
  let commandIndex = 0;
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["101"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by normal scan sessions");
      },
      async executeRestMetadataCommand(command) {
        commandIndex += 1;
        if (commandIndex === 1) {
          return capturedCommand(command, {
            status: "failed",
            httpStatus: 500,
            payload: undefined,
            message: "Server error.",
            errorCode: "SERVER_ERROR",
          });
        }
        return capturedCommand(command);
      },
    }),
  });

  const started = await service.startKintoneScanRun({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
    errorMode: "pause_on_error",
  });
  const paused = await waitForScanProgress(service, started.sessionId, (state) => state.status === "paused", "paused scan");

  assert.equal(commandIndex, 1);
  assert.equal(paused.captures[0].status, "failed");
  assert.match(paused.nextCommand.endpointPath, /preview\/app\/settings\.json\?app=101$/);
  assert.ok(paused.logLines.some((line) => line.message.includes("scan paused after API error")));

  await delay(30);
  assert.equal(commandIndex, 1);

  const resumed = await service.resumeKintoneScanRun({ sessionId: started.sessionId });
  assert.equal(resumed.ok, true);
  const finished = await waitForScanProgress(service, started.sessionId, (state) => state.status === "failed" && state.run, "failed scan after resume");
  const current = JSON.parse(await fs.readFile(path.join(project.folderPath, "current.json"), "utf8"));
  const manifest = JSON.parse(await fs.readFile(path.join(project.folderPath, "snapshots", finished.run.snapshotId, "manifest.json"), "utf8"));

  assert.equal(commandIndex, 2);
  assert.equal(finished.run.status, "failed");
  assert.equal(current.currentSnapshotId, null);
  assert.equal(manifest.isCurrent, false);
});

test("kintone normal scan can continue after API error without pausing", async () => {
  const { storage, project } = await createProjectStorage();
  let commandIndex = 0;
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["101"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by normal scan sessions");
      },
      async executeRestMetadataCommand(command) {
        commandIndex += 1;
        if (commandIndex === 1) {
          return capturedCommand(command, {
            status: "failed",
            httpStatus: 500,
            payload: undefined,
            message: "Server error.",
            errorCode: "SERVER_ERROR",
          });
        }
        return capturedCommand(command);
      },
    }),
  });

  const started = await service.startKintoneScanRun({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
    errorMode: "continue_on_error",
  });
  const finished = await waitForScanProgress(service, started.sessionId, (state) => state.status === "failed" && state.run, "continued failed scan");

  assert.equal(commandIndex, 2);
  assert.equal(finished.captures[0].status, "failed");
  assert.equal(finished.captures[1].status, "captured");
  assert.equal(finished.run.status, "failed");
  assert.equal(finished.logLines.some((line) => line.message.includes("scan paused after API error")), false);
});

test("kintone normal scan cancel stops before writing a snapshot", async () => {
  const { storage, project } = await createProjectStorage();
  const firstCommandGate = createDeferred();
  let commandIndex = 0;
  await storage.updateProjectAppList(project.id, [
    {
      id: "101",
      kintoneAppId: 101,
      name: "Sales",
      isGuestSpace: false,
      hasPlugins: false,
      hasCustomization: false,
      captureStatus: "not_captured",
    },
  ], ["101"]);

  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by normal scan sessions");
      },
      async executeRestMetadataCommand(command) {
        commandIndex += 1;
        await firstCommandGate.promise;
        return capturedCommand(command);
      },
    }),
  });

  const started = await service.startKintoneScanRun({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });
  assert.equal(commandIndex, 1);

  const cancelled = await service.cancelKintoneScanRun({ sessionId: started.sessionId });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.progress.status, "cancelled");
  firstCommandGate.resolve();
  await delay(30);

  const progress = await service.getKintoneScanRunProgress({ sessionId: started.sessionId });
  const current = JSON.parse(await fs.readFile(path.join(project.folderPath, "current.json"), "utf8"));
  const history = await storage.getProjectScanHistory(project.id);

  assert.equal(progress.ok, true);
  assert.equal(progress.progress.status, "cancelled");
  assert.equal(commandIndex, 1);
  assert.equal(current.currentSnapshotId, null);
  assert.equal(history.runs.length, 0);
});

test("kintone debug scan session plans without API calls and runs one command per Next", async () => {
  const { storage, project } = await createProjectStorage();
  const executed = [];
  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by debug sessions");
      },
      async executeRestMetadataCommand(command) {
        executed.push(command.endpointPath);
        return capturedCommand(command);
      },
    }),
  });

  const created = await service.createKintoneScanDebugSession({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });

  assert.equal(created.ok, true);
  assert.equal(executed.length, 0);
  assert.equal(created.session.totalCount, 2);
  assert.equal(created.session.completedCount, 0);
  assert.match(created.session.nextCommand.endpointPath, /app\/settings\.json\?app=101$/);

  const first = await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });
  assert.equal(first.ok, true);
  assert.equal(executed.length, 1);
  assert.equal(first.session.completedCount, 1);
  assert.equal(first.session.done, false);

  const second = await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });
  assert.equal(second.ok, true);
  assert.equal(executed.length, 2);
  assert.equal(second.session.completedCount, 2);
  assert.equal(second.session.done, true);
});

test("kintone debug scan finish writes snapshot, current pointer, and history after all commands", async () => {
  const { storage, project } = await createProjectStorage();
  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by debug sessions");
      },
      async executeRestMetadataCommand(command) {
        return capturedCommand(command);
      },
    }),
  });

  const created = await service.createKintoneScanDebugSession({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });
  await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });
  await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });

  const result = await service.finishKintoneScanDebugSession({ sessionId: created.session.sessionId });
  const current = JSON.parse(await fs.readFile(path.join(project.folderPath, "current.json"), "utf8"));
  const history = await storage.getProjectScanHistory(project.id);

  assert.equal(result.ok, true);
  assert.equal(result.run.status, "completed");
  assert.equal(current.currentSnapshotId, result.run.snapshotId);
  assert.equal(history.runs.length, 1);
  assert.equal(history.runs[0].snapshotId, result.run.snapshotId);
});

test("kintone debug scan required failure writes partial snapshot without updating current", async () => {
  const { storage, project } = await createProjectStorage();
  let commandIndex = 0;
  const service = createKintoneAccessService({
    storage,
    credentialStore: {
      async readCredentialForInternalUse() {
        return { ok: true, code: "OK", message: "Credential loaded.", credential: "secret" };
      },
    },
    createClient: () => ({
      async validateConnection() {
        throw new Error("validateConnection should not be called");
      },
      async fetchApps() {
        throw new Error("fetchApps should not be called");
      },
      async collectRestMetadata() {
        throw new Error("collectRestMetadata should not be called by debug sessions");
      },
      async executeRestMetadataCommand(command) {
        commandIndex += 1;
        if (commandIndex === 1) {
          return capturedCommand(command, {
            status: "failed",
            httpStatus: 403,
            payload: undefined,
            message: "No app permission.",
            errorCode: "PERMISSION_DENIED",
          });
        }
        return capturedCommand(command);
      },
    }),
  });

  const created = await service.createKintoneScanDebugSession({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });
  await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });
  await service.runNextKintoneScanDebugCommand({ sessionId: created.session.sessionId });

  const result = await service.finishKintoneScanDebugSession({ sessionId: created.session.sessionId });
  const current = JSON.parse(await fs.readFile(path.join(project.folderPath, "current.json"), "utf8"));
  const manifest = JSON.parse(await fs.readFile(path.join(project.folderPath, "snapshots", result.run.snapshotId, "manifest.json"), "utf8"));

  assert.equal(result.ok, true);
  assert.equal(result.run.status, "failed");
  assert.equal(current.currentSnapshotId, null);
  assert.equal(manifest.isCurrent, false);
});

test("kintone debug scan sessions are unavailable when dev sessions are disabled", async () => {
  const { storage, project } = await createProjectStorage();
  const service = createKintoneAccessService({
    storage,
    allowDebugSessions: false,
    credentialStore: {
      async readCredentialForInternalUse() {
        throw new Error("Credential store should not be read");
      },
    },
    createClient: () => {
      throw new Error("Client should not be created");
    },
  });

  const result = await service.createKintoneScanDebugSession({
    projectId: project.id,
    presetId: "quick",
    selectedAppIds: ["101"],
    enabledCategoryKeys: ["app_settings"],
    sensitiveOptions: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "UNAVAILABLE");
});
