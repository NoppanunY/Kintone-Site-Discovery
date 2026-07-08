# Workspace, Profile, Account, and Site Tab Specification

This document defines the workspace, profile/account, site tab, page, and menu requirements for Kintone Site Discovery.

MVP 1 remains a read-only kintone data extraction and local export tool. This document does not prescribe visual layout, wireframes, spacing, panel placement, or exact screen design. It only defines what pages and menus must exist and what each page/menu is responsible for.

## Current desktop model override

The current desktop implementation has narrowed the workspace model for the next local-storage phase:

- `Connected Site` is an app-level reusable kintone target: display name and domain only.
- `Project` is the local folder/workspace and selects exactly one Connected Site.
- Auth is selected by the Project, not by the Connected Site.
- Multiple Projects may reference the same Connected Site/domain.
- A Project tab is the active desktop tab context.

Older sections in this document use `Site Workspace` for the configured site/folder/auth bundle. For current desktop UI and N4-N5 storage work, interpret that bundle as **Project + linked Connected Site + project auth selection**. Do not implement multiple sites inside one Project in the next phase.

## 1. Product intent

The app should work as a reusable multi-site desktop workspace rather than a one-time scan wizard.

Users should be able to:

- Create global reusable authentication profiles/accounts.
- Connect different kintone sites with different credentials.
- Open each site in a separate tab.
- Create a new tab for another site or another local project folder.
- Open the local folder where extracted data is stored.
- Configure scan/browser/storage settings separately per site.
- Switch between sites without re-entering credentials every time.

The UI inspiration is similar to SourceTree's account/profile and tab concepts, but this app is not a Git client and does not include AI features in MVP 1.

## 2. UI specification boundary

This spec intentionally avoids:

- Wireframes.
- Exact layout.
- Pixel-level design.
- Panel placement.
- Sidebar/header/footer requirements.
- Exact component library decisions.
- Exact iconography.

This spec defines only:

- Required pages.
- Required menus/actions.
- Responsibilities of each page and menu.
- Required data each page must display or edit.
- Required safety behavior.

Implementation may choose any layout as long as these functional requirements are met.

## 3. Terminology

### 3.1 Auth Profile / Account

An Auth Profile is a global reusable credential identity used to authenticate to kintone.

Auth Profiles belong to the app-level profile store, not to a single project. A project or Site Workspace links to a profile by `authProfileId`.

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

### 3.2 Site Workspace

A Site Workspace is one configured kintone site inside a project.

A Site Workspace combines:

- Site/domain.
- Linked Auth Profile.
- Local output folder.
- Scan settings.
- Browser capture settings.
- Last scan state.
- Reports and exports location.

Example:

```text
Site Workspace: Client A Production
Domain: client-a.cybozu.com
Auth Profile: Client A Admin
Local Folder: ~/KintoneDiscovery/client-a-production
```

### 3.3 Site Tab

A Site Tab is an open UI tab for a Site Workspace.

A tab is not the source of truth. It is a view into a Site Workspace.

Users can close a tab without deleting the Site Workspace or local data.

### 3.4 Local Folder

The Local Folder is where this site's extracted data is stored.

It contains:

```text
reports/
exports/
.kintone/
```

## 4. Required pages

The desktop app must provide these pages. The implementation may place them in tabs, a sidebar, a top menu, or any other navigation structure.

### 4.1 Project Home page

Purpose:

- Let users create or open a local project.
- Show recent projects.
- Provide access to project-level settings.

Required actions:

- Create project.
- Open project folder.
- Open recent project.
- Remove recent project entry without deleting local data.

Required information:

- Project name.
- Project local path.
- Last opened time, if available.

### 4.2 Accounts / Auth Profiles page

Purpose:

- Manage global reusable authentication identities.

Required actions:

- Create Auth Profile.
- Edit profile display name.
- Update username.
- Update password.
- Test authentication against a selected domain.
- Forget/delete stored credential.
- Delete Auth Profile.
- View which Site Workspaces use the profile.

Required information:

- Profile display name.
- Auth type.
- Username.
- Credential status, for example `saved`, `missing`, or `needs update`.
- Linked Site Workspaces and their projects.

Safety behavior:

- Never show password values.
- Never write password/token/cookie into project files.
- Warn before deleting a profile used by one or more Site Workspaces.

### 4.3 Site Workspaces page

Purpose:

- Manage configured kintone sites.

Required actions:

- Create Site Workspace.
- Edit Site Workspace.
- Delete/remove Site Workspace.
- Open Site Workspace in a tab.
- Test connection.
- Open Local Folder.
- Open Reports Folder.
- Open Exports Folder.

Required information:

- Site display name.
- Domain.
- Linked Auth Profile.
- Local folder.
- Last connection status.
- Last scan status.

Safety behavior:

- Deleting/removing a Site Workspace must not silently delete local data.
- Default delete behavior should remove the workspace from the app while keeping local files.
- If local files will be moved to trash, require explicit confirmation.

### 4.4 Site Overview page

Purpose:

- Show the current state of one Site Workspace.
- Provide quick access to common actions.

Required actions:

- Test connection.
- Fetch app list.
- Run scan.
- Open Local Folder.
- Open Reports Folder.
- Open Exports Folder.

Required information:

- Site display name.
- Domain.
- Linked Auth Profile display name.
- Local folder path.
- Last connection status.
- Last scan summary.
- Output folders status.

### 4.5 Apps page

Purpose:

- Show apps available on the selected kintone site.
- Let the user choose which apps to scan.

Required actions:

- Fetch/reload app list.
- Search apps.
- Filter apps.
- Select apps.
- Select all visible apps.
- Clear selection.

Required information:

- App name.
- App ID.
- Space or guest space information when available.
- Last captured status per app, if available.
- Whether the app has plugins/customization when known.

### 4.6 Scan page

Purpose:

- Configure and run data pull operations for the active Site Workspace.

Required actions:

- Choose apps to scan.
- Review required capture options.
- Enable/disable recommended capture options.
- Enable/disable additional capture options.
- Start scan.
- Cancel running scan.

Required information:

- Required data categories.
- Recommended data categories.
- Additional data categories.
- Scan profile.
- Selected apps.
- Current scan progress.
- Current collector.
- Warnings and errors.

Safety behavior:

- Required data options must be checked and disabled.
- Plugin asset capture must be additional and unchecked by default.
- Sample records and full records must be additional and unchecked by default.
- No scan option may update kintone.

### 4.7 Reports page

Purpose:

- Let users view generated human-readable reports.

Required actions:

- Open site summary report.
- Open apps summary report.
- Open plugins summary report.
- Open dependency report.
- Open scan report.
- Open Reports Folder.

Required information:

- Report name.
- Generated time.
- Related scan ID.
- File path.
- Missing/stale report status, if applicable.

### 4.8 Exports page

Purpose:

- Let users view generated structured export files.

Required actions:

- Open structured data export.
- Open export manifest.
- Open Exports Folder.
- Create/export package.

Required information:

- Export file name.
- Generated time.
- Related scan ID.
- File path.
- File size.
- Redaction status.

### 4.9 History page

Purpose:

- Show previous scan runs for the active Site Workspace.

Required actions:

- View scan report.
- Open reports for a scan.
- Open exports for a scan.
- Open internal scan data in advanced mode.

Required information:

- Scan ID.
- Scan start/end time.
- Scan status.
- Apps scanned.
- Collector success/failure count.
- Redaction count.
- Error/warning count.

### 4.10 Site Settings page

Purpose:

- Configure settings for one Site Workspace.

Required settings groups:

#### General

- Display name.
- Domain.
- Local folder.
- Notes.

#### Authentication

- Linked Auth Profile.
- Test connection.
- Change linked Auth Profile.
- Forget credential for the linked global Auth Profile.

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

- Reports folder path.
- Exports folder path.
- Raw data retention.
- Snapshot retention.
- Structured export enabled.
- Open folder action.

#### Privacy/redaction

- Redaction enabled: always true for MVP 1.
- Custom sensitive key patterns.
- Whether to store raw redacted API payloads.
- Whether to include sample records in markdown reports.

### 4.11 Advanced Internal Data page

Purpose:

- Provide advanced access to internal machine-managed data for debugging.

This page is optional for MVP 1 and should not be prominent for normal users.

Allowed actions:

- Open `.kintone/` folder.
- View raw/normalized output status.
- View collector result files.

Safety behavior:

- This page must warn that `.kintone/` is machine-managed.
- No editing of internal files is required or expected through the app.

## 5. Required menus and actions

The app must expose the following menus or action groups. Exact visual placement is not specified.

### 5.1 Project menu

Purpose:

- Manage local projects.

Required actions:

- New Project.
- Open Project.
- Open Recent Project.
- Project Settings.
- Close Project.

### 5.2 Account menu

Purpose:

- Manage authentication profiles.

Required actions:

- Manage Auth Profiles.
- Add Auth Profile.
- Test Auth Profile.
- Forget Credential.

### 5.3 Site menu

Purpose:

- Manage kintone site workspaces.

Required actions:

- Add Site Workspace.
- Open Site Workspace in Tab.
- Close Site Tab.
- Test Connection.
- Site Settings.
- Remove Site Workspace.

### 5.4 Scan menu

Purpose:

- Run and manage data pull operations.

Required actions:

- Fetch Apps.
- Run Scan.
- Cancel Scan.
- Open Latest Scan Report.
- Open Scan History.

### 5.5 Folder menu

Purpose:

- Open generated local folders.

Required actions:

- Open Local Folder.
- Open Reports Folder.
- Open Exports Folder.
- Open Internal Data Folder, advanced only.

### 5.6 Export menu

Purpose:

- Open or package generated export files.

Required actions:

- Open Structured Export.
- Open Export Manifest.
- Create Export Package.

### 5.7 Help menu

Purpose:

- Provide support and documentation access.

Required actions:

- Open Documentation.
- View App Version.
- View Security Notes.

## 6. Tab behavior requirements

### 6.1 New tab behavior

The New Tab action should let the user choose:

1. Open existing Site Workspace.
2. Create new Site Workspace.
3. Open local project folder.
4. Import/export project later, not required for first MVP.

### 6.2 Site tab title

Tab title should prefer:

```text
<site display name>
```

Fallback:

```text
<domain>
```

If there are duplicate titles, append a short domain/account hint.

### 6.3 Tab persistence

The app should remember open tabs across restarts.

Persist:

- Open site workspace IDs.
- Active tab ID.
- Last selected route/page per tab.

Do not persist secrets.

## 7. Auth Profile / Account management

### 7.1 Supported MVP auth type

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

### 7.2 Credential storage

Credential storage rules:

- Store password only in OS keychain or secure credential provider.
- Global profile metadata stores only `credentialRef`.
- Project files store only `authSelection` metadata and future secure credential references. They must never store the password/token/cookie itself.
- Logs must never include username/password headers or cookies.
- Browser sessions must not be serialized to project files unless a future encrypted session store is designed.

### 7.3 Account reuse

A single Auth Profile may be reused by multiple Site Workspaces across one or more projects.

If deleting an Auth Profile that is still used, UI must warn and require reassignment or confirmation.

## 8. Site Workspace management

### 8.1 Create Site Workspace

Required fields:

- Site display name.
- Domain.
- Auth Profile.
- Local folder.

Optional fields:

- Default scan profile.
- Browser mode: headless/headed.
- Report language.
- Default app selection behavior.
- Plugin asset capture preferences.

### 8.2 Open folder behavior

Every Site Workspace should expose:

- `Open Local Folder`
- `Open Reports Folder`
- `Open Exports Folder`
- `Open Internal Data Folder` only in advanced mode

Opening `.kintone/` should be considered advanced.

### 8.3 Site delete behavior

Deleting a Site Workspace should not silently delete local data.

Options:

1. Remove from app only, keep local folder.
2. Remove and move local folder to trash, with confirmation.

Default should keep local folder.

## 9. Data model additions

### 9.1 AuthProfile

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

### 9.2 SiteWorkspace

```json
{
  "siteWorkspaceId": "site_ws_client_a_prod",
  "displayName": "Client A Production",
  "domain": "client-a.cybozu.com",
  "authProfileId": "auth_client_a_admin",
  "localFolder": "/Users/user/KintoneDiscovery/client-a-production",
  "reportsFolder": "/Users/user/KintoneDiscovery/client-a-production/reports",
  "exportsFolder": "/Users/user/KintoneDiscovery/client-a-production/exports",
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

### 9.3 SiteTabState

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

## 10. CLI impact

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

## 11. Desktop acceptance criteria

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
10. User can open reports and exports folders from the UI.
11. User can configure scan/browser/output/privacy settings per site.
12. Site-specific settings affect scans for that site only.
13. Changing an Auth Profile updates authentication for linked Site Workspaces.
14. Required scan options remain enforced even when per-site defaults are edited.
15. Secrets never appear in project files or logs.
16. No built-in AI features exist.

## 12. Implementation order

Recommended order:

1. Define AuthProfile, SiteWorkspace, SiteTabState types.
2. Implement secure credential provider abstraction.
3. Implement ProjectConfig read/write.
4. Implement Account/Profile manager core functions.
5. Implement Site Workspace manager core functions.
6. Implement tab state persistence.
7. Add CLI commands for auth/site management.
8. Implement required pages and menus from this document.
9. Wire scan flow into active Site Workspace.
10. Add per-site settings behavior.

## 13. Boundary with future deploy features

These profiles and site tabs are read-only discovery contexts in MVP 1.

Do not interpret a Site Workspace as a deploy target in MVP 1.

Future safe-deploy features may reuse Site Workspace settings, credential profiles, local folders, and scan history, but deploy behavior must be specified separately.
