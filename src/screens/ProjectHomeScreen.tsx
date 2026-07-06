import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { profiles, projectRows, workspaces } from "../mockData";
import { PageHeader } from "./shared";

interface ProjectHomeScreenProps {
  onOpenSite: () => void;
}

export function ProjectHomeScreen({ onOpenSite }: ProjectHomeScreenProps) {
  return (
    <div className="page">
      <PageHeader
        breadcrumb="Home"
        title="Projects"
        subtitle="A project is a local folder that holds your snapshots, reports and developer files."
        actions={<PrimaryActionButton label="New project" icon="＋" />}
      />
      <section className="list" aria-label="Recent projects">
        {projectRows.map((project) => (
          <div className="li" key={project.name}>
            <span className="row-icon" aria-hidden="true">
              📁
            </span>
            <div className="grow">
              <div className="h3">{project.name}</div>
              <div className="small muted2 mono">
                {project.path} · {project.opened}
              </div>
            </div>
            <SecondaryActionButton label="Open" size="sm" />
          </div>
        ))}
      </section>
      <section>
        <div className="between">
          <h2 className="h2">Auth profiles · reusable across sites</h2>
          <SecondaryActionButton label="Add profile" icon="＋" />
        </div>
        <div className="list">
          {profiles.map((profile) => (
            <div className="li" key={profile.name}>
              <span className="row-icon" aria-hidden="true">
                👤
              </span>
              <div className="grow">
                <div className="h3">{profile.name}</div>
                <div className="small muted2">
                  {profile.user} · password <span className="secret-mask">••••••</span>
                </div>
              </div>
              <StatusPill status={profile.tone} label={profile.status} />
              <span className="small muted2">{profile.sites}</span>
              <SecondaryActionButton label="Test" size="sm" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="between">
          <h2 className="h2">Site workspaces</h2>
          <SecondaryActionButton label="Add site" icon="＋" />
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
              <StatusPill status={site.tone} label={site.status} />
              <PrimaryActionButton label="Open" size="sm" onClick={onOpenSite} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
