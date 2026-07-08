import { Fragment, useEffect, type CSSProperties, useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, SecretField, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { authProfileIdForSelection, connectedSites as mockConnectedSites, profiles as mockProfiles, projectRows as mockProjectRows } from "../mockData";
import type { AuthProfileModel, ConnectedSiteModel, ConnectionTestResult, ConnectionTestTarget, MockActionHandler, ProjectModel } from "../types";
import { PageHeader } from "./shared";

interface ProjectHomeScreenProps {
  onAddProfile: () => void;
  onAddSite: () => void;
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onUseSiteInNewProject: (id: string) => void;
  onMockAction: MockActionHandler;
  requestedAuthTest?: string | null;
  requestedAuthTestKey?: string;
  projects?: ProjectModel[];
  connectedSites?: ConnectedSiteModel[];
  profiles?: AuthProfileModel[];
  onOpenProjectFolder: (projectId: string) => void;
  onUpdateProject: (projectId: string, draft: { name: string; siteId: string; authProfileId: string }) => void;
  onRemoveProject: (projectId: string) => void;
  onUpdateSite: (siteId: string, draft: { displayName: string; domain: string }) => void;
  onRemoveSite: (siteId: string) => void;
  onUpdateAuthProfile: (authProfileId: string, draft: { displayName: string; username: string; credentialUpdated?: boolean }) => void;
  onRemoveAuthProfile: (authProfileId: string) => void;
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

type Profile = AuthProfileModel;
type TestOutcome = "passed" | "failed";
type EditTarget = { kind: "project"; project: ProjectModel } | { kind: "site"; site: ConnectedSiteModel } | { kind: "auth"; profile: AuthProfileModel } | null;
type RemoveTarget =
  | { kind: "project"; project: ProjectModel }
  | { kind: "site"; site: ConnectedSiteModel; linkedProjects: ProjectModel[] }
  | { kind: "auth"; profile: AuthProfileModel; linkedProjects: ProjectModel[] }
  | null;

export function ProjectHomeScreen({
  onAddProfile,
  onAddSite,
  onNewProject,
  onOpenProject,
  onUseSiteInNewProject,
  onMockAction,
  requestedAuthTest,
  requestedAuthTestKey,
  projects: projectRows = mockProjectRows,
  connectedSites = mockConnectedSites,
  profiles = mockProfiles,
  onOpenProjectFolder,
  onUpdateProject,
  onRemoveProject,
  onUpdateSite,
  onRemoveSite,
  onUpdateAuthProfile,
  onRemoveAuthProfile,
}: ProjectHomeScreenProps) {
  const [profileConnectionResults, setProfileConnectionResults] = useState<Record<string, ConnectionTestResult | undefined>>({});
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null);
  const projectItems = projectRows.map((project) => {
    const site = connectedSites.find((item) => item.id === project.siteId) ?? mockConnectedSites[0];
    const profileId = authProfileIdForSelection(project.authSelection);
    const profile = profiles.find((item) => item.id === profileId);
    return {
      ...project,
      siteName: site.name,
      siteDomain: site.domain,
      profileName: project.authSelection.kind === "project_local" ? project.authSelection.displayName : (profile?.name ?? "Missing auth profile"),
    };
  });

  function targetForProfile(profile: Profile): ConnectionTestTarget {
    const linkedProject = projectRows.find((project) => authProfileIdForSelection(project.authSelection) === profile.id);
    const site = connectedSites.find((item) => item.id === linkedProject?.siteId) ?? connectedSites[0] ?? mockConnectedSites[0];
    return {
      siteName: site.name,
      domain: site.domain,
      authProfile: profile.name,
    };
  }

  function runProfileConnectionTest(profile: Profile, outcome: TestOutcome = "passed") {
    const target = targetForProfile(profile);
    setProfileConnectionResults((current) => ({
      ...current,
      [profile.name]: createTestingConnectionResult(target),
    }));

    window.setTimeout(() => {
      setProfileConnectionResults((current) => ({
        ...current,
        [profile.name]: outcome === "failed" ? createFailedConnectionResult(target) : createPassedConnectionResult(target),
      }));
      if (outcome === "passed") {
        onMockAction(`${profile.name} connection test passed. No kintone request was sent.`, { tone: "ok" });
      }
    }, 450);
  }

  useEffect(() => {
    if (!requestedAuthTest) {
      return;
    }

    const requestedProfile = profiles.find((profile) => profile.id === requestedAuthTest || profile.name === requestedAuthTest);
    if (requestedProfile) {
      runProfileConnectionTest(requestedProfile, requestedProfile.tone === "warn" ? "failed" : "passed");
    }
  }, [requestedAuthTest, requestedAuthTestKey]);

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Home"
        title="Projects"
        subtitle="Projects are local folders. Each project selects one connected site, and the same site can be reused by multiple projects."
        actions={<PrimaryActionButton label="＋ New project" onClick={onNewProject} />}
      />

      <div className="list">
        {projectItems.length === 0 ? (
          <div className="li">
            <div className="grow">
              <div className="h3">No projects yet</div>
              <div className="small muted2">Create a project to initialize local project settings.</div>
            </div>
            <PrimaryActionButton label="New project" size="sm" onClick={onNewProject} />
          </div>
        ) : null}
        {projectItems.map((project) => (
          <div className="li" key={project.id}>
            <div style={folderIconStyle}>📁</div>
            <div className="grow">
              <div className="h3">{project.name}</div>
              <div className="small muted2">
                Site: {project.siteName} · {project.siteDomain} · Auth: {project.profileName}
              </div>
              <div className="small muted2 mono" style={{ marginTop: 2 }}>
                {project.path} · {project.opened} · {project.meta}
              </div>
            </div>
            <StatusPill status={project.hasSnapshot ? "ok" : "idle"} label={project.hasSnapshot ? "Snapshot ready" : "No snapshot"} dot />
            <PrimaryActionButton label="Open project" size="sm" onClick={() => onOpenProject(project.id)} />
            <div className="row-actions">
              <SecondaryActionButton label="Edit" size="sm" variant="ghost" onClick={() => setEditTarget({ kind: "project", project })} />
              <SecondaryActionButton label="Open folder" size="sm" variant="ghost" onClick={() => onOpenProjectFolder(project.id)} />
              <SecondaryActionButton label="Remove" size="sm" variant="ghost" onClick={() => setRemoveTarget({ kind: "project", project })} />
            </div>
          </div>
        ))}
      </div>

      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">
          Sites{" "}
          <span className="small muted2" style={{ fontWeight: 400 }}>
            · kintone site targets, reusable across projects
          </span>
        </h2>
        <SecondaryActionButton label="＋ Add connected site" size="sm" onClick={onAddSite} />
      </div>
      <div className="list">
        {connectedSites.map((site) => (
          <div className="li" key={site.id}>
            <div className="grow">
              <div className="h3">{site.name}</div>
              <div className="small muted2">{site.domain}</div>
              <div className="small muted2">{site.meta}</div>
            </div>
            <StatusPill status={site.tone} label={site.status} dot />
            <PrimaryActionButton label="Use in new project" size="sm" onClick={() => onUseSiteInNewProject(site.id)} />
            <div className="row-actions">
              <SecondaryActionButton label="Edit" size="sm" variant="ghost" onClick={() => setEditTarget({ kind: "site", site })} />
              <SecondaryActionButton label="Remove" size="sm" variant="ghost" onClick={() => setRemoveTarget({ kind: "site", site, linkedProjects: projectsUsingSite(site.id, projectRows) })} />
            </div>
          </div>
        ))}
      </div>

      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">
          Auth profiles{" "}
          <span className="small muted2" style={{ fontWeight: 400 }}>
            · global sign-in profiles, selected by projects
          </span>
        </h2>
        <SecondaryActionButton label="＋ Add auth profile" size="sm" onClick={onAddProfile} />
      </div>
      <div className="list">
        {profiles.map((profile) => {
          const connectionResult = profileConnectionResults[profile.name];
          return (
            <Fragment key={profile.id}>
              <div className="li">
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
                <span className="small muted2">{profile.usage}</span>
                {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
                {connectionResult?.status === "passed" ? <span className="inline-test-status">Last test passed just now</span> : null}
                <SecondaryActionButton label="Test" size="sm" onClick={() => runProfileConnectionTest(profile, profile.tone === "warn" ? "failed" : "passed")} />
                <div className="row-actions">
                  <SecondaryActionButton label="Edit" size="sm" variant="ghost" onClick={() => setEditTarget({ kind: "auth", profile })} />
                  <SecondaryActionButton label="Remove" size="sm" variant="ghost" onClick={() => setRemoveTarget({ kind: "auth", profile, linkedProjects: projectsUsingAuthProfile(profile.id, projectRows) })} />
                </div>
              </div>
              {connectionResult?.status === "failed" ? (
                <div className="li li--panel">
                  <ConnectionTestPanel
                    result={connectionResult}
                    onRetry={() => runProfileConnectionTest(profile, profile.tone === "warn" ? "failed" : "passed")}
                    onDismiss={() =>
                      setProfileConnectionResults((current) => ({
                        ...current,
                        [profile.name]: undefined,
                      }))
                    }
                  />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {editTarget ? (
        <MetadataEditModal
          target={editTarget}
          connectedSites={connectedSites}
          profiles={profiles}
          onCancel={() => setEditTarget(null)}
          onSave={(target, draft) => {
            if (target.kind === "project") {
              onUpdateProject(target.project.id, draft as { name: string; siteId: string; authProfileId: string });
            } else if (target.kind === "site") {
              onUpdateSite(target.site.id, draft as { displayName: string; domain: string });
            } else {
              onUpdateAuthProfile(target.profile.id, draft as { displayName: string; username: string; credentialUpdated?: boolean });
            }
            setEditTarget(null);
          }}
        />
      ) : null}
      {removeTarget ? (
        <RemoveMetadataDialog
          target={removeTarget}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => {
            if (removeTarget.kind === "project") {
              onRemoveProject(removeTarget.project.id);
            } else if (removeTarget.kind === "site" && removeTarget.linkedProjects.length === 0) {
              onRemoveSite(removeTarget.site.id);
            } else if (removeTarget.kind === "auth" && removeTarget.linkedProjects.length === 0) {
              onRemoveAuthProfile(removeTarget.profile.id);
            }
            setRemoveTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RemoveMetadataDialog({ target, onCancel, onConfirm }: { target: Exclude<RemoveTarget, null>; onCancel: () => void; onConfirm: () => void }) {
  const linkedProjects = target.kind === "project" ? [] : target.linkedProjects;
  const blocked = linkedProjects.length > 0;
  const title = removeDialogTitle(target, blocked);
  const body = removeDialogBody(target, blocked);

  return (
    <div className="modal-overlay metadata-modal-overlay">
      <div className="modal metadata-modal" role="dialog" aria-modal="true" aria-labelledby="remove-dialog-title">
        <div className="modal__section">
          <div className="between">
            <h2 className="h2" id="remove-dialog-title">
              {title}
            </h2>
            <button type="button" className="icon-link-button" onClick={onCancel} aria-label="Close remove dialog">
              ×
            </button>
          </div>
          <p className="body muted">{body}</p>
        </div>
        {blocked ? (
          <div className="modal__section">
            <span className="cap">Linked projects</span>
            <div className="blocked-link-list">
              {linkedProjects.map((project) => (
                <div className="blocked-link-row" key={project.id}>
                  <b>{project.name}</b>
                  <span className="small muted2">{project.path}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="modal__section">
          <div className="wizard-card__footer-actions">
            {blocked ? (
              <PrimaryActionButton label="OK" onClick={onCancel} />
            ) : (
              <>
                <SecondaryActionButton label="Cancel" variant="ghost" onClick={onCancel} />
                <PrimaryActionButton label={target.kind === "project" ? "Remove from Home" : "Remove metadata"} tone="danger" onClick={onConfirm} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function removeDialogTitle(target: Exclude<RemoveTarget, null>, blocked: boolean) {
  if (target.kind === "project") {
    return "Remove project from Home?";
  }
  if (target.kind === "site") {
    return blocked ? "Cannot remove connected site" : "Remove connected site?";
  }
  return blocked ? "Cannot remove auth profile" : "Remove auth profile?";
}

function removeDialogBody(target: Exclude<RemoveTarget, null>, blocked: boolean) {
  if (target.kind === "project") {
    return "This removes the project from Home and closes its tab if open. The project folder and files are not deleted.";
  }
  if (target.kind === "site") {
    return blocked
      ? "This connected site is still used by one or more projects. Edit or remove those projects first, then try again."
      : "This removes only the connected site entry from app metadata. No kintone data or project folder is deleted.";
  }
  return blocked
    ? "This auth profile is still selected by one or more projects. Edit those projects to use another auth profile first, then try again."
    : "This removes only the auth profile entry from app metadata. Stored credentials are not implemented in this preview.";
}

function MetadataEditModal({
  target,
  connectedSites,
  profiles,
  onCancel,
  onSave,
}: {
  target: Exclude<EditTarget, null>;
  connectedSites: ConnectedSiteModel[];
  profiles: AuthProfileModel[];
  onCancel: () => void;
  onSave: (
    target: Exclude<EditTarget, null>,
    draft: { name: string; siteId: string; authProfileId: string } | { displayName: string; domain: string } | { displayName: string; username: string; credentialUpdated?: boolean },
  ) => void;
}) {
  const [projectName, setProjectName] = useState(target.kind === "project" ? target.project.name : "");
  const [projectSiteId, setProjectSiteId] = useState(target.kind === "project" ? target.project.siteId : connectedSites[0]?.id ?? "");
  const [projectAuthProfileId, setProjectAuthProfileId] = useState(target.kind === "project" ? (authProfileIdForSelection(target.project.authSelection) ?? profiles[0]?.id ?? "") : profiles[0]?.id ?? "");
  const [siteName, setSiteName] = useState(target.kind === "site" ? target.site.name : "");
  const [siteDomain, setSiteDomain] = useState(target.kind === "site" ? target.site.domain : "");
  const [profileName, setProfileName] = useState(target.kind === "auth" ? target.profile.name : "");
  const [profileUsername, setProfileUsername] = useState(target.kind === "auth" ? target.profile.user : "");
  const [credentialUpdated, setCredentialUpdated] = useState(false);
  const projectCanSave = projectName.trim().length > 0 && projectSiteId.length > 0 && projectAuthProfileId.length > 0;
  const siteCanSave = siteName.trim().length > 0 && siteDomain.trim().length > 0;
  const authCanSave = profileName.trim().length > 0 && profileUsername.trim().length > 0;

  function save() {
    if (target.kind === "project") {
      onSave(target, { name: projectName.trim(), siteId: projectSiteId, authProfileId: projectAuthProfileId });
    } else if (target.kind === "site") {
      onSave(target, { displayName: siteName.trim(), domain: siteDomain.trim() });
    } else {
      onSave(target, { displayName: profileName.trim(), username: profileUsername.trim(), credentialUpdated });
    }
  }

  const canSave = target.kind === "project" ? projectCanSave : target.kind === "site" ? siteCanSave : authCanSave;
  const title = target.kind === "project" ? "Edit project metadata" : target.kind === "site" ? "Edit connected site metadata" : "Edit auth profile";
  const saveLabel = target.kind === "auth" ? "Save changes" : "Save metadata";

  return (
    <div className="modal-overlay metadata-modal-overlay">
      <div className="modal metadata-modal" role="dialog" aria-modal="true" aria-labelledby="metadata-edit-title">
        <div className="modal__section">
          <div className="between">
            <h2 className="h2" id="metadata-edit-title">
              {title}
            </h2>
            <button type="button" className="icon-link-button" onClick={onCancel} aria-label="Close metadata editor">
              ×
            </button>
          </div>
          <p className="body muted">
            {target.kind === "auth"
              ? "Update profile details and replace the password when needed. The password value is write-only and is not written to metadata."
              : "This updates local app metadata only. Project folders and kintone data are not deleted or modified."}
          </p>
        </div>
        <div className="modal__section">
          {target.kind === "project" ? (
            <div className="form-grid">
              <ModalTextField label="Project name" value={projectName} onChange={setProjectName} />
              <ModalSelectField label="Connected site" value={projectSiteId} options={connectedSites.map((site) => ({ value: site.id, label: `${site.name} · ${site.domain}` }))} onChange={setProjectSiteId} />
              <ModalSelectField label="Auth profile" value={projectAuthProfileId} options={profiles.map((profile) => ({ value: profile.id, label: `${profile.name} · ${profile.user}` }))} onChange={setProjectAuthProfileId} full />
            </div>
          ) : target.kind === "site" ? (
            <div className="form-grid">
              <ModalTextField label="Site display name" value={siteName} onChange={setSiteName} />
              <ModalTextField label="kintone domain" value={siteDomain} onChange={setSiteDomain} />
            </div>
          ) : (
            <div className="form-grid">
              <ModalTextField label="Profile name" value={profileName} onChange={setProfileName} />
              <ModalTextField label="Username" value={profileUsername} onChange={setProfileUsername} />
              <div className="form-group--full">
                <SecretField label="New password" hasStoredSecret={credentialUpdated} onSet={() => setCredentialUpdated(true)} />
                <span className="hint">This preview records only that the credential was updated. The password itself is never serialized.</span>
              </div>
            </div>
          )}
        </div>
        <div className="modal__section">
          <div className="wizard-card__footer-actions">
            <SecondaryActionButton label="Cancel" variant="ghost" onClick={onCancel} />
            <PrimaryActionButton label={saveLabel} onClick={save} disabled={!canSave} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="form-group">
      <label className="label" htmlFor={`modal-${label.replace(/\s+/g, "-").toLowerCase()}`}>
        {label}
      </label>
      <input id={`modal-${label.replace(/\s+/g, "-").toLowerCase()}`} className="input" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </div>
  );
}

function ModalSelectField({
  label,
  value,
  options,
  full,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  full?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`form-group ${full ? "form-group--full" : ""}`}>
      <label className="label" htmlFor={`modal-${label.replace(/\s+/g, "-").toLowerCase()}`}>
        {label}
      </label>
      <select id={`modal-${label.replace(/\s+/g, "-").toLowerCase()}`} className="select" value={value} onChange={(event) => onChange(event.currentTarget.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {options.length === 0 ? <span className="hint">Create metadata first before selecting this value.</span> : null}
    </div>
  );
}

function projectsUsingSite(siteIdValue: string, projects: ProjectModel[]) {
  return projects.filter((project) => project.siteId === siteIdValue);
}

function projectsUsingAuthProfile(authProfileIdValue: string, projects: ProjectModel[]) {
  return projects.filter((project) => authProfileIdForSelection(project.authSelection) === authProfileIdValue);
}
