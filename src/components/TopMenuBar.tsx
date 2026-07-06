interface TopMenuBarProps {
  menus?: string[];
}

const defaultMenus = ["Project", "Account", "Site", "Scan", "Snapshot", "Window", "Help"];

export function TopMenuBar({ menus = defaultMenus }: TopMenuBarProps) {
  return (
    <div className="menubar" role="menubar" aria-label="Application menu">
      {menus.map((menu, index) => (
        <span key={menu} className={`menubar__item ${index === menus.length - 1 ? "menubar__spacer" : ""}`} role="menuitem">
          {menu}
        </span>
      ))}
    </div>
  );
}
