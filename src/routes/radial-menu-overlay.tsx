import { createPortal } from "react-dom";
import { X } from "lucide-react";
import React from "react";

export function RadialMenuOverlay({
  open,
  coords,
  onClose,
  actions,
}: {
  open: boolean;
  coords: { x: number; y: number };
  onClose: () => void;
  actions: { label: string; icon: React.ReactNode; onClick: () => void; color?: string; disabled?: boolean; isPrimary?: boolean; }[];
}) {
  if (!open || typeof document === "undefined") return null;
  const validActions = actions.filter((a) => !a.disabled);
  const sortedActions = [...validActions].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/20 backdrop-blur-[1px] animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); onClose(); }} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      {sortedActions.map((a, i) => {
        const angle = (i / sortedActions.length) * 360 - 90;
        const radius = 75;
        const x = coords.x + Math.cos((angle * Math.PI) / 180) * radius;
        const y = coords.y + Math.sin((angle * Math.PI) / 180) * radius;
        const sizeClass = a.isPrimary ? "h-14 w-14" : "h-11 w-11";
        const iconWrapperClass = a.isPrimary ? "[&>svg]:h-6 [&>svg]:w-6" : "";
        return (
          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center animate-in zoom-in duration-300 hover:z-50" style={{ left: x, top: y, animationFillMode: "both", animationDelay: `${i * 15}ms` }}>
            <button type="button" aria-label={a.label} onClick={(e) => { e.stopPropagation(); a.onClick(); onClose(); }} className={`peer flex ${sizeClass} items-center justify-center rounded-full bg-background border shadow-xl transition-all hover:scale-110 ${a.color || "text-foreground hover:text-primary"}`}>
              <div className={iconWrapperClass}>{a.icon}</div>
            </button>
            <span className="pointer-events-none absolute top-[calc(100%+8px)] opacity-0 transition-opacity peer-hover:opacity-100 whitespace-nowrap rounded-md bg-popover/95 backdrop-blur-sm px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md border">
              {a.label}
            </span>
          </div>
        );
      })}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform animate-in zoom-in duration-200" style={{ left: coords.x, top: coords.y }} onClick={(e) => { e.stopPropagation(); onClose(); }} title="Cerrar menú">
        <X className="h-5 w-5" />
      </div>
    </div>,
    document.body
  );
}