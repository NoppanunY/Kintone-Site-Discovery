import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "../../components";
import { profiles } from "../../mockData";

export type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface OnboardingScreenProps {
  entry?: OnboardingEntry;
  onCancel: () => void;
  onFinish: () => void;
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

export function OnboardingScreen({ entry = "new-project", onCancel, onFinish }: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [selectedProfile, setSelectedProfile] = useState("Client A Admin");
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const cancelLabel = entry === "add-site" ? "Cancel add site" : entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : "Open site Overview";
  const content = useMemo(
    () =>
      renderStep({
        step: step.key,
        entry,
        authMode,
        selectedProfile,
        onSelectAuthMode: setAuthMode,
        onSelectProfile: setSelectedProfile,
      }),
    [authMode, entry, selectedProfile, step.key],
  );

  useEffect(() => {
    setStepIndex(0);
    setAuthMode(entry === "add-auth" ? "new" : "existing");
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
              <button type="button" className="btn btn--ghost" onClick={stepIndex === 0 ? onCancel : goBack}>
                {stepIndex === 0 ? cancelLabel : "← Back"}
              </button>
              <div className="rowc">
                <span className="small muted2">
                  Step {stepIndex + 1} of {steps.length}
                </span>
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
  selectedProfile,
  onSelectAuthMode,
  onSelectProfile,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  selectedProfile: string;
  onSelectAuthMode: (mode: AuthMode) => void;
  onSelectProfile: (profile: string) => void;
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
          <MockField label="Local folder" value="~/KintoneDiscovery/client-crm" action="Browse..." />
        </div>
      </>
    );
  }

  if (step === "auth") {
    if (entry === "add-auth") {
      return (
        <>
          <WizardIntro
            title="Add an auth profile"
            body="Create a reusable sign-in profile for this project. This UI pass is mock-only and does not store real credentials."
          />
          <AuthProfileFields />
        </>
      );
    }

    return (
      <>
        <WizardIntro
          title="Choose an auth profile"
          body="Use an existing profile for the first site workspace, or add a new profile in this setup."
        />
        <div className="choice-list">
          <ChoiceRow
            title="Use existing auth profile"
            body="Best when the account already exists in this local project."
            selected={authMode === "existing"}
            onClick={() => onSelectAuthMode("existing")}
          />
          {authMode === "existing" ? <ProfileChoiceList nested selectedProfile={selectedProfile} onSelectProfile={onSelectProfile} /> : null}
          <ChoiceRow
            title="Add new auth profile"
            body="Mock credential fields are shown, but no secret is written yet."
            selected={authMode === "new"}
            onClick={() => onSelectAuthMode("new")}
          />
        </div>
        {authMode === "new" ? <AuthProfileFields /> : <SelectedProfileBanner selectedProfile={selectedProfile} />}
      </>
    );
  }

  if (step === "site") {
    const title = entry === "add-site" ? "Add a site to this project" : "Add the first site workspace";
    const body =
      entry === "add-site"
        ? "This adds one kintone site workspace under Client CRM Discovery. It does not create a new project."
        : "A site workspace is one kintone domain inside the project. You can add more sites later.";

    return (
      <>
        <WizardIntro title={title} body={body} />
        <div className="form-grid">
          <MockField label="Current project" value="Client CRM Discovery" />
          <MockField label="Site display name" value={entry === "add-site" ? "Client A Staging" : "Client A Production"} />
          <MockField label="kintone domain" value={entry === "add-site" ? "staging.client-a.cybozu.com" : "client-a.cybozu.com"} meta="Domain only, no protocol" />
          {entry === "add-site" ? (
            <div className="form-group form-group--full">
              <span className="label">Auth profile</span>
              <ProfileChoiceList selectedProfile={selectedProfile} onSelectProfile={onSelectProfile} />
              <span className="hint">Choose the reusable profile to link to this site workspace.</span>
            </div>
          ) : (
            <MockField label="Auth profile" value={selectedProfile} meta="Reusable profile linked to this site workspace" />
          )}
          <MockField label="Save snapshots to" value="~/KintoneDiscovery/client-crm/sites/client-a" action="Browse..." />
        </div>
      </>
    );
  }

  if (step === "test") {
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This mock confirms the path through the wizard. No kintone request is sent yet." />
        <div className="list">
          <CheckRow label="Project folder selected" detail="Client CRM Discovery is the local workspace." />
          <CheckRow label="Auth profile linked" detail={`${selectedProfile} is selected for this site.`} />
          <CheckRow label="Read permission check" detail="Mock check passed without contacting kintone." />
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

function AuthProfileFields() {
  return (
    <div className="form-grid">
      <MockField label="Profile name" value="Client A Admin" />
      <MockField label="Username" value="ca-admin@client-a" />
      <MockField label="Password" value="••••••••" meta="Mock only · future build stores this in the OS keychain" />
      <MockField label="Credential scope" value="This project only" meta="No real credential storage is wired in this skeleton." />
    </div>
  );
}

function SelectedProfileBanner({ selectedProfile }: { selectedProfile: string }) {
  return (
    <div className="banner screen-note">
      <div>
        <b>{selectedProfile}</b> will be linked to the site workspace in this mock flow. Real credential lookup remains a future bridge task.
      </div>
    </div>
  );
}

function ProfileChoiceList({
  nested,
  selectedProfile,
  onSelectProfile,
}: {
  nested?: boolean;
  selectedProfile: string;
  onSelectProfile: (profile: string) => void;
}) {
  return (
    <div className={`choice-list ${nested ? "choice-list--nested" : ""}`} role="listbox" aria-label="Auth profiles">
      {profiles.map((profile) => (
        <button
          key={profile.name}
          type="button"
          className={`choice-row choice-row--compact ${profile.name === selectedProfile ? "choice-row--selected" : ""}`}
          aria-selected={profile.name === selectedProfile}
          role="option"
          onClick={() => onSelectProfile(profile.name)}
        >
          <span className="choice-row__marker" aria-hidden="true">
            {profile.name === selectedProfile ? "✓" : ""}
          </span>
          <span className="grow">
            <span className="h3">{profile.name}</span>
            <span className="small muted2">
              {profile.user} · {profile.sites}
            </span>
          </span>
          <StatusPill status={profile.tone} label={profile.status} dot />
        </button>
      ))}
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

function MockField({ label, value, action, meta }: { label: string; value: string; action?: string; meta?: string }) {
  return (
    <div className={`form-group ${action || meta ? "form-group--full" : ""}`}>
      <span className="label">{label}</span>
      <div className="input filled">
        <span>{value}</span>
        {action ? (
          <button type="button" className="btn btn--sm" disabled>
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
