import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
