import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  BridgeResult,
  CredentialStoreStatus,
  ForgetCredentialRequest,
  ForgetCredentialResult,
  StoreCredentialRequest,
  StoreCredentialResult,
} from "../src/platform/bridgeTypes";

const schemaVersion = 1;
const credentialFolderName = "credentials";
const managedRefPattern = /^keychain:\/\/ksd\/(auth_profile|project_local)\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const localIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

interface CredentialCipher {
  provider: CredentialStoreStatus["provider"];
  getStatus(): Promise<CredentialStoreStatus>;
  protect(value: string): Promise<string>;
  unprotect(value: string): Promise<string>;
}

interface CredentialRecord {
  schemaVersion: number;
  keychainRef: string;
  provider: CredentialStoreStatus["provider"];
  ownerKind: StoreCredentialRequest["ownerKind"];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  encryptedValue: string;
}

interface CredentialStoreOptions {
  appDataRoot: string;
  now?: () => Date;
  cipher?: CredentialCipher;
}

export function createCredentialStore({ appDataRoot, now = () => new Date(), cipher = createDefaultCipher() }: CredentialStoreOptions) {
  const credentialRoot = path.join(appDataRoot, credentialFolderName);

  async function getStatus(): Promise<CredentialStoreStatus> {
    return cipher.getStatus();
  }

  async function storeCredential(request: StoreCredentialRequest): Promise<StoreCredentialResult> {
    const validation = validateStoreCredentialRequest(request);
    if (!validation.ok) {
      return { ok: false, code: "INVALID_INPUT", message: validation.message, credentialStatus: "no_credential" };
    }

    const status = await getStatus();
    if (!status.available) {
      return {
        ok: false,
        code: "UNAVAILABLE",
        message: status.reason ?? "Secure credential storage is unavailable.",
        credentialStatus: "no_credential",
      };
    }

    const keychainRef = isManagedKeychainRef(request.keychainRef) ? request.keychainRef : buildKeychainRef(request.ownerKind, request.ownerId);
    const filePath = credentialFilePath(keychainRef);
    const timestamp = toIso(now());
    const existing = await readCredentialRecord(keychainRef);

    try {
      const encryptedValue = await cipher.protect(request.credential);
      const record: CredentialRecord = {
        schemaVersion,
        keychainRef,
        provider: cipher.provider,
        ownerKind: request.ownerKind,
        ownerId: request.ownerId,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        encryptedValue,
      };
      await writeCredentialRecord(filePath, record);
      return { ok: true, code: "OK", message: "Credential stored securely.", keychainRef, credentialStatus: "saved" };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), keychainRef, credentialStatus: "no_credential" };
    }
  }

  async function forgetCredential(request: ForgetCredentialRequest): Promise<ForgetCredentialResult> {
    if (!isManagedKeychainRef(request.keychainRef)) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message: "Credential reference is not managed by this app.",
        keychainRef: request.keychainRef,
        credentialStatus: "no_credential",
      };
    }

    try {
      await fs.rm(credentialFilePath(request.keychainRef), { force: true });
      return { ok: true, code: "OK", message: "Credential forgotten.", keychainRef: request.keychainRef, credentialStatus: "no_credential" };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error), keychainRef: request.keychainRef, credentialStatus: "no_credential" };
    }
  }

  async function hasCredential(keychainRef: string): Promise<boolean> {
    if (!isManagedKeychainRef(keychainRef)) {
      return false;
    }

    try {
      await fs.access(credentialFilePath(keychainRef));
      return true;
    } catch {
      return false;
    }
  }

  async function readCredentialForInternalUse(keychainRef: string): Promise<BridgeResult & { credential?: string }> {
    if (!isManagedKeychainRef(keychainRef)) {
      return { ok: false, code: "INVALID_INPUT", message: "Credential reference is not managed by this app." };
    }

    const status = await getStatus();
    if (!status.available) {
      return { ok: false, code: "UNAVAILABLE", message: status.reason ?? "Secure credential storage is unavailable." };
    }

    const record = await readCredentialRecord(keychainRef);
    if (!record) {
      return { ok: false, code: "INVALID_INPUT", message: "Credential was not found." };
    }

    try {
      const credential = await cipher.unprotect(record.encryptedValue);
      return { ok: true, code: "OK", message: "Credential loaded.", credential };
    } catch (error) {
      return { ok: false, code: "IO_ERROR", message: errorMessage(error) };
    }
  }

  function credentialFilePath(keychainRef: string) {
    return path.join(credentialRoot, `${hashKeychainRef(keychainRef)}.json`);
  }

  async function readCredentialRecord(keychainRef: string): Promise<CredentialRecord | null> {
    try {
      const raw = await fs.readFile(credentialFilePath(keychainRef), "utf8");
      const parsed = JSON.parse(raw) as CredentialRecord;
      if (parsed.schemaVersion !== schemaVersion || parsed.keychainRef !== keychainRef || typeof parsed.encryptedValue !== "string") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  return {
    getStatus,
    storeCredential,
    forgetCredential,
    hasCredential,
    readCredentialForInternalUse,
  };
}

function createDefaultCipher(): CredentialCipher {
  if (process.platform !== "win32") {
    return {
      provider: "stub",
      async getStatus() {
        return {
          available: false,
          provider: "stub",
          reason: "Secure credential storage is available only in the Windows desktop runtime for this batch.",
        };
      },
      async protect() {
        throw new Error("Secure credential storage is unavailable.");
      },
      async unprotect() {
        throw new Error("Secure credential storage is unavailable.");
      },
    };
  }

  return createWindowsDpapiCipher();
}

function createWindowsDpapiCipher(): CredentialCipher {
  return {
    provider: "windows-dpapi",
    async getStatus() {
      return {
        available: true,
        provider: "windows-dpapi",
        reason: "Credentials are encrypted for the current Windows user with DPAPI.",
      };
    },
    async protect(value: string) {
      return runPowerShell(
        [
          "$plain = [Console]::In.ReadToEnd()",
          "$secure = ConvertTo-SecureString -String $plain -AsPlainText -Force",
          "$secure | ConvertFrom-SecureString",
        ].join("; "),
        value,
      );
    },
    async unprotect(value: string) {
      return runPowerShell(
        [
          "$encrypted = [Console]::In.ReadToEnd()",
          "$secure = ConvertTo-SecureString -String $encrypted",
          "$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)",
          "try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }",
        ].join("; "),
        value,
      );
    },
  };
}

async function writeCredentialRecord(filePath: string, record: CredentialRecord) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
}

function runPowerShell(script: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      reject(new Error(`Credential provider failed to start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trimEnd());
        return;
      }
      reject(new Error(`Credential provider command failed with exit code ${code ?? "unknown"}${stderr ? "." : ""}`));
    });

    child.stdin.end(input, "utf8");
  });
}

function validateStoreCredentialRequest(request: StoreCredentialRequest): { ok: true } | { ok: false; message: string } {
  if (!request || typeof request !== "object") {
    return { ok: false, message: "Credential request is required." };
  }
  if (request.ownerKind !== "auth_profile" && request.ownerKind !== "project_local") {
    return { ok: false, message: "Credential owner kind is invalid." };
  }
  if (typeof request.ownerId !== "string" || !localIdPattern.test(request.ownerId)) {
    return { ok: false, message: "Credential owner ID is invalid." };
  }
  if (typeof request.credential !== "string" || request.credential.length === 0) {
    return { ok: false, message: "Credential value is required." };
  }
  if (request.keychainRef !== undefined && request.keychainRef.trim().length === 0) {
    return { ok: false, message: "Credential reference must be non-empty when provided." };
  }
  return { ok: true };
}

function buildKeychainRef(ownerKind: StoreCredentialRequest["ownerKind"], ownerId: string) {
  return `keychain://ksd/${ownerKind}/${ownerId}`;
}

function isManagedKeychainRef(value: unknown): value is string {
  return typeof value === "string" && managedRefPattern.test(value);
}

function hashKeychainRef(keychainRef: string) {
  return createHash("sha256").update(keychainRef).digest("hex").slice(0, 32);
}

function toIso(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
