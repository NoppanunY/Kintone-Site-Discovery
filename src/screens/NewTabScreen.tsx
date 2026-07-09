import { EmptyState, PrimaryActionButton, SecondaryActionButton } from "../components";
import type { ProjectModel } from "../types";

interface NewTabScreenProps {
  onAddSite: () => void;
  onNewProject: () => void;
  onOpenProjectFromFolder: () => void;
  onOpenRecentProject: (projectId: string) => void;
  projects: ProjectModel[];
}

export function NewTabScreen({ onAddSite, onNewProject, onOpenProjectFromFolder, onOpenRecentProject, projects }: NewTabScreenProps) {
  const recentProjects = projects.slice(0, 6);
  return (
    <div className="page new-tab-page">
      <div className="new-tab-panel">
        <EmptyState icon="+" title="Open a project" body="Open a recent project, or create a project that uses a connected site." />
        {recentProjects.length > 0 ? (
          <div className="new-tab-recent-list" aria-label="Recent projects">
            {recentProjects.map((project) => (
              <button type="button" className="new-tab-recent-row" key={project.id} onClick={() => onOpenRecentProject(project.id)}>
                <span>
                  <strong>{project.name}</strong>
                  <span>{project.path}</span>
                </span>
                <span className="small muted2">{project.opened}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="btn-row new-tab-actions">
          <PrimaryActionButton label="New project" onClick={onNewProject} />
          <SecondaryActionButton label="Open from folder..." onClick={onOpenProjectFromFolder} />
          <SecondaryActionButton label="Add connected site" onClick={onAddSite} />
        </div>
      </div>
    </div>
  );
}
