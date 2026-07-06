import type { ReactNode } from "react";
import type { NavKey, TabModel } from "../types";
import { SiteSidebar } from "./SiteSidebar";
import { SiteTabBar } from "./SiteTabBar";
import { TopMenuBar } from "./TopMenuBar";

interface AppShellProps {
  projectName: string;
  tabs: TabModel[];
  activeTabId: string;
  activeNav?: NavKey;
  variant: "home" | "site";
  children: ReactNode;
  onNewTab: () => void;
  onCloseTab: (id: string) => void;
  onSelectTab: (id: string) => void;
  onNavigate: (key: NavKey) => void;
}

export function AppShell({
  projectName,
  tabs,
  activeTabId,
  activeNav = "overview",
  variant,
  children,
  onNewTab,
  onCloseTab,
  onSelectTab,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="app">
      <div className="titlebar">
        <span className="traffic-light traffic-light--red" />
        <span className="traffic-light traffic-light--yellow" />
        <span className="traffic-light traffic-light--green" />
        <span className="titlebar__title">Kintone Site Discovery — {projectName}</span>
      </div>
      <TopMenuBar />
      <SiteTabBar tabs={tabs} activeId={activeTabId} onAdd={onNewTab} onClose={onCloseTab} onSelect={onSelectTab} />
      <div className="appbody">
        {variant === "site" ? <SiteSidebar active={activeNav} onNavigate={onNavigate} /> : null}
        <main className="content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
