import { Fragment, useEffect, type CSSProperties, useState } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { connectedSites, profiles, projectContext, projectRows } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../types";
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

type Profile = (typeof profiles)[number];
type TestOutcome = "passed" | "failed";

export function ProjectHomeScreen({
  onAddProfile,
  onAddSite,
  onNewProject,
  onOpenProject,
  onUseSiteInNewProject,
  onMockAction,
  requestedAuthTest,
  requestedAuthTestKey,
}: ProjectHomeScreenProps) {
  const [profileConnectionResults, setProfileConnectionResults] = useState<Record<string, ConnectionTestResult | undefined>>({});
  const projects = projectRows.map((project) => ({ ...project, context: projectContext(project.id) }));

  function targetForProfile(profile: Profile): ConnectionTestTarget {
    const linkedProject = projectRows.find((project) => project.authProfileId === profile.id) ?? projectRows[0];
    const context = projectContext(linkedProject.id);
    return {
      siteName: context.name,
      domain: context.domain,
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
        actions={
          <>
            <SecondaryActionButton label="＋ Add connected site" onClick={onAddSite} />
            <PrimaryActionButton label="＋ New project" onClick={onNewProject} />
          </>
        }
      />

      <div className="list">
        {projects.map((project) => (
          <div className="li" key={project.id}>
            <div style={folderIconStyle}>📁</div>
            <div className="grow">
              <div className="h3">{project.name}</div>
              <div className="small muted2">
                Site: {project.context.name} · {project.context.domain} · Auth: {project.context.profile}
              </div>
              <div className="small muted2 mono" style={{ marginTop: 2 }}>
                {project.path} · {project.opened} · {project.meta}
              </div>
            </div>
            <StatusPill status={project.hasSnapshot ? "ok" : "idle"} label={project.hasSnapshot ? "Snapshot ready" : "No snapshot"} dot />
            <PrimaryActionButton label="Open project" size="sm" onClick={() => onOpenProject(project.id)} />
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
    </div>
  );
}
