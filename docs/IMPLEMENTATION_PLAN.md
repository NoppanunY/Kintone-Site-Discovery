# Implementation Plan

This plan turns the MVP 1 spec into development work that Codex can execute incrementally.

MVP 1 is a read-only kintone data extraction and local export tool. It must not include built-in AI features.

## 1. Recommended repository structure

Start with a TypeScript workspace. Exact package manager can be chosen during implementation, but `pnpm` is recommended.

```text
repo-root/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  AGENTS.md
  README.md
  docs/
    MVP1_SPEC.md
    DATA_MODEL.md
    WORKSPACE_PROFILE_SPEC.md
    IMPLEMENTATION_PLAN.md

  packages/
    core/
      src/
        auth/
        collectors/
        normalizers/
        redaction/
        reports/
        exports/
        dependencies/
        storage/
        types/
      tests/

    test-fixtures/
      kintone-api/
      browser-capture/
      expected-output/

  apps/
    cli/
      src/
    desktop/
      src/
```

Keep core behavior in `packages/core`. Desktop and CLI should call the same core API.

## 2. Milestone overview

### Milestone 1A: Foundation, profile model, and scan model

Goal: establish project structure, domain types, profile/site workspace types, capture options, redaction, and normalization.

Deliverables:

- TypeScript workspace.
- Core package.
- Domain types for project, auth profile, site workspace, site tab state, scan job, collector result, app model, plugin model, structured export record.
- Capture option defaults.
- Redaction utility.
- Deterministic JSON normalization utility.
- Unit tests.

Exit criteria:

- `pnpm test` or equivalent passes.
- Capture option defaults match `docs/MVP1_SPEC.md`.
- Auth profile/site workspace models match `docs/WORKSPACE_PROFILE_SPEC.md`.
- Redaction tests prove no obvious secrets leak.
- Normalization output is deterministic.

### Milestone 1B: REST API collector

Goal: capture required kintone metadata/settings through REST APIs.

Deliverables:

- Kintone REST client wrapper.
- Password authentication header builder using secure credential source abstraction.
- App list collector.
- App settings collectors for required categories.
- Live/preview support where endpoint supports it.
- Per-endpoint collector result reporting.
- Fixture-driven tests using mocked responses.

Exit criteria:

- Can run a mocked scan for two apps and write normalized output.
- Collector failures are partial-success friendly.
- No write/update REST endpoints are implemented.

### Milestone 1C: Reports and structured export builder

Goal: generate markdown reports and structured JSONL export files from normalized captures.

Deliverables:

- Markdown report generator.
- Structured export JSONL generator.
- Export manifest generator.
- Dependency extraction heuristics for fields, lookups, related records, permissions, views, process, app actions, customization metadata.
- Tests against fixture input.

Exit criteria:

- `reports/site-summary.md`, `apps-summary.md`, `plugins-summary.md`, `dependency-report.md`, and `scan-report.md` are generated from fixture data.
- `exports/structured-data.jsonl` is valid JSONL.
- `exports/export-manifest.json` is generated.
- Every structured export record has source metadata.

### Milestone 1D: Browser runtime plugin config collector

Goal: capture plugin saved config through a browser runtime.

Deliverables:

- Browser automation abstraction, likely Playwright.
- Login/session flow.
- Open app record-list page.
- Inject script that calls `kintone.plugin.app.getConfig(pluginId)`.
- Status and error mapping.
- Redaction for captured config.
- Mock/integration-test strategy.

Exit criteria:

- With mocked browser fixture, plugin config results are parsed and redacted.
- With real kintone domain configured through local env vars, optional integration test can capture plugin config.
- Browser runtime failures do not fail the entire scan unless user requested plugin config as required in a later mode.

### Milestone 1E: Optional plugin network asset collector

Goal: opt-in best-effort capture of plugin desktop/config assets.

Deliverables:

- Network response capture.
- Asset classification.
- Size limits.
- MIME/content type filters.
- Redaction over captured body.
- Asset manifest output.
- UI/CLI option disabled by default.

Exit criteria:

- Optional collector can be enabled.
- Captured assets write manifest and redacted content.
- If no assets are found, scan completes with a warning rather than failure.
- Plugin asset capture is not default checked.

### Milestone 1F: Desktop/CLI MVP

Goal: provide usable entry points.

Deliverables:

- CLI commands for development/testing.
- Desktop profile/account manager.
- Desktop site workspace manager.
- SourceTree-like site tabs.
- Per-site local folders and settings.
- Scan flow wired to the active site workspace.
- Scan history and export package output.

Exit criteria:

- A user can complete a scan without editing config files manually.
- Required/recommended/additional defaults match spec.
- Error report is visible after scan.
- User can open the site's local folder.
- No built-in AI, chat, or recommendation UI exists.

## 3. Capture option defaults

Implement these as a constant with tests.

```ts
export const captureOptionDefaults = {
  required: {
    appList: true,
    appBasicInfo: true,
    generalSettings: true,
    formFields: true,
    formLayout: true,
    views: true,
    graphSettings: true,
    processManagement: true,
    appPermissions: true,
    recordPermissions: true,
    fieldPermissions: true,
    actions: true,
    notifications: true,
    customizationMetadata: true,
    pluginInventory: true,
    adminNotes: true,
    livePreviewState: true,
  },
  recommended: {
    usersGroupsDepartments: true,
    spaces: true,
    appCustomizationFiles: true,
    pluginSavedConfig: true,
    dependencyDetection: true,
    previewLiveDiffSummary: true,
  },
  additional: {
    pluginDesktopRuntimeAssets: false,
    pluginConfigPageAssets: false,
    pluginMobileRuntimeAssets: false,
    sampleRecords: false,
    recordComments: false,
    attachmentMetadata: false,
    fullRecordExport: false,
    browserScreenshots: false,
  },
} as const;
```

Required options should be immutable/disabled in UI.

## 4. Core interfaces

Suggested core API:

```ts
export interface KintoneDiscoveryCore {
  testConnection(input: TestConnectionInput): Promise<TestConnectionResult>;
  listApps(input: ListAppsInput): Promise<ListAppsResult>;
  runScan(input: RunScanInput): Promise<ScanResult>;
  buildReportsAndExports(input: BuildReportsAndExportsInput): Promise<BuildReportsAndExportsResult>;
}
```

Collectors should implement:

```ts
export interface Collector<TInput, TOutput> {
  id: string;
  run(input: TInput, context: CollectorContext): Promise<CollectorResult<TOutput>>;
}
```

Every collector must return structured result objects rather than throwing raw errors except for truly unrecoverable failures.

## 5. REST collector tasks

Create collectors for:

- `rest:list-apps`
- `rest:get-app`
- `rest:get-general-settings`
- `rest:get-form-fields`
- `rest:get-form-layout`
- `rest:get-views`
- `rest:get-graph-settings`
- `rest:get-process-management`
- `rest:get-app-permissions`
- `rest:get-record-permissions`
- `rest:get-field-permissions`
- `rest:get-actions`
- `rest:get-general-notifications`
- `rest:get-per-record-notifications`
- `rest:get-reminder-notifications`
- `rest:get-customization`
- `rest:get-app-plugins`
- `rest:get-admin-notes`
- `rest:get-spaces`
- `rest:get-users-groups-departments`

For each collector, implement:

- Request builder.
- Live/preview variant when supported.
- Response validation.
- Redaction.
- Raw output path.
- Normalized output path.
- Tests with fixtures.

## 6. Browser runtime collector tasks

Create `browser:plugin-get-config`.

Inputs:

- Site workspace.
- Credential reference.
- App ID.
- Plugin IDs.
- Browser mode: `headless` or `headed`.

Flow:

1. Start browser context.
2. Login to kintone.
3. Navigate to selected app record list page.
4. Wait for page readiness.
5. Evaluate safe collector script in page context.
6. Return config per plugin.
7. Redact output.
8. Close browser unless session reuse is enabled.

Collector script shape:

```js
(pluginIds) => {
  return pluginIds.map((pluginId) => {
    try {
      const config = window.kintone?.plugin?.app?.getConfig?.(pluginId) ?? null;
      return { pluginId, status: config === null ? 'null-returned' : 'captured', config };
    } catch (error) {
      return {
        pluginId,
        status: 'failed',
        error: {
          name: error?.name ?? 'Error',
          message: error?.message ?? String(error),
        },
      };
    }
  });
}
```

Do not mutate page state.

## 7. Browser network asset collector tasks

Create collectors:

- `browser:plugin-desktop-assets`
- `browser:plugin-config-page-assets`
- `browser:plugin-mobile-assets`

All are opt-in.

Shared requirements:

- Capture only when user enables option.
- Use allowlist of content types/extensions: JS, CSS, HTML, JSON source maps only if explicitly enabled later.
- Apply max file size limit, default 5MB per asset for MVP unless configured.
- Redact before writing body.
- Store manifest even when no assets captured.
- Record capture page and matching heuristic.

## 8. Redaction implementation tasks

Implement redaction as a pure function.

```ts
export interface RedactionFinding {
  path: string;
  reason: string;
  replacement: '[REDACTED]';
}

export interface RedactionResult<T> {
  value: T;
  findings: RedactionFinding[];
}
```

Test cases:

- Deep object keys.
- Arrays.
- Case-insensitive keys.
- JWT-like strings.
- Bearer token strings.
- Long random token-like strings.
- JavaScript source containing hardcoded `apiToken`.
- Do not redact ordinary field codes like `Status` or `CustomerName`.

## 9. Report and export builder tasks

Report/export builder should create:

- Site summary.
- App summary.
- Plugin summary.
- Dependency report.
- Scan report.
- Structured export JSONL.
- Export manifest.

Implementation steps:

1. Load normalized model.
2. Build dependency candidates.
3. Generate markdown reports.
4. Generate JSONL structured export records.
5. Generate export manifest.
6. Validate JSONL.

## 10. CLI command behavior

CLI is useful even if desktop is the main product.

Suggested commands:

```bash
ksd init ./my-project
ksd auth add --name "Production Admin" --username admin@example.com
ksd auth list
ksd auth test --auth "Production Admin" --domain example.cybozu.com
ksd site add --name "Production" --domain example.cybozu.com --auth "Production Admin" --folder ./production
ksd site list
ksd site open-folder --site "Production"
ksd list-apps --project ./my-project --site Production
ksd scan --project ./my-project --site Production --apps 101,102 --profile deep
ksd build-export --project ./my-project --scan scan_...
```

CLI must never print secrets.

## 11. Desktop UI screens

### 11.1 Project screen

- Create/open project.
- Show recent projects.

### 11.2 Account/Profile screen

- Create Auth Profile.
- Edit profile display name.
- Update username/password.
- Test auth against a domain.
- Forget credential.

### 11.3 Site tabs

- Open site workspace in tab.
- Create new tab.
- Close tab without deleting data.
- Persist open tabs after restart.

### 11.4 Site overview screen

- Domain.
- Linked Auth Profile.
- Local folder.
- Last connection status.
- Last scan summary.
- Quick actions:
  - Test connection.
  - Fetch apps.
  - Run scan.
  - Open local folder.

### 11.5 App selection screen

- Fetch apps.
- Search/filter.
- Multi-select.

### 11.6 Scan options screen

Three sections:

- Required: checked + disabled.
- Recommended: checked + editable.
- Additional: unchecked + editable.

Plugin asset capture appears in Additional.

### 11.7 Scan progress screen

- Overall progress.
- Current app.
- Current collector.
- Warnings.
- Cancellable.

### 11.8 Results screen

- Apps scanned.
- Data captured.
- Plugin configs captured.
- Optional assets captured.
- Redactions applied.
- Failures/warnings.
- Buttons: Open reports, open exports, open local folder.

## 12. Testing strategy

### 12.1 Unit tests

Required:

- Redaction.
- Normalization.
- Capture option defaults.
- AuthProfile/SiteWorkspace/SiteTab models.
- Dependency extraction.
- Structured export generation.
- Error classification.

### 12.2 Fixture tests

Use mocked kintone API responses.

Fixtures should include:

- App with fields/layout/views.
- App with process management.
- App with permissions.
- App with plugins.
- Plugin config with secrets.
- Plugin asset JS with hardcoded token.
- Live/preview diff.

### 12.3 Integration tests

Real kintone integration tests must be opt-in only.

They should require environment variables such as:

```text
KSD_TEST_DOMAIN
KSD_TEST_USERNAME
KSD_TEST_PASSWORD
KSD_TEST_APP_ID
```

Never run real-domain tests in default CI.

## 13. Definition of done for MVP 1

MVP 1 is done when:

- User can create Auth Profiles.
- User can create Site Workspaces linked to Auth Profiles.
- User can open sites as tabs.
- User can set local folders per site.
- User can scan selected apps from a kintone site.
- Required data is captured and normalized.
- Recommended plugin saved config capture works where possible.
- Optional plugin asset capture exists and is unchecked by default.
- Markdown reports and structured export files are generated.
- Secrets are redacted.
- Error report is clear.
- No write/deploy code exists.
- No built-in AI features exist.
- Docs and tests match the implemented behavior.

## 14. Future implementation notes

Do not add safe deploy prematurely. Safe deploy should wait until scan/versioning and metadata capture are stable.

Future phases will reuse this local data capture foundation to implement:

- scan diff
- cloud drift detection
- pre-deploy snapshots
- safe deploy protocol
- central deploy ledger
- impact analysis based on captured data
