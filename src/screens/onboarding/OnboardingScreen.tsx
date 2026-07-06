import { useMemo, useState } from "react";
import { FolderPickerRow, PrimaryActionButton, SecretField, SecondaryActionButton, TopMenuBar, WarningBanner } from "../../components";

const steps = ["Project", "Sign-in", "Site", "Test", "Apps"];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [hasSecret, setHasSecret] = useState(true);

  const canContinue = useMemo(() => step !== 2 || hasSecret, [hasSecret, step]);

  const continueLabel = step === 5 ? "Go to site Overview" : "Continue →";
  const handleContinue = () => {
    if (step === 5) {
      onFinish();
      return;
    }
    setStep((current) => Math.min(5, current + 1) as 1 | 2 | 3 | 4 | 5);
  };

  return (
    <div className="canvas">
      <div className="app app--onboarding">
        <div className="titlebar">
          <span className="traffic-light traffic-light--red" />
          <span className="traffic-light traffic-light--yellow" />
          <span className="traffic-light traffic-light--green" />
          <span className="titlebar__title">Kintone Site Discovery — First run setup</span>
        </div>
        <TopMenuBar />
        <div className="wizard">
          <div className="wizard-card">
            <div className="wizard-card__body">
              <div>
                <div className="breadcrumb">Welcome to Kintone Site Discovery</div>
                <h1 className="h-display">{screenTitle(step)}</h1>
                <p className="body muted">{screenSubtitle(step)}</p>
              </div>
              <div className="stepper" aria-label="Setup progress">
                {steps.map((label, index) => {
                  const position = (index + 1) as 1 | 2 | 3 | 4 | 5;
                  const done = position < step;
                  const active = position === step;
                  return (
                    <div className="rowc" key={label}>
                      <div className={`step ${done ? "step--done" : ""} ${active ? "step--active" : ""}`}>
                        <span className="step__number">{done ? "✓" : position}</span>
                        <span>{label}</span>
                      </div>
                      {position < 5 ? <span className="step-line" /> : null}
                    </div>
                  );
                })}
              </div>
              {step === 1 ? <ProjectStep /> : null}
              {step === 2 ? <SignInStep hasSecret={hasSecret} onSetSecret={() => setHasSecret(true)} onForget={() => setHasSecret(false)} /> : null}
              {step === 3 ? <SiteStep /> : null}
              {step === 4 ? <TestStep /> : null}
              {step === 5 ? <AppsStep /> : null}
            </div>
            <div className="wizard-card__footer">
              <SecondaryActionButton label="← Back" variant="ghost" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3 | 4 | 5)} />
              <span className="small muted2">Step {step} of 5</span>
              <PrimaryActionButton label={continueLabel} disabled={!canContinue} onClick={handleContinue} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function screenTitle(step: number) {
  if (step === 1) return "Create a local project";
  if (step === 2) return "Sign in";
  if (step === 3) return "Add your first kintone site";
  if (step === 4) return "Test the connection";
  return "Choose apps first";
}

function screenSubtitle(step: number) {
  if (step === 1) return "A project is a local folder for snapshots, reports and developer files.";
  if (step === 2) return "Credentials are stored in the OS keychain only. Passwords never render back.";
  if (step === 3) return "You can add more sites later. This tool only reads — nothing on kintone changes.";
  if (step === 4) return "The mock checks below must pass before setup can continue.";
  return "The app list is mock data for this UI skeleton. No kintone call is made.";
}

function ProjectStep() {
  return (
    <div className="form-grid">
      <div className="form-group">
        <span className="label">Project name</span>
        <span className="input">Client CRM Discovery</span>
      </div>
      <FolderPickerRow label="Project folder" path="~/KintoneDiscovery/client-crm" />
    </div>
  );
}

function SignInStep({ hasSecret, onSetSecret, onForget }: { hasSecret: boolean; onSetSecret: () => void; onForget: () => void }) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <span className="label">Profile name</span>
        <span className="input">Client A Admin</span>
      </div>
      <div className="form-group">
        <span className="label">Username</span>
        <span className="input">ca-admin@client-a</span>
      </div>
      <div className="form-group form-group--full">
        <SecretField label="Password" hasStoredSecret={hasSecret} onSet={onSetSecret} onForget={onForget} />
      </div>
    </div>
  );
}

function SiteStep() {
  return (
    <div className="form-grid">
      <div className="form-group">
        <span className="label">Site display name</span>
        <span className="input">Client A Production</span>
      </div>
      <div className="form-group">
        <span className="label">kintone domain</span>
        <span className="input">client-a.cybozu.com</span>
        <span className="hint">Enter the domain only — we validate the format.</span>
      </div>
      <div className="form-group form-group--full">
        <FolderPickerRow label="Save snapshot to" path="~/KintoneDiscovery/client-a" />
      </div>
    </div>
  );
}

function TestStep() {
  return (
    <div className="card">
      <div className="card-pad">
        <h2 className="h2">Testing connection...</h2>
      </div>
      <div className="list">
        {["Domain reachable", "Credentials accepted", "Read permission confirmed"].map((label) => (
          <div className="li" key={label}>
            <span className="checkbox checkbox--checked">✓</span>
            <div className="grow">
              <div className="h3">{label}</div>
              <div className="small muted2">Mock check passed</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppsStep() {
  return (
    <div className="card card-pad">
      <WarningBanner tone="ok">
        <strong>You're all set.</strong> Client A Production is connected and 18 apps are loaded. Choose a scan preset next — most people start with Standard.
      </WarningBanner>
    </div>
  );
}
