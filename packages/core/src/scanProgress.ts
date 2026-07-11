import type { CollectorKind, CollectorStatus, Id, ISODateString } from "./types.js";
import type { KintoneRestCapture, KintoneRestCommand } from "./kintoneClient.js";

export type KintoneScanErrorMode = "pause_on_error" | "continue_on_error";
export type KintoneScanSessionStatus = "planning" | "running" | "paused" | "saving" | "completed" | "failed" | "cancelled";
export type KintoneScanLogTone = "info" | "ok" | "warn" | "err" | "run";

export interface KintoneScanLogLine {
  id: string;
  at: ISODateString;
  tone: KintoneScanLogTone;
  message: string;
  commandId?: string;
  appId?: Id;
  categoryKey?: string;
  endpointPath?: string;
}

export interface KintoneScanProgressSummary {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
}

export interface KintoneScanCollectorItem {
  key: string;
  label: string;
  kind: CollectorKind;
  status: CollectorStatus | "queued" | "running";
  appId?: Id;
  message?: string;
  endpointPath?: string;
}

export interface KintoneScanCollectorGroup {
  key: string;
  label: string;
  appId?: Id;
  kintoneAppId?: number;
  status: CollectorStatus | "queued" | "running";
  done: number;
  running: number;
  queued: number;
  skipped: number;
  failed: number;
  total: number;
  summary: string;
  currentLabel?: string;
  lastLabel?: string;
  items: KintoneScanCollectorItem[];
}

export function calculateKintoneScanProgress(commands: KintoneRestCommand[], captures: KintoneRestCapture[], status: KintoneScanSessionStatus): KintoneScanProgressSummary {
  const commandCaptureKeys = new Set(captures.filter((capture) => capture.appId).map((capture) => captureKey(capture.appId, capture.endpointKey)));
  const completedCommands = commands.filter((command) => commandCaptureKeys.has(command.id)).length;
  const totalCount = commands.length + 1;
  const completedCount = status === "completed" || status === "failed" ? totalCount : completedCommands;
  const progressPercent = totalCount === 0 ? 100 : Math.min(100, Math.max(0, Math.round((completedCount / totalCount) * 100)));

  return {
    completedCount,
    totalCount,
    progressPercent,
  };
}

export function buildKintoneScanCollectorGroups(commands: KintoneRestCommand[], captures: KintoneRestCapture[], currentCommand?: KintoneRestCommand): KintoneScanCollectorGroup[] {
  const capturesByCommandId = new Map(captures.filter((capture) => capture.appId).map((capture) => [captureKey(capture.appId, capture.endpointKey), capture]));
  const groups = new Map<string, KintoneScanCollectorGroup>();

  for (const command of commands) {
    const key = `app.${command.appId}`;
    let group = groups.get(key);
    if (!group) {
      group = emptyGroup(key, command.appName, command.appId, command.kintoneAppId);
      groups.set(key, group);
    }

    const capture = capturesByCommandId.get(command.id);
    const item: KintoneScanCollectorItem = capture
      ? itemFromCapture(capture)
      : {
          key: command.id,
          label: command.label,
          kind: command.kind,
          status: currentCommand?.id === command.id ? "running" : "queued",
          appId: command.appId,
          endpointPath: command.endpointPath,
          message: command.endpointPath,
        };
    group.items.push(item);
  }

  const siteCaptures = captures.filter((capture) => !capture.appId);
  if (siteCaptures.length > 0) {
    const group = emptyGroup("site", "Site-level collectors");
    group.items.push(...siteCaptures.map(itemFromCapture));
    groups.set(group.key, group);
  }

  return [...groups.values()].map(summarizeGroup);
}

export function formatKintoneScanLogLine(input: {
  id: string;
  at: ISODateString;
  tone: KintoneScanLogTone;
  message: string;
  command?: KintoneRestCommand;
}): KintoneScanLogLine {
  return {
    id: input.id,
    at: input.at,
    tone: input.tone,
    message: sanitizeScanLogText(input.message),
    ...(input.command
      ? {
          commandId: input.command.id,
          appId: input.command.appId,
          categoryKey: input.command.categoryKey,
          endpointPath: sanitizeScanLogText(input.command.endpointPath),
        }
      : {}),
  };
}

export function sanitizeScanLogText(value: string): string {
  return value
    .replace(/(X-Cybozu-Authorization\s*[:=]\s*)[^\s,;)}\]]+/gi, "$1[REDACTED]")
    .replace(/(^|[\s,{])(Authorization\s*[:=]\s*)(Bearer\s+)?[^\s,;)}\]]+/gi, "$1$2[REDACTED]")
    .replace(/(Cookie\s*[:=]\s*).*?(?=(\s+(Authorization|X-Cybozu-Authorization|password|apiToken|accessToken|refreshToken|clientSecret)\s*[:=])|$)/gi, "$1[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/(password|apiToken|accessToken|refreshToken|clientSecret)\s*[:=]\s*[^\s,;)}\]]+/gi, "$1=[REDACTED]");
}

function itemFromCapture(capture: KintoneRestCapture): KintoneScanCollectorItem {
  return {
    key: captureKey(capture.appId ?? "site", capture.endpointKey),
    label: capture.label,
    kind: capture.kind,
    status: capture.status === "captured" ? "done" : capture.status,
    appId: capture.appId,
    endpointPath: capture.endpointPath,
    message: capture.message,
  };
}

function emptyGroup(key: string, label: string, appId?: Id, kintoneAppId?: number): KintoneScanCollectorGroup {
  return {
    key,
    label,
    appId,
    kintoneAppId,
    status: "queued",
    done: 0,
    running: 0,
    queued: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    summary: "0 total",
    items: [],
  };
}

function summarizeGroup(group: KintoneScanCollectorGroup): KintoneScanCollectorGroup {
  const counts = group.items.reduce(
    (summary, item) => ({
      done: summary.done + (item.status === "done" ? 1 : 0),
      running: summary.running + (item.status === "running" ? 1 : 0),
      queued: summary.queued + (item.status === "queued" ? 1 : 0),
      skipped: summary.skipped + (item.status === "skipped" ? 1 : 0),
      failed: summary.failed + (item.status === "failed" ? 1 : 0),
    }),
    { done: 0, running: 0, queued: 0, skipped: 0, failed: 0 },
  );
  const currentItem = group.items.find((item) => item.status === "running");
  const lastFinishedItem = [...group.items].reverse().find((item) => item.status !== "queued");
  const status = counts.failed > 0 ? "failed" : counts.running > 0 ? "running" : counts.queued > 0 ? "queued" : counts.skipped > 0 ? "skipped" : "done";

  return {
    ...group,
    ...counts,
    total: group.items.length,
    status,
    summary: `${counts.done} done · ${counts.skipped} skipped · ${counts.failed} failed`,
    currentLabel: currentItem?.label,
    lastLabel: lastFinishedItem?.label,
  };
}

function captureKey(appId: Id | undefined, endpointKey: string) {
  return `${appId ?? "site"}.${endpointKey}`;
}
