import {
  Boxes,
  FileText,
  Package,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

const ICONS: LucideIcon[] = [Boxes, FileText, Package, Users, Settings];

/**
 * Decorative faded shapes + icons fixed to the bottom-right of the viewport.
 * Pointer-events: none so it never blocks clicks.
 */
export function DecoBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-0 right-0 z-0 h-[420px] w-[520px] overflow-hidden"
    >
      {/* gradient blobs */}
      <div
        className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--primary, 217 91% 60%) / 0.55), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-10 right-40 h-56 w-56 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(280 80% 65% / 0.5), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-32 right-4 h-40 w-40 rounded-full opacity-25 blur-2xl"
        style={{
          background:
            "radial-gradient(circle at center, hsl(160 70% 55% / 0.5), transparent 70%)",
        }}
      />

      {/* faded icons */}
      {ICONS.map((Icon, i) => {
        const positions = [
          { bottom: 24, right: 36, size: 28, op: 0.10, rot: -8 },
          { bottom: 80, right: 110, size: 44, op: 0.08, rot: 12 },
          { bottom: 160, right: 60, size: 36, op: 0.09, rot: -4 },
          { bottom: 50, right: 200, size: 56, op: 0.07, rot: 6 },
          { bottom: 220, right: 180, size: 32, op: 0.08, rot: 18 },
        ];
        const p = positions[i];
        return (
          <Icon
            key={i}
            className="absolute text-foreground"
            style={{
              bottom: p.bottom,
              right: p.right,
              width: p.size,
              height: p.size,
              opacity: p.op,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
