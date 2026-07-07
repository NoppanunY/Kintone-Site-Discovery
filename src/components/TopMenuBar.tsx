interface TopMenuBarProps {
  menus?: string[];
}

const defaultMenus = ["Project", "Account", "Site", "Scan", "Snapshot", "Window", "Help"];

export function TopMenuBar({ menus = defaultMenus }: TopMenuBarProps) {
  return (
    <div className="menubar">
      {menus.map((menu, index) => (
        <span key={menu} style={index === menus.length - 1 ? { marginLeft: "auto" } : undefined}>
          {menu}
        </span>
      ))}
    </div>
  );
}
