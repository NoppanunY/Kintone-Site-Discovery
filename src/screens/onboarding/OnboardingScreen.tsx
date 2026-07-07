interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  return (
    <div className="canvas">
      <div className="app">
        <div className="titlebar">
          <span className="tl r" />
          <span className="tl y" />
          <span className="tl g" />
          <span className="tb-title">Welcome to Kintone Site Discovery</span>
        </div>
        <div style={{ flex: "1 1 0%", display: "flex", alignItems: "center", justifyContent: "center", padding: 34, background: "var(--surface-2)" }}>
          <div className="card" style={{ width: 620 }}>
            <div className="card-pad" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="stepper">
                <Step state="done" marker="✓" label="Project" />
                <span className="step-line" />
                <Step state="done" marker="✓" label="Sign-in" />
                <span className="step-line" />
                <Step state="active" marker="3" label="Site" />
                <span className="step-line" />
                <Step marker="4" label="Test" />
                <span className="step-line" />
                <Step marker="5" label="Apps" />
              </div>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 className="h1">Add your first kintone site</h2>
                <p className="body muted" style={{ marginTop: 5 }}>
                  You can add more sites later. This tool only reads — nothing on kintone changes.
                </p>
              </div>
              <div className="form-group">
                <span className="label">Site display name</span>
                <div className="input filled">Client A Production</div>
              </div>
              <div className="form-group">
                <span className="label">kintone domain</span>
                <div className="input filled">client-a.cybozu.com</div>
                <span className="hint">Enter the domain only — we validate the format.</span>
              </div>
              <div className="form-group">
                <span className="label">Save snapshot to</span>
                <div className="input filled">
                  ~/KintoneDiscovery/client-a <span className="btn btn--sm" style={{ height: 26 }}>Browse…</span>
                </div>
              </div>
              <div className="divider" />
              <div className="between">
                <button type="button" className="btn btn--ghost">
                  ← Back
                </button>
                <div className="rowc">
                  <span className="small muted2">Step 3 of 5</span>
                  <button type="button" className="btn btn--primary" onClick={onFinish}>
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ marker, label, state }: { marker: string; label: string; state?: "done" | "active" }) {
  return (
    <div className={`step ${state === "done" ? "done step--done" : ""} ${state === "active" ? "active step--active" : ""}`}>
      <span className="sn step__number">{marker}</span>
      {label}
    </div>
  );
}
