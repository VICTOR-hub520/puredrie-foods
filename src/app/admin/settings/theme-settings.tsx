"use client";

import { themeOptions, useColorTheme } from "@/components/theme-provider";

export function ThemeSettings() {
  const { theme, mode, setTheme, setMode } = useColorTheme();

  return (
    <section className="admin-card theme-settings" aria-labelledby="color-theme-heading">
      <div className="admin-card-heading">
        <div>
          <span className="eyebrow">Appearance</span>
          <h2 id="color-theme-heading">Choose your appearance</h2>
        </div>
      </div>
      <p className="theme-settings-note">Choose a color palette and light or dark mode. These preferences are saved in this browser and apply to the storefront and admin pages you view here.</p>
      <div className="appearance-mode-options" role="group" aria-label="Color mode">
        {(["light", "dark"] as const).map((option) => (
          <button
            className={`appearance-mode-option${mode === option ? " appearance-mode-option-selected" : ""}`}
            type="button"
            aria-pressed={mode === option}
            key={option}
            onClick={() => setMode(option)}
          >
            <span aria-hidden="true">{option === "light" ? "☀" : "☾"}</span>
            {option === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
      <div className="theme-choice-grid" role="radiogroup" aria-labelledby="color-theme-heading">
        {themeOptions.map((option) => {
          const selected = theme === option.id;
          return (
            <button
              className={`theme-choice${selected ? " theme-choice-selected" : ""}`}
              type="button"
              role="radio"
              aria-checked={selected}
              key={option.id}
              onClick={() => setTheme(option.id)}
            >
              <span className="theme-swatches" aria-hidden="true">
                {option.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
              </span>
              <span className="theme-choice-copy">
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              <span className="theme-choice-status" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <p className="theme-preview-label" aria-live="polite">
        Previewing {themeOptions.find((option) => option.id === theme)?.name} in {mode} mode. Changes apply immediately.
      </p>
    </section>
  );
}
