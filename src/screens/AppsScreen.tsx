import { PrimaryActionButton, SecondaryActionButton, AppTwoPanePicker } from "../components";
import type { AppSummary } from "@kintone-site-discovery/core";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

interface AppsScreenProps {
  site: SiteWorkspaceModel;
  apps: AppSummary[];
  appListSource: "persisted" | "sample";
  selectedAppIds: string[];
  onSelectionChange: (selectedAppIds: string[]) => void;
  onContinue: () => void;
  onReloadApps: () => void;
  isReloadingApps?: boolean;
  onMockAction: MockActionHandler;
  guardMessage?: string | null;
}

export function AppsScreen({ site, apps, appListSource, selectedAppIds, onSelectionChange, onContinue, onReloadApps, isReloadingApps = false, guardMessage }: AppsScreenProps) {
  const selectedCount = selectedAppIds.length;
  const sourceCopy = appListSource === "persisted" ? "persisted app-list metadata" : "development sample fallback";

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Apps`}
        title="Apps"
        subtitle={`${apps.length} apps from ${sourceCopy} · ${selectedCount} selected`}
        actions={
          <>
            <SecondaryActionButton label={isReloadingApps ? "⟳ Reloading..." : "⟳ Reload list"} size="sm" onClick={onReloadApps} disabled={isReloadingApps} />
            <PrimaryActionButton label="Continue to scan →" disabled={selectedCount === 0} onClick={onContinue} />
          </>
        }
      />
      {guardMessage ? (
        <div className="banner screen-note" role="status">
          <div>{guardMessage}</div>
        </div>
      ) : null}
      {appListSource === "sample" ? (
        <div className="banner screen-note" role="status">
          <div>This project has no persisted app summaries yet. The picker is showing development sample apps for preview only.</div>
        </div>
      ) : null}
      <AppTwoPanePicker apps={apps} selectedAppIds={selectedAppIds} onSelectionChange={onSelectionChange} />
    </div>
  );
}
