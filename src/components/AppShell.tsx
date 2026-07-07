import type { ReactNode } from "react";
import type { NavKey, TabModel, TopMenuModel } from "../types";
import { SiteSidebar } from "./SiteSidebar";
import { SiteTabBar } from "./SiteTabBar";
import { TopMenuBar } from "./TopMenuBar";

interface AppShellProps {
  projectName: string;
  tabs: TabModel[];
  activeTabId: string;
  activeNav?: NavKey;
  menus: TopMenuModel[];
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
  menus,
  variant,
  children,
  onNewTab,
  onCloseTab,
  onSelectTab,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="app tall">
      <div className="titlebar">
        <span className="tl r" />
        <span className="tl y" />
        <span className="tl g" />
        <span className="tb-title">Kintone Site Discovery - {variant === "site" ? `Project: ${projectName}` : "Projects"}</span>
      </div>
      <TopMenuBar menus={menus} />
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
