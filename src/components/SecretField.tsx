import { useEffect, useId, useState } from "react";
import { SecondaryActionButton } from "./Buttons";

interface SecretFieldProps {
  label: string;
  hasStoredSecret: boolean;
  onSet: (value: string) => void | Promise<void>;
  onForget?: () => void;
}

export function SecretField({ label, hasStoredSecret, onSet, onForget }: SecretFieldProps) {
  const fieldId = useId();
  const [isEditing, setIsEditing] = useState(!hasStoredSecret);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft("");
    setIsEditing(!hasStoredSecret);
  }, [hasStoredSecret]);

  async function saveSecret() {
    if (!draft || isSaving) {
      return;
    }

    const value = draft;
    setIsSaving(true);
    try {
      await onSet(value);
      setDraft("");
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (hasStoredSecret && !isEditing) {
    return (
      <div className="form-group">
        <span className="label">{label}</span>
        <div className="rowc">
          <span className="input secret-mask grow" aria-label={`${label} saved`}>
            ******
          </span>
          <SecondaryActionButton label="Replace" size="sm" onClick={() => setIsEditing(true)} />
          {onForget ? <SecondaryActionButton label="Forget" size="sm" variant="ghost" onClick={onForget} /> : null}
        </div>
        <span className="hint">Stored in the OS keychain. No reveal is available.</span>
      </div>
    );
  }

  return (
    <div className="form-group">
      <label className="label" htmlFor={fieldId}>
        {label}
      </label>
      <div className="field-row">
        <input
          id={fieldId}
          className="input"
          type="password"
          autoComplete="new-password"
          placeholder={hasStoredSecret ? "Enter replacement password" : "Enter password"}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void saveSecret();
            }
          }}
        />
        <SecondaryActionButton label={isSaving ? "Saving..." : "Save"} size="sm" onClick={() => void saveSecret()} disabled={!draft || isSaving} />
        {hasStoredSecret ? <SecondaryActionButton label="Cancel" size="sm" variant="ghost" onClick={() => setIsEditing(false)} /> : null}
      </div>
      <span className="hint">The value is write-only and is cleared after it is passed to secure storage.</span>
    </div>
  );
}
