import { EmptyState, PrimaryActionButton, SecondaryActionButton } from "../components";

interface NewTabScreenProps {
  onAddSite: () => void;
  onOpenSite: () => void;
}

export function NewTabScreen({ onAddSite, onOpenSite }: NewTabScreenProps) {
  return (
    <div className="page new-tab-page">
      <div className="new-tab-panel">
        <EmptyState icon="+" title="Open a site workspace" body="Open an existing site tab or add a new read-only workspace." />
        <div className="btn-row new-tab-actions">
          <PrimaryActionButton label="Open in tab" onClick={onOpenSite} />
          <SecondaryActionButton label="Add site" onClick={onAddSite} />
        </div>
      </div>
    </div>
  );
}
