"use client";

import { themeOptions, useColorTheme, type ColorTheme } from "@/components/theme-provider";

export function PublicAppearanceControls() {
  const { theme, mode, setTheme, setMode } = useColorTheme();

  function changeTheme(value: string) {
    if (themeOptions.some((option) => option.id === value)) setTheme(value as ColorTheme);
  }

  return (
    <div className="public-appearance-controls">
      <label>
        Color palette
        <select className="form-control" value={theme} onChange={(event) => changeTheme(event.target.value)}>
          {themeOptions.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
        </select>
      </label>
      <button
        className="appearance-mode-toggle"
        type="button"
        aria-pressed={mode === "dark"}
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      >
        <span aria-hidden="true">{mode === "dark" ? "☾" : "☀"}</span>
        Switch to {mode === "dark" ? "light" : "dark"} theme
      </button>
    </div>
  );
}
