import type { CSSProperties } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { profiles, projectRows, workspaces } from "../mockData";
import type { MockActionHandler } from "../types";
import { PageHeader } from "./shared";

interface ProjectHomeScreenProps {
  onAddProfile: () => void;
  onAddSite: () => void;
  onNewProject: () => void;
  onOpenSite: () => void;
  onMockAction: MockActionHandler;
}

const folderIconStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: "var(--r-sm)",
  background: "var(--primary-tint)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
};

export function ProjectHomeScreen({ onAddProfile, onAddSite, onNewProject, onOpenSite, onMockAction }: ProjectHomeScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Home"
        title="Projects"
        subtitle="A project is a local folder that holds your snapshots, reports and developer files."
        actions={<PrimaryActionButton label="＋ New project" onClick={onNewProject} />}
      />
      <div className="list">
        {projectRows.map((project) => (
          <div className="li" key={project.name}>
            <div style={folderIconStyle}>📁</div>
            <div className="grow">
              <div className="h3">{project.name}</div>
              <div className="small muted2 mono">
                {project.path} · {project.opened}
              </div>
            </div>
            <SecondaryActionButton label="Open" size="sm" onClick={() => onMockAction(`Project "${project.name}" selected in the mock workspace list.`)} />
          </div>
        ))}
      </div>
      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">
          Auth profiles{" "}
          <span className="small muted2" style={{ fontWeight: 400 }}>
            · global, reusable across projects and sites
          </span>
        </h2>
        <SecondaryActionButton label="＋ Add auth profile" size="sm" onClick={onAddProfile} />
      </div>
      <div className="list">
        {profiles.map((profile) => (
          <div className="li" key={profile.name}>
            <div className="grow rowc">
              <span style={{ fontSize: 16 }}>👤</span>
              <div>
                <div className="h3">{profile.name}</div>
                <div className="small muted2">
                  {profile.user} · password ••••••
                </div>
              </div>
            </div>
            <StatusPill status={profile.tone} label={profile.status} dot />
            <span className="small muted2">{profile.sites}</span>
            <SecondaryActionButton label="Test" size="sm" onClick={() => onMockAction(`Mock connection test passed for ${profile.name}. No kintone request was sent.`)} />
          </div>
        ))}
      </div>
      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">Site workspaces</h2>
        <SecondaryActionButton label="＋ Add site workspace" size="sm" onClick={onAddSite} />
      </div>
      <div className="list">
        {workspaces.map((site) => (
          <div className="li" key={site.name}>
            <div className="grow">
              <div className="h3">{site.name}</div>
              <div className="small muted2">
                {site.domain} · {site.profile} · {site.meta}
              </div>
            </div>
            <StatusPill status={site.tone} label={site.status} dot />
            <PrimaryActionButton label="Open" size="sm" onClick={onOpenSite} />
          </div>
        ))}
      </div>
    </div>
  );
}
