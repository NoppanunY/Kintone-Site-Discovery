import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { ConnectionTestPanel, PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { createFailedConnectionResult, createPassedConnectionResult, createTestingConnectionResult } from "../mockConnection";
import { profiles, projectRows, workspaces } from "../mockData";
import type { ConnectionTestResult, ConnectionTestTarget, MockActionHandler } from "../types";
import { PageHeader } from "./shared";

interface ProjectHomeScreenProps {
  onAddProfile: () => void;
  onAddSite: () => void;
  onNewProject: () => void;
  onOpenSite: (id: string) => void;
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
  onOpenSite,
  onMockAction,
  requestedAuthTest,
  requestedAuthTestKey,
}: ProjectHomeScreenProps) {
  const [connectionResults, setConnectionResults] = useState<Record<string, ConnectionTestResult | undefined>>({});
  const [selectedProject, setSelectedProject] = useState(projectRows[0].name);
  const projectSites = workspaces.filter((site) => site.projectName === selectedProject);

  function targetForProfile(profile: Profile): ConnectionTestTarget {
    return {
      siteName: "Client A Production",
      domain: "client-a.cybozu.com",
      authProfile: profile.name,
    };
  }

  function runConnectionTest(profile: Profile, outcome: TestOutcome = "passed") {
    const target = targetForProfile(profile);
    setConnectionResults((current) => ({
      ...current,
      [profile.name]: createTestingConnectionResult(target),
    }));

    window.setTimeout(() => {
      setConnectionResults((current) => ({
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

    const requestedProfile = profiles.find((profile) => profile.name === requestedAuthTest);
    if (requestedProfile) {
      runConnectionTest(requestedProfile, "passed");
    }
  }, [requestedAuthTest, requestedAuthTestKey]);

  return (
    <div className="page">
      <PageHeader
        breadcrumb="Home"
        title="Projects"
        subtitle="A project is a local folder that groups site workspaces, snapshots, reports, and developer files."
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
            <SecondaryActionButton
              label={project.name === selectedProject ? "Selected" : "Open project"}
              size="sm"
              disabled={project.name === selectedProject}
              onClick={() => {
                setSelectedProject(project.name);
                onMockAction(`Project "${project.name}" opened. Choose a site workspace below to open a site tab.`);
              }}
            />
          </div>
        ))}
      </div>
      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">
          Auth profiles{" "}
          <span className="small muted2" style={{ fontWeight: 400 }}>
            · global sign-in profiles, reusable across projects and sites
          </span>
        </h2>
        <SecondaryActionButton label="＋ Add auth profile" size="sm" onClick={onAddProfile} />
      </div>
      <div className="list">
        {profiles.map((profile) => {
          const connectionResult = connectionResults[profile.name];
          return (
            <Fragment key={profile.name}>
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
              <span className="small muted2">{profile.sites}</span>
              {connectionResult?.status === "testing" ? <StatusPill status="run" label="Testing..." dot /> : null}
              {connectionResult?.status === "passed" ? <span className="inline-test-status">Last test passed just now</span> : null}
              <SecondaryActionButton label="Test" size="sm" onClick={() => runConnectionTest(profile, profile.tone === "warn" ? "failed" : "passed")} />
            </div>
              {connectionResult?.status === "failed" ? (
                <div className="li li--panel">
                  <ConnectionTestPanel
                    result={connectionResult}
                    onRetry={() => runConnectionTest(profile, profile.tone === "warn" ? "failed" : "passed")}
                    onDismiss={() =>
                      setConnectionResults((current) => ({
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
      <div className="between" style={{ marginTop: 4 }}>
        <h2 className="h2">
          Site workspaces in {selectedProject}{" "}
          <span className="small muted2" style={{ fontWeight: 400 }}>
            · one kintone domain inside a project
          </span>
        </h2>
        <SecondaryActionButton label="＋ Add site workspace" size="sm" onClick={onAddSite} />
      </div>
      <div className="list">
        {projectSites.map((site) => (
          <div className="li" key={site.name}>
            <div className="grow">
              <div className="h3">{site.name}</div>
              <div className="small muted2">
                {site.domain} · {site.profile} · {site.meta}
              </div>
            </div>
            <StatusPill status={site.tone} label={site.status} dot />
            <PrimaryActionButton label="Open site tab" size="sm" onClick={() => onOpenSite(site.id)} />
          </div>
        ))}
        {projectSites.length === 0 ? (
          <div className="li">
            <div className="grow">
              <div className="h3">No site workspaces in this project yet</div>
              <div className="small muted2">Add a site workspace before opening a site tab.</div>
            </div>
            <SecondaryActionButton label="Add site workspace" size="sm" onClick={onAddSite} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
