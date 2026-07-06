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
    <div className="sitetabs" role="tablist" aria-label="Open site tabs">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          className="stab"
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onSelect(tab.id)}
        >
          <span aria-hidden="true">{tab.kind === "home" ? "⌂" : tab.running ? "●" : null}</span>
          {tab.title}
          {tab.kind === "site" ? (
            <span
              className="stab__close"
              role="button"
              aria-label={`Close ${tab.title}`}
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onClose(tab.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClose(tab.id);
                }
              }}
            >
              x
            </span>
          ) : null}
        </button>
      ))}
      <button type="button" className="stab stab--add" role="tab" aria-selected="false" onClick={onAdd}>
        +
      </button>
    </div>
  );
}
