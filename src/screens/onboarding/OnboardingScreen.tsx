import { useMemo, useState } from "react";
import { StatusPill } from "../../components";

interface OnboardingScreenProps {
  onCancel: () => void;
  onFinish: () => void;
}

const steps = ["Project", "Sign-in", "Site", "Test", "Apps"] as const;

type OnboardingStep = (typeof steps)[number];

export function OnboardingScreen({ onCancel, onFinish }: OnboardingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const content = useMemo(() => renderStep(step), [step]);

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
          <span className="tb-title">Welcome to Kintone Site Discovery</span>
        </div>
        <div className="wizard">
          <div className="wizard-card">
            <div className="card-pad card-pad--separated">
              <div className="stepper">
                {steps.map((label, index) => (
                  <Step
                    key={label}
                    marker={index < stepIndex ? "✓" : String(index + 1)}
                    label={label}
                    state={index < stepIndex ? "done" : index === stepIndex ? "active" : undefined}
                    showLine={index < steps.length - 1}
                  />
                ))}
              </div>
            </div>
            <div className="wizard-card__body">{content}</div>
            <div className="wizard-card__footer">
              <button type="button" className="btn btn--ghost" onClick={stepIndex === 0 ? onCancel : goBack}>
                {stepIndex === 0 ? "Cancel setup" : "← Back"}
              </button>
              <div className="rowc">
                <span className="small muted2">
                  Step {stepIndex + 1} of {steps.length}
                </span>
                <button type="button" className="btn btn--primary" onClick={goNext}>
                  {isLastStep ? "Go to site Overview" : "Continue →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderStep(step: OnboardingStep) {
  if (step === "Project") {
    return (
      <>
        <WizardIntro
          title="Create a local project"
          body="A project is a local folder for site workspaces, snapshots, reports and developer files."
        />
        <div className="form-grid">
          <MockField label="Project name" value="Client CRM Discovery" />
          <MockField label="Local folder" value="~/KintoneDiscovery/client-crm" action="Browse…" />
        </div>
      </>
    );
  }

  if (step === "Sign-in") {
    return (
      <>
        <WizardIntro title="Add an auth profile" body="This profile can be reused across site workspaces. Password entry is mocked in this UI pass." />
        <div className="form-grid">
          <MockField label="Profile name" value="Client A Admin" />
          <MockField label="Username" value="ca-admin@client-a" />
          <MockField label="Password" value="••••••••" meta="Mock only · future build stores this in the OS keychain" />
        </div>
      </>
    );
  }

  if (step === "Site") {
    return (
      <>
        <WizardIntro title="Add a kintone site workspace" body="You can add more sites later. This tool only reads — nothing on kintone changes." />
        <div className="form-grid">
          <MockField label="Site display name" value="Client A Production" />
          <MockField label="kintone domain" value="client-a.cybozu.com" meta="Domain only, no protocol" />
          <MockField label="Save snapshots to" value="~/KintoneDiscovery/client-a" action="Browse…" />
        </div>
      </>
    );
  }

  if (step === "Test") {
    return (
      <>
        <WizardIntro title="Test the read-only connection" body="This mock confirms the path through the wizard. No kintone request is sent yet." />
        <div className="list">
          <CheckRow label="Domain reachable" />
          <CheckRow label="Credentials accepted" />
          <CheckRow label="Read permission confirmed" />
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
          <b>You're all set.</b> Client A Production is connected and its apps are loaded. Choose a scan preset next — most people start with Standard.
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

function CheckRow({ label }: { label: string }) {
  return (
    <div className="li">
      <div className="grow">
        <div className="h3">{label}</div>
        <div className="small muted2">Mock check passed</div>
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
