import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createWorkspaceStorage } from "../../dist-desktop/desktop/workspaceStorage.cjs";

const fixedNow = () => new Date("2026-07-08T10:00:00Z");

function sampleConnectedSite() {
  return {
    id: "site_client_a",
    displayName: "Client A Production",
    domain: "client-a.cybozu.com",
    savedStatus: "saved",
    linkedProjectIds: [],
    createdAt: "2026-07-08T10:00:00Z",
  };
}

function sampleAuthProfile() {
  return {
    id: "auth_client_a",
    displayName: "Client A Admin",
    username: "ca-admin@client-a",
    authType: "password",
    credentialStatus: "saved",
    keychainRef: "keychain://pending/auth_client_a",
    linkedProjectIds: [],
  };
}

async function createTempStorage() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ksd-storage-"));
  return {
    root,
    storage: createWorkspaceStorage({ appDataRoot: path.join(root, "AppData"), now: fixedNow }),
  };
}

test("storage creates project metadata layout and reads it back", async () => {
  const { root, storage } = await createTempStorage();
  const folderPath = path.join(root, "Client CRM");
  const result = await storage.createProject({
    name: "Client CRM",
    folderPath,
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: "auth_client_a" },
    authProfile: sampleAuthProfile(),
    appSummaries: [
      {
        id: "101",
        kintoneAppId: 101,
        name: "Sales Management",
        isGuestSpace: false,
        hasPlugins: true,
        hasCustomization: true,
        captureStatus: "not_captured",
      },
    ],
  });

  assert.equal(result.ok, true);
  await Promise.all([
    fs.access(path.join(folderPath, "project.json")),
    fs.access(path.join(folderPath, "connected-site.json")),
    fs.access(path.join(folderPath, "app-list.json")),
    fs.access(path.join(folderPath, "current.json")),
    fs.access(path.join(folderPath, "history.json")),
    fs.access(path.join(folderPath, "snapshots")),
    fs.access(path.join(folderPath, ".kintone", "raw")),
    fs.access(path.join(folderPath, ".app", "schema-version.json")),
  ]);

  const home = await storage.readWorkspaceHome();
  assert.equal(home.projects.length, 1);
  assert.equal(home.connectedSites.length, 1);
  assert.equal(home.authProfiles.length, 1);
});

test("storage reports corrupt project JSON as recoverable", async () => {
  const { root, storage } = await createTempStorage();
  const folderPath = path.join(root, "Client CRM");
  await storage.createProject({
    name: "Client CRM",
    folderPath,
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "project_local", displayName: "Local Admin", username: "admin@example.com", authType: "password", credentialStatus: "no_credential" },
    appSummaries: [],
  });

  await fs.writeFile(path.join(folderPath, "project.json"), "{not-json", "utf8");
  const home = await storage.readWorkspaceHome();
  assert.equal(home.projects.length, 0);
  assert.ok(home.errors.some((issue) => issue.code === "corrupt_json" && issue.recoverable));
});

test("window state persists open tabs", async () => {
  const { storage } = await createTempStorage();
  await storage.writeWindowState({
    openProjectTabs: [{ id: "project_client_crm", title: "Client CRM", projectId: "project_client_crm", routePath: "/project/project_client_crm/overview" }],
    activeTabId: "project_client_crm",
    restored: true,
  });

  const restored = await storage.readWindowState();
  assert.equal(restored.restored, true);
  assert.equal(restored.activeTabId, "project_client_crm");
  assert.equal(restored.openProjectTabs.length, 1);
});

test("storage updates project metadata and preserves local project folder", async () => {
  const { root, storage } = await createTempStorage();
  const folderPath = path.join(root, "Client CRM");
  await storage.createProject({
    name: "Client CRM",
    folderPath,
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: "auth_client_a" },
    authProfile: sampleAuthProfile(),
    appSummaries: [],
  });

  await storage.saveConnectedSite({
    id: "site_client_b",
    displayName: "Client B",
    domain: "client-b.cybozu.com",
    savedStatus: "saved",
    linkedProjectIds: [],
    createdAt: "2026-07-08T10:00:00Z",
  });
  await storage.saveAuthProfile({
    id: "auth_client_b",
    displayName: "Client B Admin",
    username: "admin@client-b",
    authType: "password",
    credentialStatus: "saved",
    keychainRef: "keychain://pending/auth_client_b",
    linkedProjectIds: [],
  });

  const update = await storage.updateProjectMetadata({
    projectId: "project_client_crm",
    name: "Client CRM Review",
    siteId: "site_client_b",
    authSelection: { kind: "global_profile", authProfileId: "auth_client_b" },
  });

  assert.equal(update.ok, true);
  const readBack = await storage.readProjectAt(folderPath);
  assert.equal(readBack.project.name, "Client CRM Review");
  assert.equal(readBack.project.siteId, "site_client_b");
  assert.equal(readBack.connectedSite.domain, "client-b.cybozu.com");
  await fs.access(folderPath);
});

test("storage removes project from app metadata only", async () => {
  const { root, storage } = await createTempStorage();
  const folderPath = path.join(root, "Client CRM");
  await storage.createProject({
    name: "Client CRM",
    folderPath,
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: "auth_client_a" },
    authProfile: sampleAuthProfile(),
    appSummaries: [],
  });

  const removed = await storage.removeProjectFromApp("project_client_crm");
  assert.equal(removed.ok, true);
  const home = await storage.readWorkspaceHome();
  assert.equal(home.projects.length, 0);
  assert.deepEqual(home.connectedSites[0].linkedProjectIds, []);
  assert.deepEqual(home.authProfiles[0].linkedProjectIds, []);
  await fs.access(path.join(folderPath, "project.json"));
});

test("storage removes unlinked site and auth profile metadata", async () => {
  const { storage } = await createTempStorage();
  await storage.saveConnectedSite(sampleConnectedSite());
  await storage.saveAuthProfile(sampleAuthProfile());

  const siteRemove = await storage.removeConnectedSite("site_client_a");
  const authRemove = await storage.removeAuthProfile("auth_client_a");
  assert.equal(siteRemove.ok, true);
  assert.equal(authRemove.ok, true);

  const home = await storage.readWorkspaceHome();
  assert.equal(home.connectedSites.length, 0);
  assert.equal(home.authProfiles.length, 0);
});

test("storage allows site and auth removal after linked project is removed from app metadata", async () => {
  const { root, storage } = await createTempStorage();
  await storage.createProject({
    name: "Client CRM",
    folderPath: path.join(root, "Client CRM"),
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: "auth_client_a" },
    authProfile: sampleAuthProfile(),
    appSummaries: [],
  });

  const projectRemove = await storage.removeProjectFromApp("project_client_crm");
  const siteRemove = await storage.removeConnectedSite("site_client_a");
  const authRemove = await storage.removeAuthProfile("auth_client_a");

  assert.equal(projectRemove.ok, true);
  assert.equal(siteRemove.ok, true);
  assert.equal(authRemove.ok, true);
});

test("storage rejects removing linked site and auth profile metadata", async () => {
  const { root, storage } = await createTempStorage();
  await storage.createProject({
    name: "Client CRM",
    folderPath: path.join(root, "Client CRM"),
    connectedSite: sampleConnectedSite(),
    authSelection: { kind: "global_profile", authProfileId: "auth_client_a" },
    authProfile: sampleAuthProfile(),
    appSummaries: [],
  });

  const siteRemove = await storage.removeConnectedSite("site_client_a");
  const authRemove = await storage.removeAuthProfile("auth_client_a");
  assert.equal(siteRemove.ok, false);
  assert.equal(siteRemove.code, "CONFLICT");
  assert.equal(authRemove.ok, false);
  assert.equal(authRemove.code, "CONFLICT");
});

test("storage updates auth credential status without writing password fields", async () => {
  const { storage } = await createTempStorage();
  await storage.saveAuthProfile({
    ...sampleAuthProfile(),
    credentialStatus: "needs_update",
  });

  const update = await storage.updateAuthProfile({
    ...sampleAuthProfile(),
    displayName: "Client A Admin",
    username: "ca-admin@client-a",
    credentialStatus: "saved",
  });

  assert.equal(update.ok, true);
  const home = await storage.readWorkspaceHome();
  assert.equal(home.authProfiles[0].credentialStatus, "saved");
});

test("storage refuses to serialize secret-bearing metadata", async () => {
  const { storage } = await createTempStorage();
  const result = await storage.saveAuthProfile({
    ...sampleAuthProfile(),
    password: "do-not-write",
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /secret-bearing metadata key/i);
});
