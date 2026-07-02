# Workspace, Profile, Account, and Site Tab Specification

This document defines the SourceTree-like workspace model for Kintone Site Discovery.

MVP 1 remains a read-only discovery and RAG knowledge-capture tool. This spec adds how users manage multiple kintone sites, credentials, folders, tabs, and per-site settings.

## 1. Product intent

The app should feel like a multi-workspace desktop tool rather than a one-time scan wizard.

Users should be able to:

- Create reusable authentication profiles/accounts.
- Connect different kintone sites with different credentials.
- Open each site in a separate tab.
- Create a new tab for another site or another local project folder.
- Open the local folder where discovery output is stored.
- Configure scan/browser/storage settings separately per site.
- Switch between sites without re-entering credentials every time.

The UI inspiration is similar to SourceTree's accounts/profiles and repository tabs, but this app is not a Git client in MVP 1.

## 2. Terminology

### 2.1 Auth Profile / Account

An Auth Profile is a reusable credential identity used to authenticate to kintone.

Examples:

- `Production Admin`
- `Client A Admin`
- `Dev Environment Admin`

An Auth Profile stores:

- Display name.
- Auth type.
- Username/login name.
- Secure credential reference.
- Optional notes.

An Auth Profile must never store the actual password/token in project files.

### 2.2 Site Workspace

A Site Workspace is one configured kintone site inside a project.

A Site Workspace combines:

- Site/domain.
- Linked Auth Profile.
- Local output folder.
- Scan settings.
- Browser capture settings.
- Last scan state.
- Knowledge output location.

Example:

```text
Site Workspace: Client A Production
Domain: client-a.cybozu.com
Auth Profile: Client A Admin
Local Folder: ~/KintoneDiscovery/client-a-production
```

### 2.3 Site Tab

A Site Tab is an open UI tab for a Site Workspace.

A tab is not the source of truth. It is a view into a Site Workspace.

Users can close a tab without deleting the Site Workspace or local data.

### 2.4 Local Folder

The Local Folder is where this site's discovery output is stored.

It contains:

```text
knowledge/
.kintone/
```

Users can open the Local Folder from the UI.

## 3. Required UX model

### 3.1 App shell

The desktop app should have a persistent app shell with:

- Top tab bar.
- Left navigation per active tab.
- Main content area.
- Site/account status area.

Suggested layout:

```text
+--------------------------------------------------------------------------------+
| [Client A Prod] [Client A Dev] [ + New Tab ]                     Account status |
+--------------------------------------------------------------------------------+
| Site nav                  | Main content                                        |
| - Overview                |                                                    |
| - Apps                    |                                                    |
| - Scan                    |                                                    |
| - Knowledge               |                                                    |
| - History                 |                                                    |
| - Settings                |                                                    |
+--------------------------------------------------------------------------------+
```

### 3.2 New tab behavior

The `+ New Tab` action should let the user choose:

1. Open existing Site Workspace.
2. Create new Site Workspace.
3. Open local project folder.
4. Import/export knowledge project later, not required for first MVP.

### 3.3 Site tab title

Tab title should prefer:

```text
<site display name>
```

Fallback:

```text
<domain>
```

If there are duplicate titles, append a short domain/account hint.

### 3.4 Tab persistence

The app should remember open tabs across restarts.

Persist:

- Open site workspace IDs.
- Active tab ID.
- Last selected left-nav route per tab.

Do not persist secrets.

## 4. Auth Profile / Account management

### 4.1 Account manager screen

The app should include an Account/Profile manager similar in spirit to tools that manage remote accounts.

Required actions:

- Create Auth Profile.
- Edit display name.
- Update username.
- Update password.
- Test authentication.
- Forget/delete credential.
- View which Site Workspaces use the profile.

### 4.2 Supported MVP auth type

MVP 1 supports:

```text
password
```

The UI should label this clearly as:

```text
Username/password authentication
```

Future auth types may include:

- OAuth.
- API token for limited collectors.
- Session/cookie import for advanced cases.

### 4.3 Credential storage

Credential storage rules:

- Store password only in OS keychain or secure credential provider.
- Project files store only `credentialRef`.
- Logs must never include username/password headers or cookies.
- Browser sessions must not be serialized to project files unless a future encrypted session store is designed.

### 4.4 Account reuse

A single Auth Profile may be reused by multiple Site Workspaces.

Example:

```text
Auth Profile: Internal Admin
  used by:
  - Dev Site Workspace
  - Staging Site Workspace
```

If deleting an Auth Profile that is still used, UI must warn and require reassignment or confirmation.

## 5. Site Workspace management

### 5.1 Create Site Workspace

Required fields:

- Site display name.
- Domain.
- Auth Profile.
- Local folder.

Optional fields:

- Default scan profile.
- Browser mode: headless/headed.
- Knowledge output language.
- Default app selection behavior.
- Plugin asset capture preferences.

### 5.2 Site Workspace settings

Each site must have separate settings.

Settings groups:

#### General

- Display name.
- Domain.
- Local folder.
- Notes.

#### Authentication

- Linked Auth Profile.
- Test connection.
- Change linked profile.
- Forget credential if profile is site-specific.

#### Scan defaults

- Default scan profile.
- Required/recommended/additional capture defaults.
- Sample record limit.
- Attachment metadata default.
- Browser screenshot default.

Required data remains required and cannot be disabled.

#### Browser capture

- Browser engine.
- Headless/headed mode.
- Login timeout.
- Page load timeout.
- Plugin settings page capture enabled/disabled default.
- Network asset capture size limit.

Plugin asset capture must remain opt-in by default.

#### Output

- Knowledge folder path.
- Raw data retention.
- Snapshot retention.
- RAG chunk output enabled.
- Open folder action.

#### Privacy/redaction

- Redaction enabled: always true for MVP 1.
- Custom sensitive key patterns.
- Whether to store raw redacted API payloads.
- Whether to include sample records in markdown.

### 5.3 Open folder behavior

Every Site Workspace should expose:

- `Open Local Folder`
- `Open Knowledge Folder`
- `Open Internal Data Folder` only in advanced mode

Opening `.kintone/` should be considered advanced.

### 5.4 Site delete behavior

Deleting a Site Workspace should not silently delete local data.

Options:

1. Remove from app only, keep local folder.
2. Remove and move local folder to trash, with confirmation.

Default should keep local folder.

## 6. Tab-specific views

Each Site Tab should provide these left-nav pages.

### 6.1 Overview

Shows:

- Domain.
- Linked Auth Profile display name.
- Local folder.
- Last connection status.
- Last scan summary.
- Quick actions:
  - Test connection.
  - Fetch apps.
  - Run scan.
  - Open local folder.

### 6.2 Apps

Shows:

- App list.
- Search/filter.
- App selection.
- Last captured status per app.

### 6.3 Scan

Shows:

- Required/recommended/additional scan categories.
- Start scan.
- Scan progress.
- Current collector.
- Warnings/errors.

### 6.4 Knowledge

Shows:

- Generated markdown outputs.
- Open AI context.
- Open dependency map.
- Export knowledge pack.

### 6.5 History

Shows:

- Previous scans for this Site Workspace.
- Scan status.
- Captured app count.
- Redaction count.
- Error count.
- Open report.

### 6.6 Settings

Shows per-site settings from section 5.2.

## 7. Data model additions

### 7.1 AuthProfile

```json
{
  "authProfileId": "auth_prod_admin_01",
  "displayName": "Production Admin",
  "authType": "password",
  "username": "admin@example.com",
  "credentialRef": "keychain:kintone-site-discovery/auth_prod_admin_01/password",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00",
  "notes": "Used for production discovery scans."
}
```

Do not add password/token/cookie fields.

### 7.2 SiteWorkspace

```json
{
  "siteWorkspaceId": "site_ws_client_a_prod",
  "displayName": "Client A Production",
  "domain": "client-a.cybozu.com",
  "authProfileId": "auth_client_a_admin",
  "localFolder": "/Users/user/KintoneDiscovery/client-a-production",
  "knowledgeFolder": "/Users/user/KintoneDiscovery/client-a-production/knowledge",
  "internalFolder": "/Users/user/KintoneDiscovery/client-a-production/.kintone",
  "settings": {
    "defaultScanProfile": "deep-scan",
    "browser": {
      "mode": "headless",
      "loginTimeoutMs": 60000,
      "pageLoadTimeoutMs": 60000,
      "pluginAssetMaxBytes": 5242880
    },
    "output": {
      "language": "en",
      "retainRawRedactedPayloads": true,
      "retainSnapshots": true
    },
    "privacy": {
      "redactionEnabled": true,
      "customSensitiveKeyPatterns": []
    }
  },
  "lastScanId": "scan_20260702_103015_abc123",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00"
}
```

### 7.3 SiteTabState

```json
{
  "openTabs": [
    {
      "tabId": "tab_client_a_prod",
      "siteWorkspaceId": "site_ws_client_a_prod",
      "route": "overview"
    }
  ],
  "activeTabId": "tab_client_a_prod"
}
```

This is UI state, not scan data.

### 7.4 ProjectConfig extension

`.kintone/project.json` should include:

```json
{
  "schemaVersion": 1,
  "projectId": "ksd_01H...",
  "projectName": "Kintone Discovery Project",
  "authProfiles": [
    {
      "authProfileId": "auth_prod_admin_01",
      "displayName": "Production Admin",
      "authType": "password",
      "username": "admin@example.com",
      "credentialRef": "keychain:kintone-site-discovery/auth_prod_admin_01/password"
    }
  ],
  "siteWorkspaces": [
    {
      "siteWorkspaceId": "site_ws_prod",
      "displayName": "Production",
      "domain": "example.cybozu.com",
      "authProfileId": "auth_prod_admin_01",
      "localFolder": "/Users/user/KintoneDiscovery/production"
    }
  ],
  "ui": {
    "openTabs": [
      {
        "tabId": "tab_prod",
        "siteWorkspaceId": "site_ws_prod",
        "route": "overview"
      }
    ],
    "activeTabId": "tab_prod"
  }
}
```

## 8. CLI impact

CLI should support the same model, even if tabs are desktop-only.

Suggested additions:

```bash
ksd auth add --name "Production Admin" --username admin@example.com
ksd auth list
ksd auth test --auth "Production Admin" --domain example.cybozu.com
ksd site add --name "Production" --domain example.cybozu.com --auth "Production Admin" --folder ./production
ksd site list
ksd site open-folder --site "Production"
ksd site settings get --site "Production"
ksd site settings set --site "Production" --key browser.mode --value headed
```

CLI output must never print secrets.

## 9. Desktop acceptance criteria

MVP desktop is acceptable when:

1. User can create an Auth Profile.
2. User can update or forget Auth Profile credentials.
3. User can create a Site Workspace linked to an Auth Profile.
4. User can set a separate local folder for each Site Workspace.
5. User can open each Site Workspace in a tab.
6. User can create a new tab.
7. User can close a tab without deleting workspace data.
8. Open tabs persist after restart.
9. User can open the local folder from the UI.
10. User can configure scan/browser/output/privacy settings per site.
11. Site-specific settings affect scans for that site only.
12. Changing an Auth Profile updates authentication for linked Site Workspaces.
13. Required scan options remain enforced even when per-site defaults are edited.
14. Secrets never appear in project files or logs.

## 10. Implementation order

Recommended order:

1. Define AuthProfile, SiteWorkspace, SiteTabState types.
2. Implement secure credential provider abstraction.
3. Implement ProjectConfig read/write.
4. Implement Account/Profile manager core functions.
5. Implement Site Workspace manager core functions.
6. Implement tab state persistence.
7. Add CLI commands for auth/site management.
8. Build desktop shell with tabs.
9. Wire existing scan flow into active Site Workspace.
10. Add per-site settings UI.

## 11. Boundary with future deploy features

These profiles and site tabs are read-only discovery contexts in MVP 1.

Do not interpret a Site Workspace as a deploy target in MVP 1.

Future safe-deploy features may reuse Site Workspace settings, credential profiles, local folders, and scan history, but deploy behavior must be specified separately.
