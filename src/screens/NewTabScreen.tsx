import { EmptyState, PrimaryActionButton, SecondaryActionButton } from "../components";

interface NewTabScreenProps {
  onOpenSite: () => void;
}

export function NewTabScreen({ onOpenSite }: NewTabScreenProps) {
  return (
    <div className="page">
      <EmptyState icon="+" title="Open a site workspace" body="Open an existing site tab or add a new read-only workspace." />
      <div className="btn-row">
        <PrimaryActionButton label="Open in tab" onClick={onOpenSite} />
        <SecondaryActionButton label="Add site" />
      </div>
    </div>
  );
}
