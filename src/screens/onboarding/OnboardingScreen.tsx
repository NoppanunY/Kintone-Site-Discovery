import { useEffect, useMemo, useState } from "react";
import { ConnectionTestPanel, StatusPill } from "../../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../../mockConnection";
import { profiles, projectRows } from "../../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../../types";

export type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface OnboardingScreenProps {
  entry?: OnboardingEntry;
  onCancel: () => void;
  onFinish: () => void;
  onMockAction?: MockActionHandler;
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
  "add-site": [
    { key: "project", label: "Project" },
    { key: "site", label: "Site" },
    { key: "auth", label: "Auth profile" },
    { key: "test", label: "Test" },
    { key: "apps", label: "Apps" },
  ],
  "add-auth": [{ key: "auth", label: "Auth profile" }],
};

const flowTitles: Record<OnboardingEntry, string> = {
  "new-project": "Create Project",
  "add-site": "Create Project for Site",
  "add-auth": "Add Auth Profile",
};

type AuthMode = "existing" | "new";

export function OnboardingScreen({ entry = "new-project", onCancel, onFinish, onMockAction }: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [selectedProject, setSelectedProject] = useState("Client CRM Discovery");
  const [selectedProfile, setSelectedProfile] = useState("Client A Admin");
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const cancelLabel = entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : "Open project Overview";
  const showMockAction: MockActionHandler = (message) => {
    onMockAction?.(message);
  };
  const connectionTarget: ConnectionTestTarget = {
    siteName: "Client A Production",
    domain: "client-a.cybozu.com",
    authProfile: selectedProfile,
  };

  function connectionOutcomeForProfile(profileName: string) {
    return profiles.find((profile) => profile.name === profileName)?.tone === "warn" ? "failed" : "passed";
  }

  function runConnectionTest(outcome: "passed" | "failed" = connectionOutcomeForProfile(selectedProfile)) {
    setConnectionResult(createTestingConnectionResult(connectionTarget));
    window.setTimeout(() => {
      setConnectionResult(outcome === "failed" ? createFailedConnectionResult(connectionTarget) : createPassedConnectionResult(connectionTarget));
      if (outcome === "passed") {
        showMockAction(`${selectedProfile} connection test passed. No kintone request was sent.`, { tone: "ok" });
      }
    }, 450);
  }

  const content = useMemo(
    () =>
      renderStep({
        step: step.key,
        entry,
        authMode,
        selectedProject,
        selectedProfile,
        onSelectAuthMode: setAuthMode,
        onSelectProfile: setSelectedProfile,
        onMockAction: showMockAction,
        connectionResult,
        onRunConnectionTest: runConnectionTest,
        onClearConnectionTest: () => setConnectionResult(null),
      }),
    [authMode, connectionResult, entry, selectedProfile, selectedProject, step.key],
  );

  useEffect(() => {
    setStepIndex(0);
    setAuthMode(entry === "add-auth" ? "new" : "existing");
    setSelectedProject("Client CRM Discovery");
    setConnectionResult(null);
  }, [entry]);

  const goBack = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (isLastStep) {
      onFinish();
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
                <button type="button" className="btn btn--primary" onClick={goNext}>
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
  selectedProject,
  selectedProfile,
  onSelectAuthMode,
  onSelectProfile,
  onMockAction,
  connectionResult,
  onRunConnectionTest,
  onClearConnectionTest,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  selectedProject: string;
  selectedProfile: string;
  onSelectAuthMode: (mode: AuthMode) => void;
  onSelectProfile: (profile: string) => void;
  onMockAction: MockActionHandler;
  connectionResult: ConnectionTestResult | null;
  onRunConnectionTest: (outcome?: "passed" | "failed") => void;
  onClearConnectionTest: () => void;
}) {
  if (step === "project") {
    const projectName = entry === "add-site" ? "Client CRM Discovery Copy" : "Client CRM Discovery";
    const projectFolder = entry === "add-site" ? "~/KintoneDiscovery/client-crm-copy" : "~/KintoneDiscovery/client-crm";
    return (
      <>
        <WizardIntro
          title="Create a local project"
          body="A project is one local folder for one kintone site. Another project may point to the same site/domain when you need a separate snapshot or auth context."
        />
        <div className="form-grid">
          <MockField label="Project name" value={projectName} />
          <MockField
            label="Local folder"
            value={projectFolder}
            action="Browse..."
            onAction={() => onMockAction("Folder picker is not connected yet. No folder was selected.")}
          />
        </div>
      </>
    );
  }

  if (step === "auth") {
    return (
      <>
        <WizardIntro title={authStepTitle(entry)} body={authStepBody(entry, selectedProject)} />
        {entry === "add-auth" ? (
          <AuthProfileFields />
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
                title="Add new auth profile"
                body="Credential fields are preview-only in this build; no secret is stored yet."
                selected={authMode === "new"}
                onClick={() => onSelectAuthMode("new")}
              />
            </div>
            {authMode === "existing" ? (
              <>
                <SelectField
                  label="Auth profile"
                  value={selectedProfile}
                  options={authProfileOptions()}
                  onChange={onSelectProfile}
                  meta="Global auth profiles can be linked to any project."
                />
                <SelectedProfileBanner selectedProfile={selectedProfile} />
              </>
            ) : (
              <AuthProfileFields />
            )}
          </>
        )}
      </>
    );
  }

  if (step === "site") {
    const projectName = entry === "add-site" ? "Client CRM Discovery Copy" : selectedProject;
    const title = entry === "add-site" ? "Choose the site for this project" : "Choose the project site";
    const body =
      entry === "add-site"
        ? "This creates a separate project for one kintone site. The domain may match another project."
        : "Each project tracks one kintone site. Use another project if you need the same domain in a separate local folder.";
    const snapshotPath = entry === "add-site" ? "~/KintoneDiscovery/client-crm-copy/snapshot" : `${projectFolder(selectedProject)}/snapshot`;

    return (
      <>
        <WizardIntro title={title} body={body} />
        <div className="form-grid">
          <MockField label="Project being created" value={projectName} />
          <MockField label="Site display name" value="Client A Production" />
          <MockField label="kintone domain" value="client-a.cybozu.com" meta="Domain only, no protocol · can match another project" />
          {entry === "new-project" ? <MockField label="Auth profile" value={selectedProfile} meta="Reusable profile linked to this project" /> : null}
          <MockField
            label="Save snapshots to"
            value={snapshotPath}
            action="Browse..."
            onAction={() => onMockAction("Folder picker is not connected yet. No folder was selected.")}
          />
        </div>
      </>
    );
  }

  if (step === "test") {
    const projectName = entry === "add-site" ? "Client CRM Discovery Copy" : selectedProject;
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This checks the setup flow in preview mode. No kintone request is sent yet." />
        <div className="list">
          <CheckRow label="Project selected" detail={`${projectName} is the local workspace.`} />
          <CheckRow label="Global auth profile linked" detail={`${selectedProfile} is selected for this project.`} />
          <CheckRow label="Read permission check" detail="Preview check passed without contacting kintone." />
        </div>
        <div className="rowc">
          <button type="button" className="btn btn--sm" onClick={() => onRunConnectionTest()}>
            Test connection
          </button>
          {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
          {connectionResult?.status === "passed" ? <span className="inline-test-status">Last test passed just now</span> : null}
        </div>
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
        title="Choose apps to include"
        body="Sample app data is loaded so the desktop flow can be reviewed before real collection is connected."
      />
      <div className="list">
        <AppRow name="Sales Management" detail="App 101 · has plugins/customization" />
        <AppRow name="Support Tickets" detail="App 122 · has customization" />
        <AppRow name="Contracts" detail="App 130 · has plugins" />
      </div>
      <div className="setup-complete-line">
        <StatusPill status="ok" label="Ready" dot />
        <span className="small muted2">Project is ready in preview mode.</span>
      </div>
    </>
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

function authStepBody(entry: OnboardingEntry, selectedProject: string) {
  if (entry === "add-auth") {
    return "Create a reusable global sign-in profile. This preview does not store real credentials yet.";
  }

  if (entry === "add-site") {
    return "Choose the auth profile for this new project. It can reuse the same kintone domain as another project.";
  }

  return `Link the project site in ${selectedProject} to a global auth profile, or create a new preview profile.`;
}

function AuthProfileFields() {
  return (
    <div className="form-grid">
      <MockField label="Profile name" value="Client A Admin" />
      <MockField label="Username" value="ca-admin@client-a" />
      <MockField label="Password" value="••••••••" meta="Preview only · credential storage will use the OS keychain" />
      <MockField label="Availability" value="Global" meta="Can be linked to any project." />
    </div>
  );
}

function SelectedProfileBanner({ selectedProfile }: { selectedProfile: string }) {
  return (
    <div className="banner screen-note">
      <div>
        <b>{selectedProfile}</b> will be linked to this project in preview mode. Credential lookup is not connected yet.
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
    value: profile.name,
    label: `${profile.name} · ${profile.user} · ${profile.status}`,
  }));
}

function projectFolder(projectName: string) {
  return projectRows.find((project) => project.name === projectName)?.path ?? "~/KintoneDiscovery/client-crm";
}

function MockField({ label, value, action, meta, onAction }: { label: string; value: string; action?: string; meta?: string; onAction?: () => void }) {
  return (
    <div className={`form-group ${action || meta ? "form-group--full" : ""}`}>
      <span className="label">{label}</span>
      <div className="input filled">
        <span>{value}</span>
        {action ? (
          <button type="button" className="btn btn--sm" onClick={onAction}>
            {action}
          </button>
        ) : null}
      </div>
      {meta ? <span className="hint">{meta}</span> : null}
    </div>
  );
}

function CheckRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="li">
      <div className="grow">
        <div className="h3">{label}</div>
        <div className="small muted2">{detail}</div>
      </div>
      <StatusPill status="ok" label="Passed" dot />
    </div>
  );
}

function AppRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="li">
      <span className="checkbox checked">✓</span>
      <div className="grow">
        <div className="h3">{name}</div>
        <div className="small muted2">{detail}</div>
      </div>
      <StatusPill status="info" label="Selected" />
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
