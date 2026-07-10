import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionTestPanel, SecretField, StatusPill } from "../../components";
import { mockAppSummaries } from "../../appPickerData";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../../mockConnection";
import { connectedSites as mockConnectedSites, getAuthProfileById, profiles as mockProfiles } from "../../mockData";
import { getPlatformBridge } from "../../platform";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../../types";
import {
  appIdsForDiscoveryScope,
  defaultProjectFolderPath,
  projectLocalAuthDisplayName,
  spaceNameForPicker,
  uniquePickerSpaces,
  validateKintoneDomain,
  validateLocalId,
  validateProjectName,
  validateWindowsSafeLocalPath,
  type AppDiscoveryScopeMode,
  type AuthProfile,
  type ConnectedSite,
  type ProjectAuthSelection,
} from "@kintone-site-discovery/core";

export type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface OnboardingScreenProps {
  entry?: OnboardingEntry;
  onCancel: () => void;
  onFinish: (draft: OnboardingFinishDraft) => OnboardingFinishResult | void | Promise<OnboardingFinishResult | void>;
  onMockAction?: MockActionHandler;
  initialSiteId?: string | null;
  defaultProjectsRoot?: string;
  connectedSites?: ConnectedSite[];
  authProfiles?: AuthProfile[];
  workspaceMode?: "loading" | "desktop_metadata" | "browser_fallback" | "empty";
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
    credentialValue?: string;
  };
  connectedSite?: {
    displayName: string;
    domain: string;
  };
  authProfile?: {
    displayName: string;
    username: string;
    credentialValue?: string;
  };
}

type StepKey = "project" | "auth" | "site" | "test" | "apps";

export interface OnboardingFinishIssue {
  step: StepKey;
  field: string;
  message: string;
}

export interface OnboardingFinishResult {
  ok: boolean;
  message?: string;
  step?: StepKey;
  issues?: OnboardingFinishIssue[];
}

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
type MetadataSource = "persisted" | "sample";

interface SiteChoice {
  id: string;
  name: string;
  domain: string;
  source: MetadataSource;
}

interface AuthChoice {
  id: string;
  name: string;
  user: string;
  status: string;
  tone: "ok" | "warn" | "idle";
  source: MetadataSource;
}

interface FieldIssue {
  field: string;
  message: string;
}

const DEFAULT_PROJECT_NAME = "Client CRM Discovery Copy";
const DEFAULT_SITE_DISPLAY_NAME = "Client A QA";
const DEFAULT_SITE_DOMAIN = "client-a-qa.cybozu.com";
const DEFAULT_AUTH_PROFILE_NAME = "Client A Admin";
const DEFAULT_AUTH_USERNAME = "ca-admin@client-a";
const DEFAULT_EXISTING_AUTH_PROFILE_ID = mockProfiles.find((profile) => profile.tone === "ok")?.id ?? mockProfiles[0]?.id ?? "production-admin";
const LAST_PROJECT_FOLDER_STORAGE_KEY = "ksd.lastProjectFolder";

export function OnboardingScreen({
  entry = "new-project",
  onCancel,
  onFinish,
  onMockAction,
  initialSiteId,
  defaultProjectsRoot = "C:\\tmp\\Kintone Site Discovery\\Projects",
  connectedSites = [],
  authProfiles = [],
  workspaceMode = "loading",
}: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const siteChoices = useMemo(() => buildSiteChoices(connectedSites), [connectedSites]);
  const authChoices = useMemo(() => buildAuthChoices(authProfiles), [authProfiles]);
  const usingSampleSites = siteChoices.some((site) => site.source === "sample");
  const usingSampleAuthProfiles = authChoices.some((profile) => profile.source === "sample");
  const siteChoiceIds = siteChoices.map((site) => site.id).join("|");
  const authChoiceIds = authChoices.map((profile) => profile.id).join("|");
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
  const [projectFolderPath, setProjectFolderPath] = useState(defaultProjectFolderPath(defaultProjectsRoot, DEFAULT_PROJECT_NAME));
  const [projectFolderEdited, setProjectFolderEdited] = useState(false);
  const [lastBrowsedProjectFolder, setLastBrowsedProjectFolder] = useState(() => readLastProjectFolder());
  const [siteDisplayName, setSiteDisplayName] = useState(DEFAULT_SITE_DISPLAY_NAME);
  const [siteDomain, setSiteDomain] = useState(DEFAULT_SITE_DOMAIN);
  const [authProfileDisplayName, setAuthProfileDisplayName] = useState(DEFAULT_AUTH_PROFILE_NAME);
  const [authUsername, setAuthUsername] = useState(DEFAULT_AUTH_USERNAME);
  const [projectLocalUsername, setProjectLocalUsername] = useState(DEFAULT_AUTH_USERNAME);
  const [selectedSiteId, setSelectedSiteId] = useState(() => getInitialSiteId(initialSiteId, siteChoices));
  const [selectedAuthProfileId, setSelectedAuthProfileId] = useState(() => getInitialAuthProfileId(authChoices));
  const [hasEnteredSecret, setHasEnteredSecret] = useState(false);
  const pendingCredentialRef = useRef<string | null>(null);
  const [appScopeMode, setAppScopeMode] = useState<AppScopeMode>("all");
  const [selectedSpaceNames, setSelectedSpaceNames] = useState<string[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState(() => appIdsForDiscoveryScope(mockAppSummaries, "all"));
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishIssues, setFinishIssues] = useState<OnboardingFinishIssue[]>([]);
  const [hasFinishAttempted, setHasFinishAttempted] = useState(false);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const showFinishShortcut = !isLastStep && hasFinishAttempted;
  const cancelLabel = entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : entry === "add-site" ? "Save connected site" : "Finish";
  const showMockAction: MockActionHandler = (message, options) => {
    onMockAction?.(message, options);
  };
  const selectedSite = getSiteChoiceById(selectedSiteId, siteChoices);
  const selectedProfile = getAuthChoiceById(selectedAuthProfileId, authChoices);
  const projectLocalLabel = projectLocalAuthDisplayName(projectLocalUsername);
  const selectedAuthLabel = entry === "new-project" && authMode === "new" ? projectLocalLabel : selectedProfile.name;
  const connectionTarget: ConnectionTestTarget = {
    siteName: selectedSite.name,
    domain: selectedSite.domain,
    authProfile: selectedAuthLabel,
  };
  const currentStepIssues = getStepIssues(step.key);
  const currentFinishIssues = finishIssues.filter((issue) => issue.step === step.key);
  const visibleStepIssues = mergeFieldIssues(currentStepIssues, currentFinishIssues);
  const currentStepValid = visibleStepIssues.length === 0;
  const stepsWithFinishIssues = new Set(finishIssues.map((issue) => issue.step));
  const connectionTargetKey = `${step.key}|${selectedSiteId}|${selectedAuthProfileId}|${authMode}|${projectLocalUsername}`;

  function connectionOutcomeForProfile(authProfileId: string) {
    return getAuthChoiceById(authProfileId, authChoices).tone === "warn" ? "failed" : "passed";
  }

  function connectionOutcomeForCurrentAuth() {
    return entry === "new-project" && authMode === "new" ? "passed" : connectionOutcomeForProfile(selectedAuthProfileId);
  }

  function getStepIssues(stepKey: StepKey) {
    return validateStep({
      step: stepKey,
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
      selectedSiteId,
      selectedAuthProfileId,
      siteChoices,
      authChoices,
    });
  }

  function wizardIssues() {
    return steps.flatMap((wizardStep) => getStepIssues(wizardStep.key).map((issue) => ({ ...issue, step: wizardStep.key })));
  }

  function clearFinishIssuesFor(...fields: string[]) {
    setFinishIssues((current) => current.filter((issue) => !fields.includes(issue.field)));
    setFinishError(null);
  }

  function clearPendingCredential() {
    pendingCredentialRef.current = null;
    setHasEnteredSecret(false);
  }

  function acceptPendingCredential(value: string) {
    clearFinishIssuesFor("secret");
    pendingCredentialRef.current = value;
    setHasEnteredSecret(true);
  }

  function focusStep(stepKey: StepKey) {
    const nextIndex = steps.findIndex((item) => item.key === stepKey);
    if (nextIndex >= 0) {
      setStepIndex(nextIndex);
    }
  }

  function defaultFieldForStep(stepKey: StepKey) {
    if (stepKey === "project") return "projectFolderPath";
    if (stepKey === "auth") return entry === "add-auth" ? "authProfileDisplayName" : authMode === "existing" ? "selectedAuthProfileId" : "projectLocalUsername";
    if (stepKey === "site") return entry === "add-site" ? "siteDomain" : "selectedSiteId";
    if (stepKey === "test") return "connectionTest";
    return "apps";
  }

  function applyFinishFailure(result: OnboardingFinishResult) {
    const fallbackStep = result.step ?? step.key;
    const message = result.message ?? "Metadata could not be saved. Review the highlighted field and try again.";
    const nextIssues: OnboardingFinishIssue[] =
      result.issues !== undefined
        ? result.issues
        : [
            {
              step: fallbackStep,
              field: defaultFieldForStep(fallbackStep),
              message,
            },
          ];
    setFinishIssues(nextIssues);
    setFinishError(message);
    focusStep(nextIssues[0]?.step ?? fallbackStep);
  }

  function buildFinishDraft(): OnboardingFinishDraft {
    return {
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
                      credentialStatus: "no_credential",
                    },
              selectedAuthProfileId: authMode === "existing" ? selectedAuthProfileId : undefined,
              selectedAppIds,
              credentialValue: authMode === "new" ? (pendingCredentialRef.current ?? undefined) : undefined,
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
              credentialValue: pendingCredentialRef.current ?? undefined,
            }
          : undefined,
    };
  }

  async function finishWizard() {
    if (isFinishing) {
      return;
    }

    setHasFinishAttempted(true);
    const issues = wizardIssues();
    if (issues.length > 0) {
      setFinishIssues(issues);
      setFinishError("Review the highlighted field before finishing.");
      focusStep(issues[0].step);
      return;
    }

    setFinishError(null);
    setFinishIssues([]);
    setIsFinishing(true);
    try {
      const result = await onFinish(buildFinishDraft());
      if (result?.ok === false) {
        applyFinishFailure(result);
      }
    } catch (error) {
      applyFinishFailure({
        ok: false,
        message: error instanceof Error ? error.message : "Metadata could not be saved. Review the details and try again.",
        step: step.key,
      });
    } finally {
      setIsFinishing(false);
    }
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
    clearFinishIssuesFor("apps");
    setAppScopeMode(mode);
    setSelectedAppIds(appIdsForDiscoveryScope(mockAppSummaries, mode, selectedSpaceNames));
  }

  function handleToggleSelectedSpace(spaceName: string) {
    clearFinishIssuesFor("apps");
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
        onProjectNameChange: (value) => {
          clearFinishIssuesFor("projectName");
          setProjectName(value);
        },
        onSelectAuthMode: (mode) => {
          clearFinishIssuesFor("selectedAuthProfileId", "projectLocalUsername", "secret");
          clearPendingCredential();
          setAuthMode(mode);
          setConnectionResult(null);
        },
        onSelectSite: (siteId) => {
          clearFinishIssuesFor("selectedSiteId", "connectionTest");
          setSelectedSiteId(siteId);
          setConnectionResult(null);
        },
        onSelectAuthProfile: (profileId) => {
          clearFinishIssuesFor("selectedAuthProfileId", "connectionTest");
          setSelectedAuthProfileId(profileId);
          setConnectionResult(null);
        },
        onMockAction: showMockAction,
        connectionResult,
        validationIssues: visibleStepIssues,
        siteChoices,
        authChoices,
        usingSampleSites,
        usingSampleAuthProfiles,
        workspaceMode,
        onRunConnectionTest: runConnectionTest,
        onClearConnectionTest: () => setConnectionResult(null),
        projectFolderPath,
        onProjectFolderPathChange: (path) => {
          clearFinishIssuesFor("projectFolderPath");
          setProjectFolderEdited(true);
          setProjectFolderPath(path);
        },
        onPickProjectFolder: async () => {
          const result = await getPlatformBridge().chooseLocalFolder({ defaultPath: projectFolderEdited ? projectFolderPath : lastBrowsedProjectFolder ?? projectFolderPath });
          if (result.ok && result.path) {
            clearFinishIssuesFor("projectFolderPath");
            rememberLastProjectFolder(result.path);
            setLastBrowsedProjectFolder(result.path);
            setProjectFolderEdited(true);
            setProjectFolderPath(result.path);
            showMockAction(`Project folder selected: ${result.path}`, { tone: "ok" });
          }
        },
        siteDisplayName,
        siteDomain,
        onSiteDisplayNameChange: (value) => {
          clearFinishIssuesFor("siteDisplayName");
          setSiteDisplayName(value);
        },
        onSiteDomainChange: (value) => {
          clearFinishIssuesFor("siteDomain");
          setSiteDomain(value);
        },
        authProfileDisplayName,
        authUsername,
        onAuthProfileDisplayNameChange: (value) => {
          clearFinishIssuesFor("authProfileDisplayName");
          setAuthProfileDisplayName(value);
        },
        onAuthUsernameChange: (value) => {
          clearFinishIssuesFor("authUsername");
          setAuthUsername(value);
        },
        projectLocalUsername,
        projectLocalLabel,
        onProjectLocalUsernameChange: (value) => {
          clearFinishIssuesFor("projectLocalUsername", "connectionTest");
          setProjectLocalUsername(value);
        },
        hasEnteredSecret,
        onSetSecret: acceptPendingCredential,
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
      lastBrowsedProjectFolder,
      projectFolderEdited,
      projectFolderPath,
      projectLocalLabel,
      projectLocalUsername,
      projectName,
      selectedAppIds,
      appScopeMode,
      selectedSpaceNames,
      selectedAuthLabel,
      selectedAuthProfileId,
      siteChoices,
      authChoices,
      visibleStepIssues,
      usingSampleSites,
      usingSampleAuthProfiles,
      workspaceMode,
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
    setSelectedSiteId(getInitialSiteId(initialSiteId, siteChoices));
    setSelectedAuthProfileId(getInitialAuthProfileId(authChoices));
    pendingCredentialRef.current = null;
    setHasEnteredSecret(false);
    setAppScopeMode("all");
    setSelectedSpaceNames([]);
    setSelectedAppIds(appIdsForDiscoveryScope(mockAppSummaries, "all"));
    setConnectionResult(null);
    setIsFinishing(false);
    setFinishError(null);
    setFinishIssues([]);
    setHasFinishAttempted(false);
  }, [defaultProjectsRoot, entry, initialSiteId]);

  useEffect(() => {
    setSelectedSiteId((current) => (siteChoices.some((site) => site.id === current) ? current : getInitialSiteId(initialSiteId, siteChoices)));
  }, [initialSiteId, siteChoiceIds, siteChoices]);

  useEffect(() => {
    setSelectedAuthProfileId((current) => (authChoices.some((profile) => profile.id === current) ? current : getInitialAuthProfileId(authChoices)));
  }, [authChoiceIds, authChoices]);

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

  const goNext = async () => {
    if (!currentStepValid || isFinishing) {
      return;
    }

    if (isLastStep) {
      await finishWizard();
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
                    marker={stepsWithFinishIssues.has(label.key) ? "!" : index < stepIndex ? "✓" : String(index + 1)}
                    label={label.label}
                    state={index < stepIndex ? "done" : index === stepIndex ? "active" : undefined}
                    hasIssue={stepsWithFinishIssues.has(label.key)}
                    showLine={index < steps.length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="wizard-card__body">{content}</div>
            {finishError ? (
              <div className="card-pad">
                <div className="banner banner--danger screen-note" role="alert">
                  <div>{finishError}</div>
                </div>
              </div>
            ) : null}
            <div className="wizard-card__footer">
              <div className="wizard-card__footer-left">
                {stepIndex > 0 ? (
                  <button type="button" className="btn btn--ghost" onClick={goBack} disabled={isFinishing}>
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
                <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={isFinishing}>
                  {cancelLabel}
                </button>
                {showFinishShortcut ? (
                  <button type="button" className="btn" onClick={() => void finishWizard()} disabled={!currentStepValid || isFinishing}>
                    {isFinishing ? "Finishing..." : finishLabel}
                  </button>
                ) : null}
                <button type="button" className="btn btn--primary" onClick={() => void goNext()} disabled={!currentStepValid || isFinishing}>
                  {isFinishing ? "Finishing..." : isLastStep ? finishLabel : "Continue →"}
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
  validationIssues,
  siteChoices,
  authChoices,
  usingSampleSites,
  usingSampleAuthProfiles,
  workspaceMode,
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
  validationIssues: FieldIssue[];
  siteChoices: SiteChoice[];
  authChoices: AuthChoice[];
  usingSampleSites: boolean;
  usingSampleAuthProfiles: boolean;
  workspaceMode: "loading" | "desktop_metadata" | "browser_fallback" | "empty";
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
  onSetSecret: (value: string) => void;
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
          <TextField label="Project name" value={projectName} onChange={onProjectNameChange} error={issueFor(validationIssues, "projectName")} />
          <TextField
            label="Local folder"
            value={projectFolderPath}
            onChange={onProjectFolderPathChange}
            actionLabel="Browse..."
            onAction={onPickProjectFolder}
            error={issueFor(validationIssues, "projectFolderPath")}
            full
          />
        </div>
      </>
    );
  }

  if (step === "auth") {
    const selectedProfile = getAuthChoiceById(selectedAuthProfileId, authChoices);
    return (
      <>
        <WizardIntro title={authStepTitle(entry)} body={authStepBody(entry)} />
        {entry === "new-project" && usingSampleAuthProfiles ? <MetadataFallbackBanner kind="auth profiles" workspaceMode={workspaceMode} /> : null}
        {entry === "add-auth" ? (
          <AuthProfileFields
            scope="global"
            profileName={authProfileDisplayName}
            username={authUsername}
            onProfileNameChange={onAuthProfileDisplayNameChange}
            onUsernameChange={onAuthUsernameChange}
            hasEnteredSecret={hasEnteredSecret}
            onSetSecret={onSetSecret}
            profileNameError={issueFor(validationIssues, "authProfileDisplayName")}
            usernameError={issueFor(validationIssues, "authUsername")}
            secretError={issueFor(validationIssues, "secret")}
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
                  options={authProfileOptions(authChoices)}
                  onChange={onSelectAuthProfile}
                  meta="Global auth profiles can be selected by any project."
                  error={issueFor(validationIssues, "selectedAuthProfileId")}
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
                usernameError={issueFor(validationIssues, "projectLocalUsername")}
                secretError={issueFor(validationIssues, "secret")}
              />
            )}
          </>
        )}
      </>
    );
  }

  if (step === "site") {
    if (entry === "new-project") {
      const selectedSite = getSiteChoiceById(selectedSiteId, siteChoices);
      return (
        <>
          <WizardIntro
            title="Choose a connected site"
            body="The project will use one existing site target with the auth selected in the previous step."
          />
          {usingSampleSites ? <MetadataFallbackBanner kind="connected sites" workspaceMode={workspaceMode} /> : null}
          <div className="form-grid">
            <SelectField
              label="Connected site"
              value={selectedSiteId}
              options={connectedSiteOptions(siteChoices)}
              onChange={onSelectSite}
              meta="Add a connected site first if it is not listed here."
              error={issueFor(validationIssues, "selectedSiteId")}
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
          <TextField label="Site display name" value={siteDisplayName} onChange={onSiteDisplayNameChange} error={issueFor(validationIssues, "siteDisplayName")} />
          <TextField label="kintone domain" value={siteDomain} onChange={onSiteDomainChange} meta="Domain only, no protocol" error={issueFor(validationIssues, "siteDomain")} />
          <ReadOnlyField label="Connection record" value="Global site list" meta="Projects can choose this site after it is saved." />
        </div>
      </>
    );
  }

  if (step === "test") {
    const selectedSite = getSiteChoiceById(selectedSiteId, siteChoices);
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
        {issueFor(validationIssues, "connectionTest") ? <span className="hint field-error">{issueFor(validationIssues, "connectionTest")}</span> : null}
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
      {issueFor(validationIssues, "apps") ? <span className="hint field-error">{issueFor(validationIssues, "apps")}</span> : null}
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
    return "Create a reusable global sign-in profile. The password is passed once to secure desktop storage.";
  }

  return "Choose a global auth profile, or enter auth used only by this project.";
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
  profileNameError,
  usernameError,
  secretError,
}: {
  scope: "global" | "project";
  profileName?: string;
  username: string;
  generatedLabel?: string;
  onProfileNameChange?: (value: string) => void;
  onUsernameChange: (value: string) => void;
  hasEnteredSecret: boolean;
  onSetSecret: (value: string) => void;
  profileNameError?: string;
  usernameError?: string;
  secretError?: string;
}) {
  const isProjectOnly = scope === "project";

  return (
    <>
      <div className="form-grid">
        {isProjectOnly ? null : <TextField label="Profile name" value={profileName ?? ""} onChange={(value) => onProfileNameChange?.(value)} error={profileNameError} />}
        <TextField label="Username" value={username} onChange={onUsernameChange} error={usernameError} />
        <div>
          <SecretField label="Password" hasStoredSecret={hasEnteredSecret} onSet={onSetSecret} />
          {secretError ? <span className="hint field-error">{secretError}</span> : null}
        </div>
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
        <b>{selectedProfile}</b> will be selected for this project. Scan credential lookup will use the stored reference in a later phase.
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
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  meta?: string;
  error?: string;
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
      {error ? <span className="hint field-error">{error}</span> : meta ? <span className="hint">{meta}</span> : null}
    </div>
  );
}

function authProfileOptions(profiles: AuthChoice[]) {
  return profiles.map((profile) => ({
    value: profile.id,
    label: `${profile.name} · ${profile.user} · ${profile.status}${profile.source === "sample" ? " · development fallback only" : ""}`,
  }));
}

function connectedSiteOptions(sites: SiteChoice[]) {
  return sites.map((site) => ({
    value: site.id,
    label: `${site.name} · ${site.domain}${site.source === "sample" ? " · development fallback only" : ""}`,
  }));
}

function getInitialSiteId(initialSiteId: string | null | undefined, sites: SiteChoice[]): string {
  if (initialSiteId && sites.some((site) => site.id === initialSiteId)) {
    return initialSiteId;
  }

  return sites[0]?.id ?? mockConnectedSites[0].id;
}

function getInitialAuthProfileId(profiles: AuthChoice[]): string {
  return profiles.find((profile) => profile.tone === "ok")?.id ?? profiles[0]?.id ?? DEFAULT_EXISTING_AUTH_PROFILE_ID;
}

function buildSiteChoices(persistedSites: ConnectedSite[]): SiteChoice[] {
  if (persistedSites.length > 0) {
    return persistedSites.map((site) => ({
      id: site.id,
      name: site.displayName,
      domain: site.domain,
      source: "persisted" as const,
    }));
  }

  return mockConnectedSites.map((site) => ({
    id: site.id,
    name: site.name,
    domain: site.domain,
    source: "sample" as const,
  }));
}

function buildAuthChoices(persistedProfiles: AuthProfile[]): AuthChoice[] {
  if (persistedProfiles.length > 0) {
    return persistedProfiles.map((profile) => ({
      id: profile.id,
      name: profile.displayName,
      user: profile.username,
      status:
        profile.credentialStatus === "saved"
          ? "Credential saved"
          : profile.credentialStatus === "needs_update"
            ? "Needs update"
            : profile.credentialStatus === "invalid"
              ? "Invalid"
              : "No credential",
      tone: profile.credentialStatus === "saved" ? "ok" : profile.credentialStatus === "needs_update" ? "warn" : "idle",
      source: "persisted" as const,
    }));
  }

  return mockProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    user: profile.user,
    status: profile.status,
    tone: authChoiceTone(profile.tone),
    source: "sample" as const,
  }));
}

function getSiteChoiceById(id: string, sites: SiteChoice[]): SiteChoice {
  return sites.find((site) => site.id === id) ?? buildSiteChoices([])[0];
}

function getAuthChoiceById(id: string, profiles: AuthChoice[]): AuthChoice {
  const fallback = getAuthProfileById(id);
  return (
    profiles.find((profile) => profile.id === id) ?? {
      id: fallback.id,
      name: fallback.name,
      user: fallback.user,
      status: fallback.status,
      tone: authChoiceTone(fallback.tone),
      source: "sample",
    }
  );
}

function authChoiceTone(tone: string): AuthChoice["tone"] {
  return tone === "ok" || tone === "warn" ? tone : "idle";
}

function readLastProjectFolder(): string | null {
  try {
    return window.localStorage.getItem(LAST_PROJECT_FOLDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberLastProjectFolder(folderPath: string) {
  try {
    window.localStorage.setItem(LAST_PROJECT_FOLDER_STORAGE_KEY, folderPath);
  } catch {
    // Folder picker still works if local storage is unavailable.
  }
}

function fieldIssues(issues: { path: string; message: string }[], field: string): FieldIssue[] {
  return issues.map((issue) => ({ field, message: issue.message }));
}

function mergeFieldIssues(primary: FieldIssue[], secondary: FieldIssue[]): FieldIssue[] {
  const primaryFields = new Set(primary.map((issue) => issue.field));
  return [...primary, ...secondary.filter((issue) => !primaryFields.has(issue.field))];
}

function issueFor(issues: FieldIssue[], field: string) {
  return issues.find((issue) => issue.field === field)?.message;
}

function MetadataFallbackBanner({ kind, workspaceMode }: { kind: string; workspaceMode: "loading" | "desktop_metadata" | "browser_fallback" | "empty" }) {
  const reason = workspaceMode === "browser_fallback" ? "browser fallback preview mode is active" : "no persisted metadata exists yet";
  return (
    <div className="banner screen-note">
      <div>
        Development fallback {kind} are shown because {reason}. They are preview-only and must be removed before real kintone connection work.
      </div>
    </div>
  );
}

function validateStep({
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
  selectedSiteId,
  selectedAuthProfileId,
  siteChoices,
  authChoices,
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
  selectedSiteId: string;
  selectedAuthProfileId: string;
  siteChoices: SiteChoice[];
  authChoices: AuthChoice[];
}): FieldIssue[] {
  const issues: FieldIssue[] = [];
  if (step === "project") {
    const nameResult = validateProjectName(projectName, "projectName");
    const pathResult = validateWindowsSafeLocalPath(projectFolderPath, "projectFolderPath");
    if (!nameResult.ok) issues.push(...fieldIssues(nameResult.issues, "projectName"));
    if (!pathResult.ok) issues.push(...fieldIssues(pathResult.issues, "projectFolderPath"));
    return issues;
  }

  if (step === "auth") {
    if (entry === "add-auth") {
      if (authProfileDisplayName.trim().length === 0) {
        issues.push({ field: "authProfileDisplayName", message: "Auth profile display name is required." });
      }
      if (authUsername.trim().length === 0) {
        issues.push({ field: "authUsername", message: "Username is required." });
      }
      if (!hasEnteredSecret) {
        issues.push({ field: "secret", message: "Enter the password as write-only preview input before saving." });
      }
      return issues;
    }
    if (authMode === "existing") {
      const idResult = validateLocalId(selectedAuthProfileId, "selectedAuthProfileId");
      if (authChoices.length === 0 || !authChoices.some((profile) => profile.id === selectedAuthProfileId)) {
        issues.push({ field: "selectedAuthProfileId", message: "Choose an auth profile." });
      } else if (!idResult.ok) {
        issues.push(...fieldIssues(idResult.issues, "selectedAuthProfileId"));
      }
      return issues;
    }
    if (projectLocalUsername.trim().length === 0) {
      issues.push({ field: "projectLocalUsername", message: "Project-local auth username is required." });
    }
    if (!hasEnteredSecret) {
      issues.push({ field: "secret", message: "Enter the password as write-only preview input before continuing." });
    }
    return issues;
  }

  if (step === "site") {
    if (entry === "new-project") {
      const selectedSite = siteChoices.find((site) => site.id === selectedSiteId);
      const idResult = validateLocalId(selectedSite?.id, "selectedSiteId");
      if (!selectedSite) {
        issues.push({ field: "selectedSiteId", message: "Choose a connected site." });
      } else if (!idResult.ok) {
        issues.push(...fieldIssues(idResult.issues, "selectedSiteId"));
      }
      return issues;
    }
    if (siteDisplayName.trim().length === 0) {
      issues.push({ field: "siteDisplayName", message: "Site display name is required." });
    }
    const domainResult = validateKintoneDomain(siteDomain, "siteDomain");
    if (!domainResult.ok) issues.push(...fieldIssues(domainResult.issues, "siteDomain"));
    return issues;
  }

  if (step === "test") {
    return connectionResult?.status === "passed" ? [] : [{ field: "connectionTest", message: "Connection preview must pass before continuing." }];
  }

  if (step === "apps") {
    if (appScopeMode === "later") {
      return [];
    }
    if (appScopeMode === "by_space") {
      return selectedSpaceNames.length > 0 && selectedAppIds.length > 0 ? [] : [{ field: "apps", message: "Choose at least one Space or select Choose later." }];
    }
    return selectedAppIds.length > 0 ? [] : [{ field: "apps", message: "Choose at least one app or select Choose later." }];
  }

  return [];
}

function TextField({
  label,
  value,
  meta,
  error,
  actionLabel,
  full,
  onChange,
  onAction,
}: {
  label: string;
  value: string;
  meta?: string;
  error?: string;
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
      {error ? <span className="hint field-error">{error}</span> : null}
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
  hasIssue,
  showLine,
}: {
  marker: string;
  label: string;
  state?: "done" | "active";
  hasIssue?: boolean;
  showLine: boolean;
}) {
  return (
    <>
      <div className={`step ${state === "done" ? "done step--done" : ""} ${state === "active" ? "active step--active" : ""} ${hasIssue ? "step--error" : ""}`}>
        <span className="sn step__number">{marker}</span>
        {label}
      </div>
      {showLine ? <span className="step-line" /> : null}
    </>
  );
}
