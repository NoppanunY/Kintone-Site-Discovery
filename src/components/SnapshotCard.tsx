import { SecondaryActionButton } from "./Buttons";
import { StatusPill } from "./StatusPill";

interface SnapshotCardProps {
  statusLabel: string;
  capturedAt: string;
  sizeOnDisk: string;
  folderPath: string;
  onOpenSnapshot?: () => void;
  onOpenFolder?: () => void;
}

export function SnapshotCard({ statusLabel, capturedAt, sizeOnDisk, folderPath, onOpenSnapshot, onOpenFolder }: SnapshotCardProps) {
  return (
    <div className="card">
      <div className="card-pad between">
        <div>
          <h2 className="h2">Local snapshot</h2>
          <p className="body muted">Captured {capturedAt}</p>
        </div>
        <StatusPill status="warn" label={statusLabel} dot />
      </div>
      <div className="list">
        <div className="li between">
          <span className="body">Size on disk</span>
          <span className="mono">{sizeOnDisk}</span>
        </div>
        <div className="li between">
          <span className="body">Snapshot folder</span>
          <span className="mono muted">{folderPath}</span>
        </div>
      </div>
      <div className="card-pad btn-row">
        <SecondaryActionButton label="Open Local Snapshot" onClick={onOpenSnapshot} />
        <SecondaryActionButton label="Reveal folder" variant="ghost" onClick={onOpenFolder} />
      </div>
    </div>
  );
}
