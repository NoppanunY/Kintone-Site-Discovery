import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCredentialStore } from "../../dist-desktop/desktop/credentialStore.cjs";
import { createWorkspaceStorage } from "../../dist-desktop/desktop/workspaceStorage.cjs";

const fixedNow = () => new Date("2026-07-08T10:00:00Z");
const fixtureCredential = "plain-fixture-value";

function fakeCipher() {
  return {
    provider: "windows-dpapi",
    async getStatus() {
      return {
        available: true,
        provider: "windows-dpapi",
        reason: "Test cipher stores protected fixture values.",
      };
    },
    async protect(value) {
      return `protected:${Buffer.from(value, "utf8").toString("base64")}`;
    },
    async unprotect(value) {
      assert.match(value, /^protected:/);
      return Buffer.from(value.slice("protected:".length), "base64").toString("utf8");
    },
  };
}

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

async function createTempCredentialStore() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ksd-credential-"));
  const appDataRoot = path.join(root, "AppData");
  return {
    root,
    appDataRoot,
    store: createCredentialStore({ appDataRoot, now: fixedNow, cipher: fakeCipher() }),
  };
}

test("credential store writes protected credential records without plaintext", async () => {
  const { appDataRoot, store } = await createTempCredentialStore();
  const result = await store.storeCredential({
    ownerKind: "auth_profile",
    ownerId: "auth_client_a",
    credential: fixtureCredential,
  });

  assert.equal(result.ok, true);
  assert.equal(result.credentialStatus, "saved");
  assert.equal(result.keychainRef, "keychain://ksd/auth_profile/auth_client_a");
  assert.equal(await store.hasCredential(result.keychainRef), true);

  const files = await fs.readdir(path.join(appDataRoot, "credentials"));
  assert.equal(files.length, 1);
  const rawRecord = await fs.readFile(path.join(appDataRoot, "credentials", files[0]), "utf8");
  assert.doesNotMatch(rawRecord, new RegExp(fixtureCredential));
  assert.match(rawRecord, /"encryptedValue"/);
  assert.match(rawRecord, /"provider": "windows-dpapi"/);

  const loaded = await store.readCredentialForInternalUse(result.keychainRef);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.credential, fixtureCredential);
});

test("credential store forgets credentials and reports no credential status", async () => {
  const { store } = await createTempCredentialStore();
  const stored = await store.storeCredential({
    ownerKind: "project_local",
    ownerId: "project_auth_client_a",
    credential: fixtureCredential,
  });

  const forgotten = await store.forgetCredential({ keychainRef: stored.keychainRef });

  assert.equal(forgotten.ok, true);
  assert.equal(forgotten.credentialStatus, "no_credential");
  assert.equal(await store.hasCredential(stored.keychainRef), false);
});

test("credential store rejects invalid write requests before creating files", async () => {
  const { appDataRoot, store } = await createTempCredentialStore();
  const result = await store.storeCredential({
    ownerKind: "auth_profile",
    ownerId: "auth_client_a",
    credential: "",
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INPUT");
  await assert.rejects(fs.readdir(path.join(appDataRoot, "credentials")), /ENOENT/);
});

test("workspace metadata stores only credential refs and status", async () => {
  const { root, appDataRoot, store } = await createTempCredentialStore();
  const storage = createWorkspaceStorage({ appDataRoot, now: fixedNow });
  const storedProfileCredential = await store.storeCredential({
    ownerKind: "auth_profile",
    ownerId: "auth_client_a",
    credential: fixtureCredential,
  });

  await storage.saveAuthProfile({
    id: "auth_client_a",
    displayName: "Client A Admin",
    username: "ca-admin@client-a",
    authType: "password",
    credentialStatus: storedProfileCredential.credentialStatus,
    keychainRef: storedProfileCredential.keychainRef,
    linkedProjectIds: [],
  });

  const rawAuthProfiles = await fs.readFile(path.join(appDataRoot, "auth-profiles.json"), "utf8");
  assert.doesNotMatch(rawAuthProfiles, new RegExp(fixtureCredential));
  assert.match(rawAuthProfiles, /keychain:\/\/ksd\/auth_profile\/auth_client_a/);

  const storedProjectCredential = await store.storeCredential({
    ownerKind: "project_local",
    ownerId: "project_auth_client_a",
    credential: fixtureCredential,
  });
  const folderPath = path.join(root, "Client CRM");
  const created = await storage.createProject({
    name: "Client CRM",
    folderPath,
    connectedSite: sampleConnectedSite(),
    authSelection: {
      kind: "project_local",
      displayName: "Local Admin",
      username: "admin@example.com",
      authType: "password",
      credentialStatus: storedProjectCredential.credentialStatus,
      keychainRef: storedProjectCredential.keychainRef,
    },
    appSummaries: [],
  });

  assert.equal(created.ok, true);
  const rawProject = await fs.readFile(path.join(folderPath, "project.json"), "utf8");
  assert.doesNotMatch(rawProject, new RegExp(fixtureCredential));
  assert.match(rawProject, /keychain:\/\/ksd\/project_local\/project_auth_client_a/);
});
