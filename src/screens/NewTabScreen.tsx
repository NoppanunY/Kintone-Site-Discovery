import { EmptyState, PrimaryActionButton, SecondaryActionButton } from "../components";

interface NewTabScreenProps {
  onAddSite: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
}

export function NewTabScreen({ onAddSite, onNewProject, onOpenProject }: NewTabScreenProps) {
  return (
    <div className="page new-tab-page">
      <div className="new-tab-panel">
        <EmptyState icon="+" title="Open a project" body="Open an existing project or create a project that uses a connected site." />
        <div className="btn-row new-tab-actions">
          <PrimaryActionButton label="Open recent project" onClick={onOpenProject} />
          <SecondaryActionButton label="New project" onClick={onNewProject} />
          <SecondaryActionButton label="Add connected site" onClick={onAddSite} />
        </div>
      </div>
    </div>
  );
}
