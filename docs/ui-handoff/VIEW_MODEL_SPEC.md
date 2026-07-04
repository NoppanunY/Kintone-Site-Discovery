# VIEW_MODEL_SPEC

The exact view model each screen consumes. Types reference `DATA_CONTRACT.md`. A view model is the read-only prop bundle a screen container receives; `on*` are action callbacks. Screens never fetch shapes not defined here or in the data contract.

Shared:
```ts
type Async<T> = { status: 'idle'|'loading'|'ready'|'error'; data?: T; error?: ErrorStateModel };
interface ShellVM { projectName: string; tabs: {id:Id;title:string;kind:'home'|'site';running?:boolean}[]; activeTabId: Id; }
```
Every site-tab screen also receives `site: SiteWorkspace` and `nav: { active: NavKey; onNavigate(key:NavKey):void }`.

---

## SCR-01 · Onboarding  `/onboarding`
```ts
interface OnboardingVM {
  step: 1|2|3|4|5;
  project: { mode:'create'|'open'; name:string; folderPath:string; valid:boolean };
  signIn: { username:string; hasSecretEntered:boolean; profileDraftId?:Id }; // secret write-only
  siteDraft: { displayName:string; domain:string; domainValid:boolean; folderPath:string };
  test: Async<{ domainReachable:boolean; credentialsAccepted:boolean; readPermission:boolean }>;
  appFetch: Async<{ appCount:number }>;
  canContinue: boolean;              // gates the Continue button per step
  onSetField(path:string, value:string):void;
  onBrowseFolder(target:'project'|'site'):void;
  onBack():void; onContinue():void;  // Continue validates current step
  onFinish():void;                   // → /site/:id/overview
  onCancel():void;
}
```
Notes: Step 4 must resolve all three checks true before `canContinue`. Secret never present in the VM as a readable value.

## SCR-02 · Project Home  `/`
```ts
interface ProjectHomeVM {
  shell: ShellVM;
  recentProjects: { id:Id; name:string; folderPath:string; lastOpenedAt:ISODateString; folderMissing?:boolean }[];
  authProfiles: AuthProfile[];       // rendered via credentialStatus; never secrets
  sites: (SiteWorkspace & { lastSnapshot?: SnapshotSummary })[];
  onNewProject():void; onOpenProject(id:Id):void; onRemoveProject(id:Id):void;
  onAddProfile():void; onEditProfile(id:Id):void; onTestProfile(id:Id):void; onForgetCredential(id:Id):void;
  onAddSite():void; onOpenSite(id:Id):void; onEditSite(id:Id):void;
}
```
Guards: `onOpenSite` disabled when the site's profile `credentialStatus !== 'saved'`.

## SCR-03 · Site Overview  `/site/:siteId/overview`
```ts
interface OverviewVM {
  site: SiteWorkspace;
  connection: ConnectionStatus;
  counts: { appsAvailable:number; appsInSnapshot:number; plugins:number; redactions:number };
  currentSnapshot?: SnapshotSummary; // undefined ⇒ empty state
  onRunScan():void; onTestConnection():void;
  onOpenSnapshot():void; onOpenReports():void; onOpenDeveloperFiles():void; onOpenFolder():void;
  scanInProgress:boolean;            // disables Run scan
}
```

## SCR-04 · Apps  `/site/:siteId/apps`
```ts
interface AppsVM {
  list: Async<{ apps: AppSummary[]; fetchedAt: ISODateString }>;
  query: string; spaceFilter: string|'all'; spaces: string[];
  selectedAppIds: Set<Id>; totalCount:number; selectedCount:number;
  freshnessLabel: string;            // "App list fetched 2 hours ago"
  onSearch(q:string):void; onFilterSpace(s:string):void;
  onToggleApp(id:Id):void; onSelectAllVisible():void; onClear():void;
  onReload():void; onContinueToScan():void; // disabled when selectedCount===0
}
```
Scale: `apps` may be 500+. Container must virtualize or paginate the list (see IMPLEMENTATION_TASKS). Search/filter operate on the full set, not the visible window.

## SCR-05 · Scan Setup  `/site/:siteId/scan`
```ts
interface ScanSetupVM {
  presets: ScanPreset[];             // quick, standard(recommended), full_discovery
  selectedPresetId: PresetId;
  selectedAppCount:number; freshnessLabel:string;
  requiredCategoryCount:number;      // shown as "17 required · always on"
  onSelectPreset(id:PresetId):void;
  onShowAdvanced():void;             // → SCR-06
  onReloadAppList():void;
  onReviewAndStart():void;           // full_discovery/advanced ⇒ SCR-06; else start or SCR-07 if sensitive armed
  canStart:boolean;                  // false when selectedAppCount===0
}
```

## SCR-06 · Sensitive Options  `/site/:siteId/scan/advanced`
```ts
interface SensitiveOptionsVM {
  required: CaptureCategory[];       // locked:true, rendered disabled-on
  recommended: (CaptureCategory & { enabled:boolean })[];
  additional: SensitiveCaptureOption[];  // off by default
  armedSensitiveCount:number;        // >0 ⇒ Confirm routes through SCR-07
  onToggleRecommended(key:string):void;
  onToggleSensitive(key:string):void;
  onSetSensitiveLimit(key:string, n:number):void;
  onBackToPresets():void;
  onConfirmAndStart():void;          // armedSensitiveCount>0 ? open SCR-07 : start
}
```

## SCR-07 · Sensitive Confirmation Modal  (overlay)
```ts
interface SensitiveConfirmVM {
  armedItems: { label:string; meta?:string }[];   // each enabled sensitive capture
  acknowledged:boolean;
  onToggleAck():void;
  onConfirm():void;                  // enabled only when acknowledged
  onTurnOff():void;                  // drop sensitive items, start safe scan
  onCancel():void;
}
```
Only mounted when `armedSensitiveCount > 0`.

## SCR-08 · Scan Running  `/site/:siteId/scan/run`
```ts
interface ScanRunningVM {
  run: ScanRun;                      // status:'running'
  overallPercent:number;            // 0..100
  currentAppIndex:number; totalApps:number; currentAppName:string;
  currentCollectorLabel:string;
  collectors: CollectorResult[];    // live list (done/running/skipped/queued)
  phase:'starting'|'running'|'committing';
  onCancel():void;                  // opens Cancel confirm
  cancelDisabled:boolean;           // true during 'committing'
}
```
Optional collector `failed`/`skipped` never changes `phase`; only hard-stops transition to result=failed.

## SCR-09 · Completed  `/site/:siteId/scan/result` (status='completed')
```ts
interface ScanResultCompletedVM {
  result: ScanResult;                // status:'completed', requiredOk===requiredTotal
  snapshot: SnapshotSummary;         // now current
  onViewReports():void; onOpenSnapshot():void; onOpenDeveloperFiles():void;
}
```

## SCR-10 · Completed with warnings  (status='completed_with_warnings')
```ts
interface ScanResultWarningsVM {
  result: ScanResult;                // requiredOk===requiredTotal, optionalSkipped>0
  snapshot: SnapshotSummary;
  warnings: CollectorResult[];       // status:'skipped'|'failed' && kind:'optional'
  onViewReports():void; onOpenSnapshot():void;
  onReRunSkipped():void; onRetryItem(key:string):void;
}
```

## SCR-11 · Failed  (status='failed')
```ts
interface ScanResultFailedVM {
  result: ScanResult;                // status:'failed'
  error: ErrorStateModel;            // code + human copy
  partialCapture?: { appsUsable:number; totalApps:number; partialSummaryPath:string };
  onRetryScan():void; onFixConnection():void; onReviewPartialSummary():void; // opens partial-summary.md
}
```
Never rendered with success styling. If `error.code==='OUTPUT_WRITE_FAILED'` there is no `partialCapture` (nothing persisted); body uses the fixed writable-folder copy.

## SCR-12 · Local Snapshot  `/site/:siteId/snapshot`
```ts
interface LocalSnapshotVM {
  snapshot: Async<SnapshotManifest>; // 'error' ⇒ integrity failure
  summary?: SnapshotSummary;
  contents: { label:string; icon:string; countLabel:string }[]; // derived from manifest.counts
  integrity: { verified:boolean; checkedAt:ISODateString; manifestPath:string };
  isEmpty:boolean;                   // no snapshot yet
  onReRunScan():void; onOpenFolder():void;
}
```
Framed as canonical. File order is read from `snapshot.data.fileOrder`.

## SCR-13 · Reports  `/site/:siteId/reports`
```ts
interface ReportsVM {
  generatedFromCapturedAt?: ISODateString;
  reports: ReportItem[];             // each with freshness vs snapshot
  isEmpty:boolean; isGenerating:boolean;
  onOpenReport(key:ReportItem['key']):void;   // MVP: OS-default markdown open
  onRegenerate(key:ReportItem['key']):void;   // when stale/missing
  onRevealFolder():void;
}
```

## SCR-14 · Developer Files  `/site/:siteId/developer-files`
```ts
interface DeveloperFilesVM {
  files: DeveloperFileItem[];
  fileOrderByApp: { appId:Id; appName:string; scope:FileOrderItem['scope']; items: FileOrderItem[] }[]; // items pre-sorted by orderIndex
  isEmpty:boolean; isBuildingPackage:boolean;
  onOpenFile(key:string):void; onRevealFolder():void;
  onCreateReviewPackage():void;      // zip of current snapshot (see storage spec §13)
}
```
`fileOrderByApp[].items` must be ordered by `orderIndex`; never re-sort by name.

## SCR-15 · History  `/site/:siteId/history`
```ts
interface HistoryVM {
  runs: (SnapshotSummary & { statusLabel:string; snapshotDeleted?:boolean })[];
  currentSnapshotId?:Id;
  onOpenReports(runId:Id):void; onOpenFiles(runId:Id):void; onViewReason(runId:Id):void; // failed rows
  onDeleteSnapshot(runId:Id):void;  // explicit; keeps history row, marks artifacts unavailable
}
```
Each row shows split counts (Required/Optional/Warnings); the current snapshot is tagged.

## SCR-16 · Site Settings  `/site/:siteId/settings`
```ts
interface SiteSettingsVM {
  activePanel: 'general'|'authentication'|'scan_defaults'|'output'|'privacy';
  general: { displayName:string; domain:string };
  authentication: { profileId:Id; credentialStatus:CredentialStatus };
  scanDefaults: {
    defaultPresetId: PresetId;
    requiredLocked: true;
    recommendedEnabled: boolean;
    sensitiveDefaults: { key:string; label:string; enabled:false; meta:string }[]; // all "Off by default"
  };
  output: { folderPath:string; writable:boolean };
  privacy: { redactionLocked: true };   // locked on
  dirty:boolean;
  onSwitchPanel(p:SiteSettingsVM['activePanel']):void;
  onChange(path:string, value:unknown):void;
  onSave():void; onCancel():void;        // Save disabled when !dirty
}
```
Required categories and redaction render disabled-on; sensitive defaults show "Off by default" (Sample records: "Off by default · max 25 when enabled").

## SCR-17 · Advanced Internal Data  `/site/:siteId/advanced`
```ts
interface AdvancedDataVM {
  inventory: { label:string; fileCount:number }[]; // raw/normalized/collector/logs
  acknowledged:boolean;
  folderMissing:boolean;
  onToggleAck():void;
  onOpenInternalFolder():void;        // disabled until acknowledged
}
```
De-emphasized; `onOpenInternalFolder` disabled until `acknowledged`.
