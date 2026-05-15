import { useEffect } from "react";
import { useSettings } from "@/stores/settings";

export function ThemeApplier() {
  const primary = useSettings((s) => s.settings.branding.primaryColor);
  const theme = useSettings((s) => s.settings.branding.theme ?? "sistema");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--brand-primary", primary);
  }, [primary]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    const apply = (mode: string) => {
      root.classList.remove("dark", "theme-ciberpunk", "theme-neumorfico");
      if (mode === "oscuro") {
        root.classList.add("dark");
      } else if (mode === "ciberpunk") {
        root.classList.add("dark", "theme-ciberpunk");
      } else if (mode === "neumorfico") {
        root.classList.add("theme-neumorfico");
      }
    };

    if (theme === "sistema") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mql.matches ? "oscuro" : "claro");
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "oscuro" : "claro");
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    apply(theme);
  }, [theme]);

  return null;
}
