import { useEffect, useMemo, useRef, useState } from "react";
import { PrimaryActionButton, SecondaryActionButton, StatusPill } from "../components";
import { buildKintoneScanCollectorGroups } from "@kintone-site-discovery/core";
import type { KintoneRestCommand, KintoneScanCollectorGroup, KintoneScanLogLine, KintoneScanSessionStatus, PresetId, ScanRun } from "@kintone-site-discovery/core";
import type {
  CreateKintoneScanDebugSessionResult,
  GetActiveKintoneScanRunResult,
  GetKintoneScanRunProgressResult,
  KintoneScanDebugSessionState,
  KintoneScanProgressState,
  ResumeKintoneScanRunResult,
  RunNextKintoneScanDebugCommandResult,
  StartKintoneScanRunResult,
} from "../platform";
import type { SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

type ScanMode = "auto" | "step";
type LogTone = KintoneScanLogLine["tone"];
type LogLine = { prefix: string; text: string; tone?: LogTone };
type UiStatusTone = "ok" | "warn" | "err" | "run" | "idle" | "info";
type ScanRunPanelVariant = "page" | "inline" | "compact";

function stepInitialLogLines(site: SiteWorkspaceModel, presetId: PresetId): LogLine[] {
  return [
    { prefix: "C:\\KintoneSiteDiscovery>", text: `step-scan --preset ${presetId} --project ${site.projectId} --site ${site.siteId} --read-only --dev-only` },
    { prefix: timestampPrefix(), text: `loaded project: ${site.projectName}; connected site: ${site.name} (${site.domain})` },
    { prefix: timestampPrefix(), text: "creating command plan only; no kintone REST request has been run yet", tone: "run" },
  ];
}

export interface ScanRunPanelProps {
  mode?: ScanMode;
  source: "new" | "rerun";
  site: SiteWorkspaceModel;
  presetId: PresetId;
  shouldStartNew: boolean;
  variant?: ScanRunPanelVariant;
  onCancel: () => void;
  onChangeSettings: () => void;
  onStartRun: () => Promise<StartKintoneScanRunResult>;
  onGetRunProgress: (sessionId: string) => Promise<GetKintoneScanRunProgressResult>;
  onGetActiveRun: () => Promise<GetActiveKintoneScanRunResult>;
  onResumeRun: (sessionId: string) => Promise<ResumeKintoneScanRunResult>;
  onCancelRun: (sessionId: string) => Promise<void>;
  onRunFinished: (run: ScanRun) => Promise<void>;
  onCreateStepSession: () => Promise<CreateKintoneScanDebugSessionResult>;
  onRunNextStepCommand: (sessionId: string) => Promise<RunNextKintoneScanDebugCommandResult>;
  onFinishStepSession: (sessionId: string) => Promise<ScanRun | null>;
  onCancelStepSession: (sessionId: string) => Promise<void>;
  onViewResult: (run: ScanRun) => void;
  onViewFullScan: () => void;
}

export function ScanRunningScreen(props: ScanRunPanelProps) {
  return <ScanRunPanel {...props} variant="page" />;
}

export function ScanRunPanel({
  mode = "auto",
  source,
  site,
  presetId,
  shouldStartNew,
  variant = "page",
  onCancel,
  onChangeSettings,
  onStartRun,
  onGetRunProgress,
  onGetActiveRun,
  onResumeRun,
  onCancelRun,
  onRunFinished,
  onCreateStepSession,
  onRunNextStepCommand,
  onFinishStepSession,
  onCancelStepSession,
  onViewResult,
  onViewFullScan,
}: ScanRunPanelProps) {
  const isRerun = source === "rerun";
  const isStepMode = mode === "step";
  const isInline = variant === "inline";
  const isCompact = variant === "compact";
  const [autoProgress, setAutoProgress] = useState<KintoneScanProgressState | null>(null);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [stepSession, setStepSession] = useState<KintoneScanDebugSessionState | null>(null);
  const [stepRun, setStepRun] = useState<ScanRun | null>(null);
  const [stepBusy, setStepBusy] = useState(false);
  const [stepFailed, setStepFailed] = useState(false);
  const [stepLogs, setStepLogs] = useState<LogLine[]>(() => stepInitialLogLines(site, presetId));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const logBodyRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const reportedRunIdRef = useRef<string | null>(null);
  const onStartRunRef = useRef(onStartRun);
  const onGetRunProgressRef = useRef(onGetRunProgress);
  const onGetActiveRunRef = useRef(onGetActiveRun);
  const onResumeRunRef = useRef(onResumeRun);
  const onCancelRunRef = useRef(onCancelRun);
  const onRunFinishedRef = useRef(onRunFinished);
  const onCreateStepSessionRef = useRef(onCreateStepSession);
  const onRunNextStepCommandRef = useRef(onRunNextStepCommand);
  const onFinishStepSessionRef = useRef(onFinishStepSession);
  const onCancelStepSessionRef = useRef(onCancelStepSession);
  const onViewResultRef = useRef(onViewResult);

  const stepGroups = useMemo(() => (stepSession ? buildKintoneScanCollectorGroups(stepSession.commands, stepSession.captures, stepSession.nextCommand) : []), [stepSession]);
  const collectorGroups = isStepMode ? stepGroups : autoProgress?.collectorGroups ?? [];
  const collectorCounts = collectorGroupSummary(collectorGroups);
  const currentRun = isStepMode ? stepRun : autoProgress?.run ?? null;
  const scanStatus = isStepMode ? stepStatus(stepSession, stepRun, stepFailed) : autoProgress?.status ?? (autoError ? "failed" : "planning");
  const progress = isStepMode ? stepProgress(stepSession, stepRun) : autoProgress?.progressPercent ?? 0;
  const visibleLogs = isStepMode ? stepLogs : normalLogLines(autoProgress, autoError);
  const lastLogIdentity = visibleLogs.length > 0 ? `${visibleLogs.length}:${visibleLogs[visibleLogs.length - 1]?.prefix}:${visibleLogs[visibleLogs.length - 1]?.text}` : "empty";
  const currentCommand = isStepMode ? stepSession?.nextCommand : autoProgress?.currentCommand ?? autoProgress?.nextCommand;

  useEffect(() => {
    onStartRunRef.current = onStartRun;
    onGetRunProgressRef.current = onGetRunProgress;
    onGetActiveRunRef.current = onGetActiveRun;
    onResumeRunRef.current = onResumeRun;
    onCancelRunRef.current = onCancelRun;
    onRunFinishedRef.current = onRunFinished;
    onCreateStepSessionRef.current = onCreateStepSession;
    onRunNextStepCommandRef.current = onRunNextStepCommand;
    onFinishStepSessionRef.current = onFinishStepSession;
    onCancelStepSessionRef.current = onCancelStepSession;
    onViewResultRef.current = onViewResult;
  }, [onCancelRun, onCancelStepSession, onCreateStepSession, onFinishStepSession, onGetActiveRun, onGetRunProgress, onResumeRun, onRunFinished, onRunNextStepCommand, onStartRun, onViewResult]);

  useEffect(() => {
    if (!stickToBottomRef.current || !logBodyRef.current) {
      return;
    }
    logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
  }, [lastLogIdentity, currentRun?.id, scanStatus]);

  useEffect(() => {
    if (mode !== "auto") {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function reportRun(progress: KintoneScanProgressState) {
      if (progress.run && reportedRunIdRef.current !== progress.run.id) {
        reportedRunIdRef.current = progress.run.id;
        await onRunFinishedRef.current(progress.run);
      }
    }

    async function poll(sessionId: string) {
      try {
        const result = await onGetRunProgressRef.current(sessionId);
        if (cancelled) {
          return;
        }
        if (!result.ok || !result.progress) {
          setAutoError(result.message);
          return;
        }
        setAutoProgress(result.progress);
        await reportRun(result.progress);
        if (!isTerminalStatus(result.progress.status)) {
          timer = window.setTimeout(() => void poll(sessionId), result.progress.status === "paused" ? 900 : 400);
        }
      } catch (error) {
        if (!cancelled) {
          setAutoError(errorMessage(error));
        }
      }
    }

    async function bootstrap() {
      setAutoError(null);
      setAutoProgress(null);
      setExpandedGroups({});
      stickToBottomRef.current = true;
      reportedRunIdRef.current = null;

      try {
        if (!shouldStartNew) {
          const active = await onGetActiveRunRef.current();
          if (cancelled) {
            return;
          }
          if (active.ok && active.progress) {
            setAutoProgress(active.progress);
            await reportRun(active.progress);
            if (!isTerminalStatus(active.progress.status)) {
              timer = window.setTimeout(() => void poll(active.progress!.sessionId), 250);
            }
            return;
          }
        }

        const started = await onStartRunRef.current();
        if (cancelled) {
          return;
        }
        if (!started.ok) {
          setAutoError(started.message);
          return;
        }
        if (!started.sessionId) {
          setAutoError("Desktop main process is still using the old immediate scan runner. Restart pnpm desktop:dev so normal scan can stream progress and detailed API logs.");
          return;
        }
        if (started.progress) {
          setAutoProgress(started.progress);
        }
        timer = window.setTimeout(() => void poll(started.sessionId!), 250);
      } catch (error) {
        if (!cancelled) {
          setAutoError(errorMessage(error));
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [mode, shouldStartNew, site.projectId]);

  useEffect(() => {
    if (mode !== "step") {
      return;
    }

    let cancelled = false;
    setStepSession(null);
    setStepRun(null);
    setStepFailed(false);
    setExpandedGroups({});
    stickToBottomRef.current = true;
    setStepLogs(stepInitialLogLines(site, presetId));
    void onCreateStepSessionRef.current().then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok || !result.session) {
        setStepFailed(true);
        appendStepLog({ prefix: timestampPrefix(), text: result.message, tone: "err" });
        return;
      }
      setStepSession(result.session);
      appendStepLog({ prefix: timestampPrefix(), text: `planned ${result.session.totalCount} REST command${result.session.totalCount === 1 ? "" : "s"}; waiting for Next`, tone: "ok" });
      for (const skipped of result.session.captures.filter((capture) => capture.status === "skipped")) {
        appendStepLog({ prefix: timestampPrefix(), text: `skipped ${skipped.label}: ${skipped.message ?? "not available in this phase"}`, tone: "warn" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, presetId, site]);

  async function handleAutoResume() {
    if (!autoProgress) {
      return;
    }
    const result = await onResumeRunRef.current(autoProgress.sessionId);
    if (result.ok && result.progress) {
      setAutoProgress(result.progress);
    } else if (!result.ok) {
      setAutoError(result.message);
    }
  }

  async function handleAutoCancel() {
    if (autoProgress && autoProgress.status !== "saving") {
      await onCancelRunRef.current(autoProgress.sessionId);
    }
    onCancel();
  }

  async function handleStepPrimary() {
    if (!stepSession || stepBusy || stepRun) {
      return;
    }

    if (stepSession.done) {
      await handleStepSave(stepSession.sessionId);
      return;
    }

    await handleStepNext(stepSession.sessionId);
  }

  async function handleStepNext(sessionId: string) {
    setStepBusy(true);
    try {
      const currentCommand = stepSession?.nextCommand;
      if (currentCommand) {
        appendStepLog({ prefix: timestampPrefix(), text: `NEXT ${commandSummary(currentCommand)}`, tone: "run" });
      }
      const result = await onRunNextStepCommandRef.current(sessionId);
      if (!result.ok) {
        appendStepLog({ prefix: timestampPrefix(), text: result.message, tone: "err" });
        return;
      }
      if (result.capture && result.command) {
        appendStepLog({ prefix: timestampPrefix(), text: captureLogLine(result.command, result.capture), tone: result.capture.status === "failed" ? "err" : "ok" });
      }
      if (result.session) {
        setStepSession(result.session);
        if (result.session.done) {
          appendStepLog({ prefix: timestampPrefix(), text: "all planned commands have run; snapshot is not saved until Save snapshot is clicked", tone: "ok" });
        }
      }
    } finally {
      setStepBusy(false);
    }
  }

  async function handleStepSave(sessionId: string) {
    setStepBusy(true);
    appendStepLog({ prefix: timestampPrefix(), text: "saving local snapshot from captured step session", tone: "run" });
    try {
      const nextRun = await onFinishStepSessionRef.current(sessionId);
      if (!nextRun) {
        appendStepLog({ prefix: timestampPrefix(), text: "snapshot save failed; session is still available to retry Save snapshot", tone: "err" });
        return;
      }
      setStepRun(nextRun);
      appendStepLog({ prefix: timestampPrefix(), text: `snapshot saved as ${nextRun.snapshotId}`, tone: nextRun.status === "failed" ? "warn" : "ok" });
    } finally {
      setStepBusy(false);
    }
  }

  async function handleStepCancel() {
    if (stepSession && !stepRun) {
      setStepBusy(true);
      try {
        await onCancelStepSessionRef.current(stepSession.sessionId);
      } finally {
        setStepBusy(false);
      }
    }
    onCancel();
  }

  function handleLogScroll() {
    const logBody = logBodyRef.current;
    if (!logBody) {
      return;
    }
    const distanceFromBottom = logBody.scrollHeight - logBody.scrollTop - logBody.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= 8;
  }

  function appendStepLog(line: LogLine) {
    setStepLogs((current) => [...current, line]);
  }

  const runStatusTone: UiStatusTone = currentRun?.status === "failed" ? "err" : currentRun?.status === "completed_with_warnings" ? "warn" : "ok";
  const runStatusLabel = currentRun?.status === "completed_with_warnings" ? "Completed with warnings" : currentRun?.status === "failed" ? "Failed" : "Completed";
  const stepPrimaryLabel = stepSession?.done ? "Save snapshot" : "Next";
  const statusMeta = currentRun ? { tone: runStatusTone, label: runStatusLabel } : statusMetaForSession(scanStatus, isStepMode);
  const title = pageTitle(isStepMode, scanStatus, isRerun, Boolean(currentRun));
  const subtitle = isStepMode
    ? `${presetLabel(presetId)} · ${site.selectedApps} selected apps · one REST request per Next`
    : isRerun
      ? `${presetLabel(presetId)} · ${site.selectedApps} apps · read-only REST capture`
      : `${presetLabel(presetId)} · ${site.selectedApps} selected apps · read-only REST capture`;

  if (isCompact) {
    return (
      <div className="card scan-run-panel scan-run-panel--compact" aria-label="Scan progress">
        <div className="scan-run-compact__head">
          <div className="scan-run-compact__status">
            <span className="h3">{title}</span>
            <StatusPill status={statusMeta.tone} label={statusMeta.label} dot />
          </div>
          <div className="scan-run-compact__actions">
            <span className="small muted">{progress}%</span>
            <SecondaryActionButton label="View full scan" size="sm" disabled={!autoProgress?.sessionId} onClick={onViewFullScan} />
          </div>
        </div>
        <div className="progress" aria-label={`Scan progress ${progress}%`}>
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="small muted2 scan-run-compact__copy">{progressCopy(isStepMode, scanStatus, autoProgress, stepSession, currentCommand, autoError)}</div>
      </div>
    );
  }

  const actions = currentRun ? (
    <>
      <SecondaryActionButton label={isInline ? "Hide scan status" : "Exit to scan setup"} size="sm" variant="ghost" onClick={isInline ? onCancel : onChangeSettings} />
      <PrimaryActionButton label="View result" onClick={() => onViewResultRef.current(currentRun)} />
    </>
  ) : scanStatus === "paused" && autoProgress ? (
    <>
      <SecondaryActionButton label="Cancel scan" size="sm" variant="ghost" onClick={handleAutoCancel} />
      <PrimaryActionButton label="Continue" onClick={handleAutoResume} />
    </>
  ) : scanStatus === "failed" || autoError || stepFailed ? (
    <>
      <SecondaryActionButton label={isInline ? "Open scan setup" : "Exit to scan setup"} size="sm" variant="ghost" onClick={onChangeSettings} />
      <PrimaryActionButton label="Retry" onClick={onChangeSettings} />
    </>
  ) : isStepMode ? (
    <>
      <SecondaryActionButton label={isInline ? "Hide scan status" : "Exit to scan setup"} size="sm" variant="ghost" onClick={handleStepCancel} />
      <PrimaryActionButton label={stepBusy ? "Working..." : stepPrimaryLabel} disabled={!stepSession || stepBusy} onClick={handleStepPrimary} />
    </>
  ) : (
    <>
      {isRerun ? <SecondaryActionButton label="Open scan setup" size="sm" variant="ghost" onClick={onChangeSettings} /> : null}
      <PrimaryActionButton label="Cancel scan" tone="danger" disabled={scanStatus === "saving"} onClick={handleAutoCancel} />
    </>
  );
  const body = (
    <>
      <div className="card card-pad scan-progress-card">
        <div className="between">
          <span className="h3">Overall progress</span>
          <span className="small muted">{progress}%</span>
        </div>
        <div className="progress">
          <i style={{ width: `${progress}%` }} />
        </div>
        <div className="small muted2">{progressCopy(isStepMode, scanStatus, autoProgress, stepSession, currentCommand, autoError)}</div>
      </div>
      <div className="scan-run-panels">
        <div className="list scan-status-panel">
          {isStepMode ? <NextCommandPanel command={stepSession?.nextCommand} done={Boolean(stepSession?.done)} busy={stepBusy} /> : scanStatus === "paused" && currentCommand ? <NextCommandPanel command={currentCommand} done={false} busy={false} title="Paused at error" /> : null}
          <div className="scan-status-summary">
            <div>
              <div className="h3">Collector status</div>
              <div className="small muted2">
                {collectorCounts.done} done · {collectorCounts.skipped} skipped · {collectorCounts.failed} failed
              </div>
            </div>
            <StatusPill status={collectorCounts.failed > 0 ? "err" : collectorCounts.running > 0 ? "run" : collectorCounts.queued > 0 ? "idle" : collectorCounts.skipped > 0 ? "warn" : "ok"} label={`${collectorCounts.total} total`} />
          </div>
          <div className="scan-step-list">
            <CollectorGroups groups={collectorGroups} expandedGroups={expandedGroups} onToggle={(key) => setExpandedGroups((current) => ({ ...current, [key]: !(current[key] ?? false) }))} />
          </div>
        </div>
        <div className="scan-log" aria-label="Scan command log">
          <div className="scan-log__title">
            <span>Run log</span>
            <StatusPill status={logStatusTone(isStepMode, scanStatus)} label={logStatusLabel(isStepMode, scanStatus)} dot />
          </div>
          <div className="scan-log__body" ref={logBodyRef} role="log" aria-live="polite" onScroll={handleLogScroll}>
            {visibleLogs.length === 0 ? (
              <div className="scan-log__line scan-log__line--run">
                <span className="scan-log__prefix">{timestampPrefix()}</span>
                <span>preparing scan session</span>
              </div>
            ) : null}
            {visibleLogs.map((line, index) => (
              <div className={`scan-log__line ${line.tone ? `scan-log__line--${line.tone}` : ""}`} key={`${index}-${line.prefix}-${line.text}`}>
                <span className="scan-log__prefix">{line.prefix}</span>
                <span>{line.text}</span>
              </div>
            ))}
            {currentRun ? null : (
              <div className="scan-log__cursor" aria-hidden="true">
                _
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (isInline) {
    return (
      <div className="scan-run-panel scan-run-panel--inline">
        <div className="scan-run-panel__head">
          <div>
            <div className="breadcrumb">Scan status</div>
            <div className="scan-run-panel__title-row">
              <span className="h2">{title}</span>
              <StatusPill status={statusMeta.tone} label={statusMeta.label} dot />
            </div>
            <p className="body muted">{subtitle}</p>
          </div>
          <div className="rowc">{actions}</div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="page page--scan-running">
      <PageHeader
        breadcrumb={`${site.name} · Scan`}
        title={title}
        titleMeta={<StatusPill status={statusMeta.tone} label={statusMeta.label} dot />}
        subtitle={subtitle}
        actions={actions}
      />
      {body}
    </div>
  );
}

function CollectorGroups({ groups, expandedGroups, onToggle }: { groups: KintoneScanCollectorGroup[]; expandedGroups: Record<string, boolean>; onToggle: (key: string) => void }) {
  if (groups.length === 0) {
    return (
      <div className="li">
        <StatusPill status="idle" label="Queued" dot />
        <div className="grow body muted">Waiting for command plan</div>
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const expanded = expandedGroups[group.key] ?? false;
        return (
          <div className="scan-collector-group" key={group.key}>
            <button type="button" className="scan-collector-group__head" onClick={() => onToggle(group.key)}>
              <span className="scan-collector-group__chevron">{expanded ? "▾" : "▸"}</span>
              <StatusPill status={collectorTone(group)} label={collectorStatusLabel(group.status)} dot />
              <span className="scan-collector-group__title">{group.label}</span>
              <span className="scan-collector-group__summary">{group.summary}</span>
            </button>
            <div className="scan-collector-group__meta small muted2">{group.currentLabel ? `Current: ${group.currentLabel}` : group.lastLabel ? `Last: ${group.lastLabel}` : "Waiting to start"}</div>
            {expanded ? (
              <div className="scan-collector-group__items">
                {group.items.map((item) => (
                  <div className="li scan-collector-item" key={item.key}>
                    <StatusPill status={collectorTone(item)} label={collectorStatusLabel(item.status)} dot />
                    <div className={`grow body ${item.status === "queued" ? "muted" : ""}`}>{item.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function NextCommandPanel({ command, done, busy, title = "Next command" }: { command?: KintoneRestCommand; done: boolean; busy: boolean; title?: string }) {
  return (
    <div className="step-command-panel">
      <div className="between">
        <div>
          <div className="h3">{title}</div>
          <div className="small muted2">{done ? "All commands have run. Save snapshot when ready." : busy ? "Command is running" : "Will run only after the next action."}</div>
        </div>
        <StatusPill status={done ? "ok" : busy ? "run" : "warn"} label={done ? "Ready to save" : busy ? "Running" : "Preview"} dot />
      </div>
      {command ? (
        <div className="step-command-grid">
          <div>
            <span className="small muted2">Method</span>
            <strong>{command.method}</strong>
          </div>
          <div>
            <span className="small muted2">App</span>
            <strong>{command.appName}</strong>
          </div>
          <div>
            <span className="small muted2">Category</span>
            <strong>{command.categoryKey}</strong>
          </div>
          <div>
            <span className="small muted2">State</span>
            <strong>{command.state}</strong>
          </div>
          <div className="step-command-endpoint">
            <span className="small muted2">Endpoint</span>
            <code>{command.endpointPath}</code>
          </div>
        </div>
      ) : (
        <div className="small muted2">No next REST request is queued.</div>
      )}
    </div>
  );
}

function collectorTone(row: { status: string }): "ok" | "warn" | "err" | "run" | "idle" {
  if (row.status === "done") return "ok";
  if (row.status === "failed") return "err";
  if (row.status === "running") return "run";
  if (row.status === "skipped") return "warn";
  return "idle";
}

function collectorStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function collectorGroupSummary(groups: KintoneScanCollectorGroup[]) {
  return groups.reduce(
    (summary, group) => ({
      done: summary.done + group.done,
      running: summary.running + group.running,
      queued: summary.queued + group.queued,
      skipped: summary.skipped + group.skipped,
      failed: summary.failed + group.failed,
      total: summary.total + group.total,
    }),
    { done: 0, running: 0, queued: 0, skipped: 0, failed: 0, total: 0 },
  );
}

function stepStatus(session: KintoneScanDebugSessionState | null, run: ScanRun | null, failed: boolean): KintoneScanSessionStatus {
  if (run) return run.status === "failed" ? "failed" : "completed";
  if (failed) return "failed";
  if (!session) return "planning";
  return "running";
}

function stepProgress(session: KintoneScanDebugSessionState | null, run: ScanRun | null) {
  if (run) return 100;
  if (!session) return 0;
  if (session.totalCount === 0) return 100;
  return Math.round((session.completedCount / (session.totalCount + 1)) * 100);
}

function progressCopy(
  isStepMode: boolean,
  status: KintoneScanSessionStatus,
  progress: KintoneScanProgressState | null,
  stepSession: KintoneScanDebugSessionState | null,
  command: KintoneRestCommand | undefined,
  error: string | null,
) {
  if (error) return error;
  if (status === "paused") return "Paused after an API error. Review the log, then continue or cancel.";
  if (status === "saving") return "Writing local snapshot and scan history";
  if (status === "completed") return "Snapshot run is saved. Open the result when ready.";
  if (status === "failed") return progress?.run ? "Partial snapshot is saved for inspection. current.json was not updated." : "Scan failed before a snapshot could be saved.";
  if (isStepMode) {
    if (!stepSession) return "Planning REST commands without calling kintone";
    if (stepSession.done) return "All REST commands have run. current.json is still unchanged until Save snapshot succeeds.";
    return `${stepSession.completedCount} of ${stepSession.totalCount} REST commands have run.`;
  }
  if (command) return `Current command: ${command.method} ${command.endpointPath}`;
  return progress ? `${progress.completedCount} of ${progress.totalCount} scan actions completed.` : "Planning REST commands";
}

function pageTitle(isStepMode: boolean, status: KintoneScanSessionStatus, isRerun: boolean, hasRun: boolean) {
  if (hasRun) return isStepMode ? "Step scan finished" : "Scan finished";
  if (status === "paused") return "Scan paused";
  if (status === "saving") return isStepMode ? "Saving step snapshot..." : "Saving snapshot...";
  if (status === "failed") return isStepMode ? "Step scan failed" : "Scan failed";
  if (isStepMode) return status === "planning" ? "Preparing step scan..." : "Step scan";
  if (status === "planning") return "Preparing scan...";
  return isRerun ? "Re-running scan..." : "Scanning...";
}

function statusMetaForSession(status: KintoneScanSessionStatus, isStepMode: boolean): { tone: UiStatusTone; label: string } {
  if (status === "paused") return { tone: "warn", label: "Paused" };
  if (status === "failed") return { tone: "err", label: "Failed" };
  if (status === "saving") return { tone: "run", label: "Saving" };
  if (status === "completed") return { tone: "ok", label: "Completed" };
  if (status === "planning") return { tone: "idle", label: "Planning" };
  return { tone: isStepMode ? "warn" : "run", label: isStepMode ? "Dev step mode" : "Running" };
}

function commandSummary(command: KintoneRestCommand) {
  return `${command.method} ${command.endpointPath} · app ${command.kintoneAppId} · ${command.categoryKey} · ${command.state}`;
}

function captureLogLine(command: KintoneRestCommand, capture: { status: string; message?: string; httpStatus?: number; redactions: unknown[] }) {
  if (capture.status === "failed") {
    return `failed ${command.method} ${command.endpointPath}: ${capture.message ?? "request failed"}`;
  }
  return `captured ${command.method} ${command.endpointPath}; HTTP ${capture.httpStatus ?? "n/a"}; redactions=${capture.redactions.length}`;
}

function logLineFromProgress(line: KintoneScanLogLine): LogLine {
  return {
    prefix: `[${new Date(line.at).toLocaleTimeString("en-GB", { hour12: false })}]`,
    text: line.message,
    tone: line.tone,
  };
}

function normalLogLines(progress: KintoneScanProgressState | null, error: string | null): LogLine[] {
  const lines = (progress?.logLines ?? []).map(logLineFromProgress);
  if (!error) {
    return lines;
  }
  return [...lines, { prefix: timestampPrefix(), text: `scan could not start: ${error}`, tone: "err" }];
}

function isTerminalStatus(status: KintoneScanSessionStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function timestampPrefix() {
  return `[${new Date().toLocaleTimeString("en-GB", { hour12: false })}]`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logStatusTone(isStepMode: boolean, status: KintoneScanSessionStatus): UiStatusTone {
  if (status === "failed" || status === "cancelled") return "err";
  if (status === "paused") return "warn";
  if (status === "completed") return "ok";
  return isStepMode ? "warn" : "run";
}

function logStatusLabel(isStepMode: boolean, status: KintoneScanSessionStatus) {
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "paused") return "Paused";
  if (status === "completed") return "Completed";
  return isStepMode ? "Step scan" : "REST scan";
}

function presetLabel(presetId: PresetId) {
  if (presetId === "quick") return "Quick Scan";
  if (presetId === "full_discovery") return "Full Discovery";
  return "Standard Scan";
}
