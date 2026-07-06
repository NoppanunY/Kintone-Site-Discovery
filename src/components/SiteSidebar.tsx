import type { NavKey } from "../types";

interface SiteSidebarProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
}

const groups: { label: string; items: { key: NavKey; label: string; icon: string; canonical?: boolean; warn?: boolean }[] }[] = [
  {
    label: "Site",
    items: [
      { key: "overview", label: "Overview", icon: "◱" },
      { key: "apps", label: "Apps", icon: "▤" },
      { key: "scan", label: "Scan", icon: "◎" },
    ],
  },
  {
    label: "Snapshot",
    items: [
      { key: "snapshot", label: "Local Snapshot", icon: "⛃", canonical: true },
      { key: "reports", label: "Reports", icon: "▦" },
      { key: "developer-files", label: "Developer Files", icon: "<>" },
      { key: "history", label: "History", icon: "⟳" },
    ],
  },
  {
    label: "Configure",
    items: [
      { key: "settings", label: "Settings", icon: "⚙" },
      { key: "advanced", label: "Advanced Internal Data", icon: "⚑", warn: true },
    ],
  },
];

export function SiteSidebar({ active, onNavigate }: SiteSidebarProps) {
  return (
    <nav className="sidebar" aria-label="Site navigation">
      {groups.map((group) => (
        <div key={group.label} role="group" aria-label={group.label}>
          <div className="side-label">{group.label}</div>
          {group.items.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`nav-item ${item.canonical ? "nav-item--canonical" : ""} ${item.warn ? "nav-item--warn" : ""}`}
              aria-current={active === item.key ? "page" : undefined}
              onClick={() => onNavigate(item.key)}
            >
              <span className="nav-item__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              {item.canonical ? <span className="nav-item__tag">source</span> : null}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
