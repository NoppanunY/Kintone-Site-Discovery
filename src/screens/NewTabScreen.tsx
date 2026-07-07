import { EmptyState, PrimaryActionButton, SecondaryActionButton } from "../components";

interface NewTabScreenProps {
  onAddSite: () => void;
  onOpenSite: () => void;
}

export function NewTabScreen({ onAddSite, onOpenSite }: NewTabScreenProps) {
  return (
    <div className="page new-tab-page">
      <div className="new-tab-panel">
        <EmptyState icon="+" title="Open a project" body="Open an existing project tab or create another project for a kintone site." />
        <div className="btn-row new-tab-actions">
          <PrimaryActionButton label="Open recent project" onClick={onOpenSite} />
          <SecondaryActionButton label="New project from site" onClick={onAddSite} />
        </div>
      </div>
    </div>
  );
}
