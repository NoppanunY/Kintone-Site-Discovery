import { PrimaryActionButton, SecondaryActionButton, AppTwoPanePicker } from "../components";
import { mockAppSummaries } from "../appPickerData";
import type { MockActionHandler, SiteWorkspaceModel } from "../types";
import { PageHeader } from "./shared";

interface AppsScreenProps {
  site: SiteWorkspaceModel;
  selectedAppIds: string[];
  onSelectionChange: (selectedAppIds: string[]) => void;
  onContinue: () => void;
  onMockAction: MockActionHandler;
  guardMessage?: string | null;
}

export function AppsScreen({ site, selectedAppIds, onSelectionChange, onContinue, onMockAction, guardMessage }: AppsScreenProps) {
  const selectedCount = selectedAppIds.length;

  return (
    <div className="page">
      <PageHeader
        breadcrumb={`${site.name} · Apps`}
        title="Apps"
        subtitle={`${mockAppSummaries.length} sample apps · ${selectedCount} selected · no kintone request sent`}
        actions={
          <>
            <SecondaryActionButton label="⟳ Reload list" size="sm" onClick={() => onMockAction("Sample app list reloaded. No kintone request was sent.")} />
            <PrimaryActionButton label="Continue to scan →" disabled={selectedCount === 0} onClick={onContinue} />
          </>
        }
      />
      {guardMessage ? (
        <div className="banner screen-note" role="status">
          <div>{guardMessage}</div>
        </div>
      ) : null}
      <AppTwoPanePicker apps={mockAppSummaries} selectedAppIds={selectedAppIds} onSelectionChange={onSelectionChange} />
    </div>
  );
}
