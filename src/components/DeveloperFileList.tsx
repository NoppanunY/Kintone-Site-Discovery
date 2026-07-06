import type { DeveloperFileItem } from "../types";
import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface DeveloperFileListProps {
  files: DeveloperFileItem[];
  onOpen?: (name: string) => void;
}

export function DeveloperFileList({ files, onOpen }: DeveloperFileListProps) {
  return (
    <div className="list">
      {files.map((file) => (
        <div key={file.name} className="li">
          <span className="developer-file__icon mono small">{`{ }`}</span>
          <div className="grow">
            <div className="h3 mono">{file.name}</div>
            <div className="small muted2">{file.size}</div>
          </div>
          {file.redacted ? <StatusPill status="ok" label="Redacted" dot /> : null}
          <SecondaryActionButton label="Open" size="sm" onClick={() => onOpen?.(file.name)} />
        </div>
      ))}
    </div>
  );
}
