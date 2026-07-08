import type { TabModel } from "../types";

interface SiteTabBarProps {
  tabs: TabModel[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export function SiteTabBar({ tabs, activeId, onSelect, onClose, onAdd }: SiteTabBarProps) {
  return (
    <div className="sitetabs" role="tablist" aria-label="Open project tabs">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`stab ${tab.id === activeId ? "active" : ""}`}
          role="presentation"
        >
          <button type="button" className="stab__select" role="tab" aria-selected={tab.id === activeId} onClick={() => onSelect(tab.id)}>
            {tab.kind === "home" ? "🏠 " : tab.running ? "● " : ""}
            {tab.title}
          </button>
          {tab.kind === "project" ? (
            <button
              type="button"
              className="stab__close"
              aria-label={`Close ${tab.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
            >
              ✕
            </button>
          ) : null}
        </div>
      ))}
      <button type="button" className="stab stab--add" role="tab" aria-selected="false" onClick={onAdd}>
        ＋
      </button>
    </div>
  );
}
