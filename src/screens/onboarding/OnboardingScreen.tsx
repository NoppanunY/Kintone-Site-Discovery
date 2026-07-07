import { useEffect, useMemo, useState } from "react";
import { ConnectionTestPanel, StatusPill } from "../../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../../mockConnection";
import { connectedSites, getConnectedSiteById, profiles } from "../../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../../types";

export type OnboardingEntry = "new-project" | "add-site" | "add-auth";

interface OnboardingScreenProps {
  entry?: OnboardingEntry;
  onCancel: () => void;
  onFinish: () => void;
  onMockAction?: MockActionHandler;
  initialSiteId?: string | null;
}

type StepKey = "project" | "auth" | "site" | "test" | "apps";

interface StepDefinition {
  key: StepKey;
  label: string;
}

const flowSteps: Record<OnboardingEntry, StepDefinition[]> = {
  "new-project": [
    { key: "project", label: "Project" },
    { key: "site", label: "Site" },
    { key: "apps", label: "Apps" },
  ],
  "add-site": [
    { key: "site", label: "Site" },
    { key: "auth", label: "Auth profile" },
    { key: "test", label: "Test" },
  ],
  "add-auth": [{ key: "auth", label: "Auth profile" }],
};

const flowTitles: Record<OnboardingEntry, string> = {
  "new-project": "Create Project",
  "add-site": "Add Connected Site",
  "add-auth": "Add Auth Profile",
};

type AuthMode = "existing" | "new";

export function OnboardingScreen({ entry = "new-project", onCancel, onFinish, onMockAction, initialSiteId }: OnboardingScreenProps) {
  const steps = flowSteps[entry];
  const [stepIndex, setStepIndex] = useState(0);
  const [authMode, setAuthMode] = useState<AuthMode>(entry === "add-auth" ? "new" : "existing");
  const [selectedSiteId, setSelectedSiteId] = useState(getInitialSiteId(initialSiteId));
  const [selectedProfile, setSelectedProfile] = useState(getConnectedSiteById(getInitialSiteId(initialSiteId)).profile);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;
  const cancelLabel = entry === "add-auth" ? "Cancel add profile" : "Cancel setup";
  const finishLabel = entry === "add-auth" ? "Save auth profile" : entry === "add-site" ? "Save connected site" : "Open project Overview";
  const showMockAction: MockActionHandler = (message, options) => {
    onMockAction?.(message, options);
  };
  const connectionTarget: ConnectionTestTarget = {
    siteName: entry === "add-site" ? "Client A QA" : getConnectedSiteById(selectedSiteId).name,
    domain: entry === "add-site" ? "client-a-qa.cybozu.com" : getConnectedSiteById(selectedSiteId).domain,
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
        selectedSiteId,
        selectedProfile,
        onSelectAuthMode: setAuthMode,
        onSelectSite: (siteId) => {
          setSelectedSiteId(siteId);
          setSelectedProfile(getConnectedSiteById(siteId).profile);
        },
        onSelectProfile: setSelectedProfile,
        onMockAction: showMockAction,
        connectionResult,
        onRunConnectionTest: runConnectionTest,
        onClearConnectionTest: () => setConnectionResult(null),
      }),
    [authMode, connectionResult, entry, selectedProfile, selectedSiteId, step.key],
  );

  useEffect(() => {
    setStepIndex(0);
    setAuthMode(entry === "add-auth" ? "new" : "existing");
    setSelectedSiteId(getInitialSiteId(initialSiteId));
    setSelectedProfile(getConnectedSiteById(getInitialSiteId(initialSiteId)).profile);
    setConnectionResult(null);
  }, [entry, initialSiteId]);

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
  selectedSiteId,
  selectedProfile,
  onSelectAuthMode,
  onSelectSite,
  onSelectProfile,
  onMockAction,
  connectionResult,
  onRunConnectionTest,
  onClearConnectionTest,
}: {
  step: StepKey;
  entry: OnboardingEntry;
  authMode: AuthMode;
  selectedSiteId: string;
  selectedProfile: string;
  onSelectAuthMode: (mode: AuthMode) => void;
  onSelectSite: (siteId: string) => void;
  onSelectProfile: (profile: string) => void;
  onMockAction: MockActionHandler;
  connectionResult: ConnectionTestResult | null;
  onRunConnectionTest: (outcome?: "passed" | "failed") => void;
  onClearConnectionTest: () => void;
}) {
  if (step === "project") {
    return (
      <>
        <WizardIntro
          title="Create a local project"
          body="A project is a local folder that selects one connected site. You can reuse the same connected site in another project."
        />
        <div className="form-grid">
          <MockField label="Project name" value="Client CRM Discovery Copy" />
          <MockField
            label="Local folder"
            value="~/KintoneDiscovery/client-crm-copy"
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
        <WizardIntro title={authStepTitle(entry)} body={authStepBody(entry)} />
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
                  meta="Global auth profiles can be linked to any connected site."
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
    if (entry === "new-project") {
      const selectedSite = getConnectedSiteById(selectedSiteId);
      return (
        <>
          <WizardIntro
            title="Choose a connected site"
            body="The project will use one existing site connection. The same connected site can be selected by more than one project."
          />
          <div className="form-grid">
            <SelectField
              label="Connected site"
              value={selectedSiteId}
              options={connectedSiteOptions()}
              onChange={onSelectSite}
              meta="Add a connected site first if it is not listed here."
            />
            <MockField label="Domain" value={selectedSite.domain} />
            <MockField label="Auth profile" value={selectedSite.profile} meta="The auth profile belongs to the connected site." />
            <MockField label="Project snapshot folder" value="~/KintoneDiscovery/client-crm-copy/snapshot" />
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
          <MockField label="Site display name" value="Client A QA" />
          <MockField label="kintone domain" value="client-a-qa.cybozu.com" meta="Domain only, no protocol" />
          <MockField label="Connection record" value="Global site list" meta="Projects can choose this site after it is saved." />
        </div>
      </>
    );
  }

  if (step === "test") {
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This checks the setup flow in preview mode. No kintone request is sent yet." />
        <div className="list">
          <CheckRow label="Connected site prepared" detail="Client A QA is ready to be saved to the global site list." />
          <CheckRow label="Global auth profile linked" detail={`${selectedProfile} is selected for this connected site.`} />
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

function authStepBody(entry: OnboardingEntry) {
  if (entry === "add-auth") {
    return "Create a reusable global sign-in profile. This preview does not store real credentials yet.";
  }

  if (entry === "add-site") {
    return "Choose the auth profile for this connected site. Projects will inherit this choice when they use the site.";
  }

  return "Choose a global auth profile, or create a new preview profile.";
}

function AuthProfileFields() {
  return (
    <div className="form-grid">
      <MockField label="Profile name" value="Client A Admin" />
      <MockField label="Username" value="ca-admin@client-a" />
      <MockField label="Password" value="••••••••" meta="Preview only · credential storage will use the OS keychain" />
      <MockField label="Availability" value="Global" meta="Can be linked to any connected site." />
    </div>
  );
}

function SelectedProfileBanner({ selectedProfile }: { selectedProfile: string }) {
  return (
    <div className="banner screen-note">
      <div>
        <b>{selectedProfile}</b> will be linked to this connected site in preview mode. Credential lookup is not connected yet.
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

function connectedSiteOptions() {
  return connectedSites.map((site) => ({
    value: site.id,
    label: `${site.name} · ${site.domain} · ${site.profile}`,
  }));
}

function getInitialSiteId(initialSiteId: string | null | undefined): string {
  if (initialSiteId && connectedSites.some((site) => site.id === initialSiteId)) {
    return initialSiteId;
  }

  return connectedSites[0].id;
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
