import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TopMenuModel } from "../types";

interface TopMenuBarProps {
  menus: TopMenuModel[];
}

export function TopMenuBar({ menus }: TopMenuBarProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemRefs = useRef<Array<Array<HTMLButtonElement | null>>>([]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenIndex(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const focusMenuButton = (index: number) => {
    menuButtonRefs.current[index]?.focus();
  };

  const focusFirstMenuItem = (index: number) => {
    window.setTimeout(() => {
      const firstEnabledItem = itemRefs.current[index]?.find((item) => item && !item.disabled);
      firstEnabledItem?.focus();
    }, 0);
  };

  const openMenu = (index: number, shouldFocusItem = false) => {
    setOpenIndex(index);
    if (shouldFocusItem) {
      focusFirstMenuItem(index);
    }
  };

  const moveMenuFocus = (currentIndex: number, direction: 1 | -1, shouldOpen = false) => {
    const nextIndex = (currentIndex + direction + menus.length) % menus.length;
    if (shouldOpen) {
      openMenu(nextIndex, true);
    }
    focusMenuButton(nextIndex);
  };

  const focusSiblingItem = (menuIndex: number, itemIndex: number, direction: 1 | -1) => {
    const items = itemRefs.current[menuIndex] ?? [];
    const enabledIndexes = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item && !item.disabled)
      .map(({ index }) => index);

    if (enabledIndexes.length === 0) {
      return;
    }

    const currentEnabledIndex = enabledIndexes.indexOf(itemIndex);
    const nextEnabledIndex =
      currentEnabledIndex === -1
        ? enabledIndexes[0]
        : enabledIndexes[(currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length];
    items[nextEnabledIndex]?.focus();
  };

  const onMenuButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      openMenu(index, true);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveMenuFocus(index, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveMenuFocus(index, -1);
      return;
    }

    if (event.key === "Escape") {
      setOpenIndex(null);
      return;
    }

    if (event.key === "Tab") {
      setOpenIndex(null);
    }
  };

  const onMenuItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, menuIndex: number, itemIndex: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusSiblingItem(menuIndex, itemIndex, 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusSiblingItem(menuIndex, itemIndex, -1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveMenuFocus(menuIndex, 1, true);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveMenuFocus(menuIndex, -1, true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpenIndex(null);
      focusMenuButton(menuIndex);
      return;
    }

    if (event.key === "Tab") {
      setOpenIndex(null);
    }
  };

  return (
    <div className="menubar" role="menubar" aria-label="Application menu" ref={barRef}>
      {menus.map((menu, menuIndex) => (
        <div
          className={`menu-root ${menu.align === "end" ? "menu-root--end" : ""}`}
          key={menu.label}
          role="none"
          onMouseEnter={() => {
            if (openIndex !== null) {
              setOpenIndex(menuIndex);
            }
          }}
        >
          <button
            type="button"
            className={`menubar__button ${openIndex === menuIndex ? "is-open" : ""}`}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openIndex === menuIndex}
            ref={(element) => {
              menuButtonRefs.current[menuIndex] = element;
            }}
            onClick={() => setOpenIndex(openIndex === menuIndex ? null : menuIndex)}
            onKeyDown={(event) => onMenuButtonKeyDown(event, menuIndex)}
          >
            {menu.label}
          </button>
          {openIndex === menuIndex ? (
            <div className="menu-popover" role="menu" aria-label={menu.label}>
              {menu.items.map((item, itemIndex) => (
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  disabled={item.disabled}
                  key={item.label}
                  ref={(element) => {
                    itemRefs.current[menuIndex] ??= [];
                    itemRefs.current[menuIndex][itemIndex] = element;
                  }}
                  onClick={() => {
                    if (item.disabled) {
                      return;
                    }

                    setOpenIndex(null);
                    item.onSelect?.();
                  }}
                  onKeyDown={(event) => onMenuItemKeyDown(event, menuIndex, itemIndex)}
                >
                  <span>{item.label}</span>
                  {item.shortcut ? <span className="menu-item__shortcut">{item.shortcut}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
