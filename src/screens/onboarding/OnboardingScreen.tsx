import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "../../components";
import { profiles, projectRows } from "../../mockData";
import type { MockActionHandler } from "../../types";

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
    { key: "site", label: "Site" },
    { key: "auth", label: "Auth profile" },
    { key: "test", label: "Test" },
    { key: "apps", label: "Apps" },
  ],
  "add-auth": [{ key: "auth", label: "Auth profile" }],
};

const flowTitles: Record<OnboardingEntry, string> = {
  "new-project": "Create Project",
  "add-site": "Add Site Workspace",
  "add-auth": "Add Auth Profile",
};

type AuthMode = "existing" | "new";

export function OnboardingScreen({ entry = "new-project", onCancel, onFinish, onMockAction }: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [selectedProject, setSelectedProject] = useState("Client CRM Discovery");
  const [selectedProfile, setSelectedProfile] = useState("Client A Admin");
  const [mockFeedback, setMockFeedback] = useState("Wizard ready");
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const cancelLabel = entry === "add-site" ? "Cancel add site" : entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : "Open site Overview";
  const showMockAction: MockActionHandler = (message) => {
    setMockFeedback(message);
    onMockAction?.(message);
  };

  const content = useMemo(
    () =>
      renderStep({
        step: step.key,
        entry,
        authMode,
        selectedProject,
        selectedProfile,
        onSelectAuthMode: setAuthMode,
        onSelectProject: setSelectedProject,
        onSelectProfile: setSelectedProfile,
        onMockAction: showMockAction,
      }),
    [authMode, entry, selectedProfile, selectedProject, step.key],
  );

  useEffect(() => {
    setStepIndex(0);
    setAuthMode(entry === "add-auth" ? "new" : "existing");
    setSelectedProject("Client CRM Discovery");
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
        <div className="mock-feedback mock-feedback--wizard" role="status" aria-live="polite">
          {mockFeedback}
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
  onSelectProject,
  onSelectProfile,
  onMockAction,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  selectedProject: string;
  selectedProfile: string;
  onSelectAuthMode: (mode: AuthMode) => void;
  onSelectProject: (project: string) => void;
  onSelectProfile: (profile: string) => void;
  onMockAction: MockActionHandler;
}) {
  if (step === "project") {
    return (
      <>
        <WizardIntro
          title="Create a local project"
          body="A project is the local workspace that groups site workspaces, auth profiles, snapshots, reports and developer files."
        />
        <div className="form-grid">
          <MockField label="Project name" value="Client CRM Discovery" />
          <MockField
            label="Local folder"
            value="~/KintoneDiscovery/client-crm"
            action="Browse..."
            onAction={() => onMockAction("Folder picker bridge stub triggered for project folder. No folder was selected.")}
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
                body="Mock credential fields are shown, but no secret is written yet."
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
                  meta="Global auth profiles can be linked to site workspaces in any project."
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
    const title = entry === "add-site" ? "Add a site to this project" : "Add the first site workspace";
    const body =
      entry === "add-site"
        ? `This adds one kintone site workspace under ${selectedProject}. You will choose or create an auth profile next.`
        : "A site workspace is one kintone domain inside the project. You can add more sites later.";
    const snapshotPath = `${projectFolder(selectedProject)}/sites/client-a`;

    return (
      <>
        <WizardIntro title={title} body={body} />
        <div className="form-grid">
          {entry === "add-site" ? (
            <SelectField
              label="Project"
              value={selectedProject}
              options={projectOptions()}
              onChange={onSelectProject}
              meta="The new site workspace will be added under this project."
            />
          ) : (
            <MockField label="Project being created" value={selectedProject} />
          )}
          <MockField label="Site display name" value={entry === "add-site" ? "Client A Staging" : "Client A Production"} />
          <MockField label="kintone domain" value={entry === "add-site" ? "staging.client-a.cybozu.com" : "client-a.cybozu.com"} meta="Domain only, no protocol" />
          {entry === "new-project" ? <MockField label="Auth profile" value={selectedProfile} meta="Reusable profile linked to this site workspace" /> : null}
          <MockField
            label="Save snapshots to"
            value={snapshotPath}
            action="Browse..."
            onAction={() => onMockAction("Folder picker bridge stub triggered for snapshot folder. No folder was selected.")}
          />
        </div>
      </>
    );
  }

  if (step === "test") {
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This mock confirms the path through the wizard. No kintone request is sent yet." />
        <div className="list">
          <CheckRow label="Project selected" detail={`${selectedProject} is the local workspace.`} />
          <CheckRow label="Global auth profile linked" detail={`${selectedProfile} is selected for this site.`} />
          <CheckRow label="Read permission check" detail="Mock check passed without contacting kintone." />
        </div>
        <div className="rowc">
          <button type="button" className="btn btn--sm" onClick={() => onMockAction("Mock read-only connection test passed. No kintone request was sent.")}>
            Test connection
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <WizardIntro
        title="Choose apps to include"
        body="Mock app data is loaded so the desktop flow can be reviewed before real collection is wired."
      />
      <div className="list">
        <AppRow name="Sales Management" detail="App 101 · has plugins/customization" />
        <AppRow name="Support Tickets" detail="App 122 · has customization" />
        <AppRow name="Contracts" detail="App 130 · has plugins" />
      </div>
      <div className="banner banner--ok">
        <span className="bi">✓</span>
        <div>
          <b>You're all set.</b> The site workspace is ready in the mock flow. Choose a scan preset next; most people start with Standard.
        </div>
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
    return "Create a reusable global sign-in profile. This UI pass is mock-only and does not store real credentials.";
  }

  return `Link the site workspace in ${selectedProject} to a global auth profile, or create a new mock profile.`;
}

function AuthProfileFields() {
  return (
    <div className="form-grid">
      <MockField label="Profile name" value="Client A Admin" />
      <MockField label="Username" value="ca-admin@client-a" />
      <MockField label="Password" value="••••••••" meta="Mock only · future build stores this in the OS keychain" />
      <MockField label="Availability" value="Global" meta="Can be linked to site workspaces in any project." />
    </div>
  );
}

function SelectedProfileBanner({ selectedProfile }: { selectedProfile: string }) {
  return (
    <div className="banner screen-note">
      <div>
        <b>{selectedProfile}</b> will be linked to this site workspace in the mock flow. Real credential lookup remains a future bridge task.
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

function projectOptions() {
  return projectRows.map((project) => ({
    value: project.name,
    label: `${project.name} · ${project.path}`,
  }));
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
