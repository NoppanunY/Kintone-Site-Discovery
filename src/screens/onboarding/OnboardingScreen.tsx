import { useEffect, useMemo, useState } from "react";
import { ConnectionTestPanel, SecretField, StatusPill } from "../../components";
import { mockAppSummaries } from "../../appPickerData";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../../mockConnection";
import { connectedSites, getAuthProfileById, getConnectedSiteById, profiles } from "../../mockData";
import { getPlatformBridge } from "../../platform";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../../types";
import { appIdsForDiscoveryScope, defaultProjectFolderPath, projectLocalAuthDisplayName, spaceNameForPicker, uniquePickerSpaces, type AppDiscoveryScopeMode, type ProjectAuthSelection } from "@kintone-site-discovery/core";

export type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface OnboardingScreenProps {
  entry?: OnboardingEntry;
  onCancel: () => void;
  onFinish: (draft: OnboardingFinishDraft) => void | Promise<void>;
  onMockAction?: MockActionHandler;
  initialSiteId?: string | null;
  defaultProjectsRoot?: string;
}

export interface OnboardingFinishDraft {
  entry: OnboardingEntry;
  project?: {
    name: string;
    folderPath: string;
    selectedSiteId: string;
    authSelection: ProjectAuthSelection;
    selectedAuthProfileId?: string;
    selectedAppIds: string[];
  };
  connectedSite?: {
    displayName: string;
    domain: string;
  };
  authProfile?: {
    displayName: string;
    username: string;
  };
}

type StepKey = "project" | "auth" | "site" | "test" | "apps";

interface StepDefinition {
  key: StepKey;
  label: string;
}

const flowSteps: Record<OnboardingEntry, StepDefinition[]> = {
  "new-project": [
    { key: "project", label: "Project" },
    { key: "auth", label: "Auth profile" },
    { key: "site", label: "Site" },
    { key: "test", label: "Test" },
    { key: "apps", label: "Apps" },
  ],
  "add-site": [{ key: "site", label: "Site" }],
  "add-auth": [{ key: "auth", label: "Auth profile" }],
};

const flowTitles: Record<OnboardingEntry, string> = {
  "new-project": "Create Project",
  "add-site": "Add Connected Site",
  "add-auth": "Add Auth Profile",
};

type AuthMode = "existing" | "new";
type AppScopeMode = AppDiscoveryScopeMode;

const DEFAULT_PROJECT_NAME = "Client CRM Discovery Copy";
const DEFAULT_SITE_DISPLAY_NAME = "Client A QA";
const DEFAULT_SITE_DOMAIN = "client-a-qa.cybozu.com";
const DEFAULT_AUTH_PROFILE_NAME = "Client A Admin";
const DEFAULT_AUTH_USERNAME = "ca-admin@client-a";
const DEFAULT_EXISTING_AUTH_PROFILE_ID = profiles.find((profile) => profile.tone === "ok")?.id ?? profiles[0]?.id ?? "production-admin";

export function OnboardingScreen({ entry = "new-project", onCancel, onFinish, onMockAction, initialSiteId, defaultProjectsRoot = "C:\\tmp\\Kintone Site Discovery\\Projects" }: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [projectFolderPath, setProjectFolderPath] = useState(defaultProjectFolderPath(defaultProjectsRoot, DEFAULT_PROJECT_NAME));
  const [projectFolderEdited, setProjectFolderEdited] = useState(false);
  const [siteDisplayName, setSiteDisplayName] = useState(DEFAULT_SITE_DISPLAY_NAME);
  const [siteDomain, setSiteDomain] = useState(DEFAULT_SITE_DOMAIN);
  const [authProfileDisplayName, setAuthProfileDisplayName] = useState(DEFAULT_AUTH_PROFILE_NAME);
  const [authUsername, setAuthUsername] = useState(DEFAULT_AUTH_USERNAME);
  const [projectLocalUsername, setProjectLocalUsername] = useState(DEFAULT_AUTH_USERNAME);
  const [selectedSiteId, setSelectedSiteId] = useState(getInitialSiteId(initialSiteId));
  const [selectedAuthProfileId, setSelectedAuthProfileId] = useState(DEFAULT_EXISTING_AUTH_PROFILE_ID);
  const [hasEnteredSecret, setHasEnteredSecret] = useState(false);
  const [appScopeMode, setAppScopeMode] = useState<AppScopeMode>("all");
  const [selectedSpaceNames, setSelectedSpaceNames] = useState<string[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState(() => appIdsForDiscoveryScope(mockAppSummaries, "all"));
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const cancelLabel = entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : entry === "add-site" ? "Save connected site" : "Open project Overview";
  const showMockAction: MockActionHandler = (message, options) => {
    onMockAction?.(message, options);
  };
  const selectedSite = getConnectedSiteById(selectedSiteId);
  const selectedProfile = getAuthProfileById(selectedAuthProfileId);
  const projectLocalLabel = projectLocalAuthDisplayName(projectLocalUsername);
  const selectedAuthLabel = entry === "new-project" && authMode === "new" ? projectLocalLabel : selectedProfile.name;
  const connectionTarget: ConnectionTestTarget = {
    siteName: selectedSite.name,
    domain: selectedSite.domain,
    authProfile: selectedAuthLabel,
  };
  const currentStepValid = isStepValid({
    step: step.key,
    entry,
    authMode,
    hasEnteredSecret,
    connectionResult,
    selectedAppIds,
    appScopeMode,
    selectedSpaceNames,
    projectFolderPath,
    projectName,
    siteDisplayName,
    siteDomain,
    authProfileDisplayName,
    authUsername,
    projectLocalUsername,
  });
  const connectionTargetKey = `${step.key}|${selectedSiteId}|${selectedAuthProfileId}|${authMode}|${projectLocalUsername}`;

  function connectionOutcomeForProfile(authProfileId: string) {
    return getAuthProfileById(authProfileId).tone === "warn" ? "failed" : "passed";
  }

  function connectionOutcomeForCurrentAuth() {
    return entry === "new-project" && authMode === "new" ? "passed" : connectionOutcomeForProfile(selectedAuthProfileId);
  }

  function runConnectionTest(outcome: "passed" | "failed" = connectionOutcomeForCurrentAuth(), silent = false) {
    setConnectionResult(createTestingConnectionResult(connectionTarget));
    window.setTimeout(() => {
      setConnectionResult(outcome === "failed" ? createFailedConnectionResult(connectionTarget) : createPassedConnectionResult(connectionTarget));
      if (outcome === "passed" && !silent) {
        showMockAction(`${selectedAuthLabel} connection test passed for ${selectedSite.name}. No kintone request was sent.`, { tone: "ok" });
      }
    }, 450);
  }

  function handleSelectAppScopeMode(mode: AppScopeMode) {
    setAppScopeMode(mode);
    setSelectedAppIds(appIdsForDiscoveryScope(mockAppSummaries, mode, selectedSpaceNames));
  }

  function handleToggleSelectedSpace(spaceName: string) {
    const nextSpaceNames = selectedSpaceNames.includes(spaceName) ? selectedSpaceNames.filter((item) => item !== spaceName) : [...selectedSpaceNames, spaceName];
    setSelectedSpaceNames(nextSpaceNames);
    setSelectedAppIds(appIdsForDiscoveryScope(mockAppSummaries, appScopeMode, nextSpaceNames));
  }

  const content = useMemo(
    () =>
      renderStep({
        step: step.key,
        entry,
        authMode,
        selectedSiteId,
        selectedAuthProfileId,
        selectedAuthLabel,
        projectName,
        onProjectNameChange: setProjectName,
        onSelectAuthMode: (mode) => {
          setAuthMode(mode);
          setConnectionResult(null);
        },
        onSelectSite: (siteId) => {
          setSelectedSiteId(siteId);
          setConnectionResult(null);
        },
        onSelectAuthProfile: (profileId) => {
          setSelectedAuthProfileId(profileId);
          setConnectionResult(null);
        },
        onMockAction: showMockAction,
        connectionResult,
        onRunConnectionTest: runConnectionTest,
        onClearConnectionTest: () => setConnectionResult(null),
        projectFolderPath,
        onProjectFolderPathChange: (path) => {
          setProjectFolderEdited(true);
          setProjectFolderPath(path);
        },
        onPickProjectFolder: async () => {
          const result = await getPlatformBridge().chooseLocalFolder();
          if (result.ok && result.path) {
            setProjectFolderEdited(true);
            setProjectFolderPath(result.path);
            showMockAction(`Project folder selected: ${result.path}`, { tone: "ok" });
          }
        },
        siteDisplayName,
        siteDomain,
        onSiteDisplayNameChange: setSiteDisplayName,
        onSiteDomainChange: setSiteDomain,
        authProfileDisplayName,
        authUsername,
        onAuthProfileDisplayNameChange: setAuthProfileDisplayName,
        onAuthUsernameChange: setAuthUsername,
        projectLocalUsername,
        projectLocalLabel,
        onProjectLocalUsernameChange: setProjectLocalUsername,
        hasEnteredSecret,
        onSetSecret: () => setHasEnteredSecret(true),
        selectedAppIds,
        appScopeMode,
        selectedSpaceNames,
        onSelectAppScopeMode: handleSelectAppScopeMode,
        onToggleSelectedSpace: handleToggleSelectedSpace,
      }),
    [
      authMode,
      authProfileDisplayName,
      authUsername,
      connectionResult,
      entry,
      hasEnteredSecret,
      projectFolderPath,
      projectLocalLabel,
      projectLocalUsername,
      projectName,
      selectedAppIds,
      appScopeMode,
      selectedSpaceNames,
      selectedAuthLabel,
      selectedAuthProfileId,
      selectedSiteId,
      siteDisplayName,
      siteDomain,
      step.key,
    ],
  );

  useEffect(() => {
    setStepIndex(0);
    setAuthMode(entry === "add-auth" ? "new" : "existing");
    setProjectName(DEFAULT_PROJECT_NAME);
    setProjectFolderPath(defaultProjectFolderPath(defaultProjectsRoot, DEFAULT_PROJECT_NAME));
    setProjectFolderEdited(false);
    setSiteDisplayName(DEFAULT_SITE_DISPLAY_NAME);
    setSiteDomain(DEFAULT_SITE_DOMAIN);
    setAuthProfileDisplayName(DEFAULT_AUTH_PROFILE_NAME);
    setAuthUsername(DEFAULT_AUTH_USERNAME);
    setProjectLocalUsername(DEFAULT_AUTH_USERNAME);
    setSelectedSiteId(getInitialSiteId(initialSiteId));
    setSelectedAuthProfileId(DEFAULT_EXISTING_AUTH_PROFILE_ID);
    setHasEnteredSecret(false);
    setAppScopeMode("all");
    setSelectedSpaceNames([]);
    setSelectedAppIds(appIdsForDiscoveryScope(mockAppSummaries, "all"));
    setConnectionResult(null);
  }, [defaultProjectsRoot, entry, initialSiteId]);

  useEffect(() => {
    if (!projectFolderEdited) {
      setProjectFolderPath(defaultProjectFolderPath(defaultProjectsRoot, projectName));
    }
  }, [defaultProjectsRoot, projectFolderEdited, projectName]);

  useEffect(() => {
    if (step.key !== "test") {
      return;
    }

    runConnectionTest(connectionOutcomeForCurrentAuth(), true);
    // The key intentionally captures only the values that should trigger a fresh preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionTargetKey]);

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (!currentStepValid) {
      return;
    }

    if (isLastStep) {
      void onFinish({
        entry,
        project:
          entry === "new-project"
            ? {
                name: projectName.trim(),
                folderPath: projectFolderPath,
                selectedSiteId,
                authSelection:
                  authMode === "existing"
                    ? { kind: "global_profile", authProfileId: selectedAuthProfileId }
                    : {
                        kind: "project_local",
                        displayName: projectLocalLabel,
                        username: projectLocalUsername.trim(),
                        authType: "password",
                        credentialStatus: hasEnteredSecret ? "saved" : "no_credential",
                      },
                selectedAuthProfileId: authMode === "existing" ? selectedAuthProfileId : undefined,
                selectedAppIds,
              }
            : undefined,
        connectedSite:
          entry === "add-site"
            ? {
                displayName: siteDisplayName.trim(),
                domain: siteDomain.trim(),
              }
            : undefined,
        authProfile:
          entry === "add-auth"
            ? {
                displayName: authProfileDisplayName.trim(),
                username: authUsername.trim(),
              }
            : undefined,
      });
      return;
    }

    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  };

  return (
    <div className="canvas">
      <div className="app">
        <div className="titlebar">
          <span className="tl r" />
          <span className="tl y" />
          <span className="tl g" />
          <span className="tb-title">{flowTitles[entry]}</span>
        </div>
        <div className="wizard">
          <div className="wizard-card">
            <div className="card-pad card-pad--separated">
              <div className="stepper">
                {steps.map((label, index) => (
                  <Step
                    key={label.key}
                    marker={index < stepIndex ? "✓" : String(index + 1)}
                    label={label.label}
                    state={index < stepIndex ? "done" : index === stepIndex ? "active" : undefined}
                    showLine={index < steps.length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="wizard-card__body">{content}</div>
            <div className="wizard-card__footer">
              <div className="wizard-card__footer-left">
                {stepIndex > 0 ? (
                  <button type="button" className="btn btn--ghost" onClick={goBack}>
                    ← Back
                  </button>
                ) : null}
              </div>
              <div className="wizard-card__footer-progress">
                <span className="small muted2">
                  Step {stepIndex + 1} of {steps.length}
                </span>
              </div>
              <div className="wizard-card__footer-actions">
                <button type="button" className="btn btn--ghost" onClick={onCancel}>
                  {cancelLabel}
                </button>
                <button type="button" className="btn btn--primary" onClick={goNext} disabled={!currentStepValid}>
                  {isLastStep ? finishLabel : "Continue →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderStep({
  step,
  entry,
  authMode,
  selectedSiteId,
  selectedAuthProfileId,
  selectedAuthLabel,
  projectName,
  onProjectNameChange,
  onSelectAuthMode,
  onSelectSite,
  onSelectAuthProfile,
  onMockAction,
  connectionResult,
  onRunConnectionTest,
  onClearConnectionTest,
  projectFolderPath,
  onProjectFolderPathChange,
  onPickProjectFolder,
  siteDisplayName,
  siteDomain,
  onSiteDisplayNameChange,
  onSiteDomainChange,
  authProfileDisplayName,
  authUsername,
  onAuthProfileDisplayNameChange,
  onAuthUsernameChange,
  projectLocalUsername,
  projectLocalLabel,
  onProjectLocalUsernameChange,
  hasEnteredSecret,
  onSetSecret,
  selectedAppIds,
  appScopeMode,
  selectedSpaceNames,
  onSelectAppScopeMode,
  onToggleSelectedSpace,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  selectedSiteId: string;
  selectedAuthProfileId: string;
  selectedAuthLabel: string;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onSelectAuthMode: (mode: AuthMode) => void;
  onSelectSite: (siteId: string) => void;
  onSelectAuthProfile: (profileId: string) => void;
  onMockAction: MockActionHandler;
  connectionResult: ConnectionTestResult | null;
  onRunConnectionTest: (outcome?: "passed" | "failed") => void;
  onClearConnectionTest: () => void;
  projectFolderPath: string;
  onProjectFolderPathChange: (path: string) => void;
  onPickProjectFolder: () => void;
  siteDisplayName: string;
  siteDomain: string;
  onSiteDisplayNameChange: (value: string) => void;
  onSiteDomainChange: (value: string) => void;
  authProfileDisplayName: string;
  authUsername: string;
  onAuthProfileDisplayNameChange: (value: string) => void;
  onAuthUsernameChange: (value: string) => void;
  projectLocalUsername: string;
  projectLocalLabel: string;
  onProjectLocalUsernameChange: (value: string) => void;
  hasEnteredSecret: boolean;
  onSetSecret: () => void;
  selectedAppIds: string[];
  appScopeMode: AppScopeMode;
  selectedSpaceNames: string[];
  onSelectAppScopeMode: (mode: AppScopeMode) => void;
  onToggleSelectedSpace: (spaceName: string) => void;
}) {
  if (step === "project") {
    return (
      <>
        <WizardIntro
          title="Create a local project"
          body="A project is a local folder that selects one connected site. You can reuse the same connected site in another project."
        />
        <div className="form-grid">
          <TextField label="Project name" value={projectName} onChange={onProjectNameChange} />
          <TextField
            label="Local folder"
            value={projectFolderPath}
            onChange={onProjectFolderPathChange}
            actionLabel="Browse..."
            onAction={onPickProjectFolder}
            full
          />
        </div>
      </>
    );
  }

  if (step === "auth") {
    const selectedProfile = getAuthProfileById(selectedAuthProfileId);
    return (
      <>
        <WizardIntro title={authStepTitle(entry)} body={authStepBody(entry)} />
        {entry === "add-auth" ? (
          <AuthProfileFields
            scope="global"
            profileName={authProfileDisplayName}
            username={authUsername}
            onProfileNameChange={onAuthProfileDisplayNameChange}
            onUsernameChange={onAuthUsernameChange}
            hasEnteredSecret={hasEnteredSecret}
            onSetSecret={onSetSecret}
          />
        ) : (
          <>
            <div className="choice-list">
              <ChoiceRow
                title="Use existing auth profile"
                body="Best when the account already exists in the global profile list."
                selected={authMode === "existing"}
                onClick={() => onSelectAuthMode("existing")}
              />
              <ChoiceRow
                title="Use new auth for this project"
                body="This project-only auth will not appear in Home > Auth profiles."
                selected={authMode === "new"}
                onClick={() => onSelectAuthMode("new")}
              />
            </div>
            {authMode === "existing" ? (
              <>
                <SelectField
                  label="Auth profile"
                  value={selectedAuthProfileId}
                  options={authProfileOptions()}
                  onChange={onSelectAuthProfile}
                  meta="Global auth profiles can be selected by any project."
                />
                <SelectedProfileBanner selectedProfile={selectedProfile.name} />
              </>
            ) : (
              <AuthProfileFields
                scope="project"
                username={projectLocalUsername}
                generatedLabel={projectLocalLabel}
                onUsernameChange={onProjectLocalUsernameChange}
                hasEnteredSecret={hasEnteredSecret}
                onSetSecret={onSetSecret}
              />
            )}
          </>
        )}
      </>
    );
  }

  if (step === "site") {
    if (entry === "new-project") {
      const selectedSite = getConnectedSiteById(selectedSiteId);
      return (
        <>
          <WizardIntro
            title="Choose a connected site"
            body="The project will use one existing site target with the auth selected in the previous step."
          />
          <div className="form-grid">
            <SelectField
              label="Connected site"
              value={selectedSiteId}
              options={connectedSiteOptions()}
              onChange={onSelectSite}
              meta="Add a connected site first if it is not listed here."
            />
            <ReadOnlyField label="Domain" value={selectedSite.domain} />
            <ReadOnlyField label="Selected auth" value={selectedAuthLabel} meta="Auth is selected by this project, not stored on the site." />
            <PathReadOnlyField label="Project snapshot folder" value={`${projectFolderPath}\\snapshots`} />
          </div>
        </>
      );
    }

    return (
      <>
        <WizardIntro
          title="Add a connected site"
          body="A connected site is a reusable kintone connection. It is not a project until a project selects it."
        />
        <div className="form-grid">
          <TextField label="Site display name" value={siteDisplayName} onChange={onSiteDisplayNameChange} />
          <TextField label="kintone domain" value={siteDomain} onChange={onSiteDomainChange} meta="Domain only, no protocol" />
          <ReadOnlyField label="Connection record" value="Global site list" meta="Projects can choose this site after it is saved." />
        </div>
      </>
    );
  }

  if (step === "test") {
    const selectedSite = getConnectedSiteById(selectedSiteId);
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This checks the selected site and project auth pair in preview mode. No kintone request is sent yet." />
        <ConnectionPreviewRows result={connectionResult} siteName={selectedSite.name} siteDomain={selectedSite.domain} authLabel={selectedAuthLabel} />
        <div className="setup-complete-line">
          {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
          {connectionResult?.status === "passed" ? <span className="inline-test-status">Auto preview passed just now</span> : null}
          {connectionResult?.status === "failed" ? (
            <button type="button" className="btn btn--sm" onClick={() => onRunConnectionTest()}>
              Retry
            </button>
          ) : null}
        </div>
        {connectionResult?.status !== "passed" ? <span className="hint">Continue unlocks after this preview passes. This does not contact kintone yet.</span> : null}
        {connectionResult?.status === "failed" ? (
          <ConnectionTestPanel
            result={connectionResult}
            onRetry={() => onRunConnectionTest()}
            onDismiss={onClearConnectionTest}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <WizardIntro
        title="Choose discovery scope"
        body="Pick a quick scope for this project. You can refine individual apps later from the Apps menu; no kintone request is sent in this preview."
      />
      <DiscoveryScopePicker
        mode={appScopeMode}
        selectedSpaceNames={selectedSpaceNames}
        selectedAppIds={selectedAppIds}
        onSelectMode={onSelectAppScopeMode}
        onToggleSpace={onToggleSelectedSpace}
      />
    </>
  );
}

function DiscoveryScopePicker({
  mode,
  selectedSpaceNames,
  selectedAppIds,
  onSelectMode,
  onToggleSpace,
}: {
  mode: AppScopeMode;
  selectedSpaceNames: string[];
  selectedAppIds: string[];
  onSelectMode: (mode: AppScopeMode) => void;
  onToggleSpace: (spaceName: string) => void;
}) {
  const spaces = uniquePickerSpaces(mockAppSummaries);
  const selectedSpaces = new Set(selectedSpaceNames);
  const selectedSpaceCount = selectedSpaceNames.length;
  const summary =
    mode === "later"
      ? "No apps selected yet"
      : mode === "by_space"
        ? `${selectedAppIds.length} apps selected from ${selectedSpaceCount} Space${selectedSpaceCount === 1 ? "" : "s"}`
        : `${selectedAppIds.length} apps selected`;

  return (
    <div className="discovery-scope">
      <div className="scope-card-grid">
        <ScopeCard
          title="All apps"
          badge="Recommended"
          body={`Include all ${mockAppSummaries.length} apps from the sample list now.`}
          selected={mode === "all"}
          onClick={() => onSelectMode("all")}
        />
        <ScopeCard
          title="By Space"
          body="Include every app in the Spaces you choose."
          selected={mode === "by_space"}
          onClick={() => onSelectMode("by_space")}
        />
        <ScopeCard
          title="Choose later"
          body="Create the project now and choose apps from the Apps menu before scanning."
          selected={mode === "later"}
          onClick={() => onSelectMode("later")}
        />
      </div>
      {mode === "by_space" ? (
        <div className="scope-space-panel">
          <div className="between">
            <span className="label">Spaces</span>
            <span className="small muted2">{selectedSpaceCount} selected</span>
          </div>
          <div className="scope-space-grid">
            {spaces.map((spaceName) => {
              const appCount = mockAppSummaries.filter((app) => spaceNameForPicker(app) === spaceName).length;
              const selected = selectedSpaces.has(spaceName);
              return (
                <button type="button" key={spaceName} className={`scope-space-card ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={() => onToggleSpace(spaceName)}>
                  <span>{spaceName}</span>
                  <b>{appCount} apps</b>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="scope-summary-line">
        <StatusPill status={selectedAppIds.length > 0 ? "ok" : "idle"} label={mode === "later" ? "Choose later" : "Ready"} dot />
        <span className="small muted2">{summary}. Detailed app selection stays in the Apps menu.</span>
      </div>
    </div>
  );
}

function ScopeCard({ title, badge, body, selected, onClick }: { title: string; badge?: string; body: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`scope-card ${selected ? "selected" : ""}`} aria-pressed={selected} onClick={onClick}>
      <span className="scope-card__top">
        <span className="h3">{title}</span>
        {badge ? <span className="scope-card__badge">{badge}</span> : null}
      </span>
      <span className="small muted2">{body}</span>
    </button>
  );
}

function WizardIntro({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="h1">{title}</h2>
      <p className="body muted" style={{ marginTop: 5 }}>
        {body}
      </p>
    </div>
  );
}

function authStepTitle(entry: OnboardingEntry) {
  if (entry === "add-auth") {
    return "Add an auth profile";
  }

  return "Choose an auth profile";
}

function authStepBody(entry: OnboardingEntry) {
  if (entry === "add-auth") {
    return "Create a reusable global sign-in profile. This preview does not store real credentials yet.";
  }

  return "Choose a global auth profile, or enter auth used only by this project in the preview.";
}

function AuthProfileFields({
  scope,
  profileName,
  username,
  generatedLabel,
  onProfileNameChange,
  onUsernameChange,
  hasEnteredSecret,
  onSetSecret,
}: {
  scope: "global" | "project";
  profileName?: string;
  username: string;
  generatedLabel?: string;
  onProfileNameChange?: (value: string) => void;
  onUsernameChange: (value: string) => void;
  hasEnteredSecret: boolean;
  onSetSecret: () => void;
}) {
  const isProjectOnly = scope === "project";

  return (
    <>
      <div className="form-grid">
        {isProjectOnly ? null : <TextField label="Profile name" value={profileName ?? ""} onChange={(value) => onProfileNameChange?.(value)} />}
        <TextField label="Username" value={username} onChange={onUsernameChange} />
        <SecretField label="Password" hasStoredSecret={hasEnteredSecret} onSet={onSetSecret} />
      </div>
      {isProjectOnly ? (
        <div className="setup-complete-line">
          <StatusPill status="idle" label="Project-only" dot />
          <span className="small muted2">Used only by this project in this preview. Metadata display name: {generatedLabel}</span>
        </div>
      ) : (
        <div className="setup-complete-line">
          <StatusPill status="idle" label="Global profile" dot />
          <span className="small muted2">Saved from this flow, it will appear in Auth profiles on Home.</span>
        </div>
      )}
    </>
  );
}

function SelectedProfileBanner({ selectedProfile }: { selectedProfile: string }) {
  return (
    <div className="banner screen-note">
      <div>
        <b>{selectedProfile}</b> will be selected for this project in preview mode. Credential lookup is not connected yet.
      </div>
    </div>
  );
}

function ChoiceRow({ title, body, selected, onClick }: { title: string; body: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`choice-row ${selected ? "choice-row--selected" : ""}`} aria-pressed={selected} onClick={onClick}>
      <span className="choice-row__marker" aria-hidden="true">
        {selected ? "✓" : ""}
      </span>
      <span>
        <span className="h3">{title}</span>
        <span className="small muted2">{body}</span>
      </span>
    </button>
  );
}

function SelectField({
  label,
  value,
  options,
  meta,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  meta?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`form-group ${meta ? "form-group--full" : ""}`}>
      <label className="label" htmlFor={`select-${label.replace(/\s+/g, "-").toLowerCase()}`}>
        {label}
      </label>
      <select
        id={`select-${label.replace(/\s+/g, "-").toLowerCase()}`}
        className="select"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {meta ? <span className="hint">{meta}</span> : null}
    </div>
  );
}

function authProfileOptions() {
  return profiles.map((profile) => ({
    value: profile.id,
    label: `${profile.name} · ${profile.user} · ${profile.status}`,
  }));
}

function connectedSiteOptions() {
  return connectedSites.map((site) => ({
    value: site.id,
    label: `${site.name} · ${site.domain}`,
  }));
}

function getInitialSiteId(initialSiteId: string | null | undefined): string {
  if (initialSiteId && connectedSites.some((site) => site.id === initialSiteId)) {
    return initialSiteId;
  }

  return connectedSites[0].id;
}

function isStepValid({
  step,
  entry,
  authMode,
  hasEnteredSecret,
  connectionResult,
  selectedAppIds,
  appScopeMode,
  selectedSpaceNames,
  projectFolderPath,
  projectName,
  siteDisplayName,
  siteDomain,
  authProfileDisplayName,
  authUsername,
  projectLocalUsername,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  hasEnteredSecret: boolean;
  connectionResult: ConnectionTestResult | null;
  selectedAppIds: string[];
  appScopeMode: AppScopeMode;
  selectedSpaceNames: string[];
  projectFolderPath: string;
  projectName: string;
  siteDisplayName: string;
  siteDomain: string;
  authProfileDisplayName: string;
  authUsername: string;
  projectLocalUsername: string;
}) {
  if (step === "project") {
    return projectName.trim().length > 0 && projectFolderPath.trim().length > 0;
  }

  if (step === "auth") {
    if (entry === "add-auth") {
      return authProfileDisplayName.trim().length > 0 && authUsername.trim().length > 0 && hasEnteredSecret;
    }
    return authMode === "existing" || (projectLocalUsername.trim().length > 0 && hasEnteredSecret);
  }

  if (step === "site") {
    return entry === "new-project" || (siteDisplayName.trim().length > 0 && siteDomain.trim().length > 0);
  }

  if (step === "test") {
    return connectionResult?.status === "passed";
  }

  if (step === "apps") {
    if (appScopeMode === "later") {
      return true;
    }
    if (appScopeMode === "by_space") {
      return selectedSpaceNames.length > 0 && selectedAppIds.length > 0;
    }
    return selectedAppIds.length > 0;
  }

  return true;
}

function TextField({
  label,
  value,
  meta,
  actionLabel,
  full,
  onChange,
  onAction,
}: {
  label: string;
  value: string;
  meta?: string;
  actionLabel?: string;
  full?: boolean;
  onChange: (value: string) => void;
  onAction?: () => void;
}) {
  return (
    <div className={`form-group ${full || actionLabel || meta ? "form-group--full" : ""}`}>
      <label className="label" htmlFor={`field-${label.replace(/\s+/g, "-").toLowerCase()}`}>
        {label}
      </label>
      <div className={actionLabel ? "field-row" : undefined}>
        <input id={`field-${label.replace(/\s+/g, "-").toLowerCase()}`} className="input" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
        {actionLabel ? (
          <button type="button" className="link-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {meta ? <span className="hint">{meta}</span> : null}
    </div>
  );
}

function ReadOnlyField({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className={`form-group ${meta ? "form-group--full" : ""}`}>
      <span className="label">{label}</span>
      <div className="input input--readonly filled">
        <span>{value}</span>
      </div>
      {meta ? <span className="hint">{meta}</span> : null}
    </div>
  );
}

function PathReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="form-group form-group--full">
      <span className="label">{label}</span>
      <input className="input input--path" readOnly value={value} title={value} />
    </div>
  );
}

function ConnectionPreviewRows({
  result,
  siteName,
  siteDomain,
  authLabel,
}: {
  result: ConnectionTestResult | null;
  siteName: string;
  siteDomain: string;
  authLabel: string;
}) {
  const status = result?.status ?? "idle";
  return (
    <div className="list">
      <PreviewRow label="Site target" detail={`${siteName} · ${siteDomain}`} state={status} />
      <PreviewRow label="Auth metadata" detail={`${authLabel} is selected for this project.`} state={status} />
      <PreviewRow label="Read permission" detail="Preview permission check only. No kintone request is sent." state={status} />
    </div>
  );
}

function PreviewRow({ label, detail, state }: { label: string; detail: string; state: ConnectionTestResult["status"] | "idle" }) {
  const tone = state === "passed" ? "ok" : state === "failed" ? "err" : state === "testing" ? "run" : "idle";
  const statusLabel = state === "passed" ? "Passed" : state === "failed" ? "Failed" : state === "testing" ? "Checking" : "Waiting";
  return (
    <div className="li">
      <div className="grow">
        <div className="h3">{label}</div>
        <div className="small muted2">{detail}</div>
      </div>
      <StatusPill status={tone} label={statusLabel} dot />
    </div>
  );
}

function Step({
  marker,
  label,
  state,
  showLine,
}: {
  marker: string;
  label: string;
  state?: "done" | "active";
  showLine: boolean;
}) {
  return (
    <>
      <div className={`step ${state === "done" ? "done step--done" : ""} ${state === "active" ? "active step--active" : ""}`}>
        <span className="sn step__number">{marker}</span>
        {label}
      </div>
      {showLine ? <span className="step-line" /> : null}
    </>
  );
}
