import { SecondaryActionButton } from "./Buttons";

interface SecretFieldProps {
  label: string;
  hasStoredSecret: boolean;
  onSet: (value: string) => void;
  onForget?: () => void;
}

export function SecretField({ label, hasStoredSecret, onSet, onForget }: SecretFieldProps) {
  if (hasStoredSecret) {
    return (
      <div className="form-group">
        <span className="label">{label}</span>
        <div className="rowc">
          <span className="input secret-mask grow" aria-label={`${label} saved`}>
            ••••••
          </span>
          <SecondaryActionButton label="Replace" size="sm" onClick={() => onSet("stored-in-keychain")} />
          {onForget ? <SecondaryActionButton label="Forget" size="sm" variant="ghost" onClick={onForget} /> : null}
        </div>
        <span className="hint">Stored in the OS keychain. No reveal is available.</span>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label className="label" htmlFor="secret-field">
        {label}
      </label>
      <input
        id="secret-field"
        className="input"
        type="password"
        autoComplete="new-password"
        placeholder="Enter password"
        onBlur={(event) => {
          if (event.currentTarget.value) {
            onSet("stored-in-keychain");
            event.currentTarget.value = "";
          }
        }}
      />
      <span className="hint">The value is write-only and is not kept in this preview UI.</span>
    </div>
  );
}
