import { SecondaryActionButton } from "./Buttons";

interface FolderPickerRowProps {
  label: string;
  path: string;
  writable?: boolean;
  onBrowse?: () => void;
}

export function FolderPickerRow({ label, path, writable = true, onBrowse }: FolderPickerRowProps) {
  return (
    <div className="folder-row">
      <div className="form-group">
        <span className="label">{label}</span>
        <span className="input mono">{path || "Choose a local folder"}</span>
        {!writable ? <span className="hint">Choose a writable folder before scanning.</span> : null}
      </div>
      <SecondaryActionButton label="Browse..." onClick={onBrowse} />
    </div>
  );
}
