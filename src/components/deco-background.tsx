import { useEffect, useState } from "react";
import {
  Cpu,
  Zap,
  Gauge,
  Plug,
  Cable,
  Factory,
  Power,
  Server,
  Activity,
  Wifi,
  Radio,
  Battery,
  Database,
  type LucideIcon,
} from "lucide-react";

// --- CONFIGURACIÓN DEL FONDO (Ajusta estos valores a tu gusto) ---
export const BG_CONFIG = {
  trackDensity: 30, // Cantidad de pistas a renderizar (Máximo: 30)
  iconDensity: 15,   // Cantidad de grandes iconos flotantes a renderizar (Máximo: 15)
  trackOpacity: 0.5, // Opacidad de las líneas (0 a 1)
  componentOpacity: 0.3, // Opacidad de procesadores, LEDs, etc. (0 a 1)
  globalScale: 0.8, // Escala general del fondo (ej. 1, 1.2, 0.8)
  blobBlur: 40, // Difuminado (blur) en píxeles de las manchas de color de fondo
  circuitBlur: 0, // Difuminado (blur) en píxeles de las pistas y componentes electrónicos
};

const ICONS: LucideIcon[] = [
  Cpu, Zap, Gauge, Plug, Cable, Factory, Power, 
  Server, Activity, Wifi, Radio, Battery, Database, Cpu, Zap
];

type PCBComponent = {
  type: "ic" | "resistor" | "capacitor" | "transistor" | "coil" | "processor" | "led";
  x: number;
  y: number;
  angle: number;
};

type PCBTrack = {
  d: string;
  w: number;
  h: number;
  bottom: string;
  right: string;
  depth: number;
  delay: number;
  dur: number;
  reverse: boolean;
  components?: PCBComponent[];
};

const ALL_PCB_TRACKS: PCBTrack[] = [
  { d: "M 0 150 L 50 150 L 100 100 L 250 100", w: 250, h: 200, bottom: "15%", right: "25%", depth: 20, delay: 0, dur: 4, reverse: false, components: [{ type: "resistor", x: 0, y: 150, angle: 0 }, { type: "ic", x: 250, y: 100, angle: 0 }] },
  { d: "M 200 250 L 150 250 L 100 200 L 100 0", w: 200, h: 250, bottom: "5%", right: "60%", depth: 40, delay: 1.5, dur: 5, reverse: true, components: [{ type: "transistor", x: 200, y: 250, angle: 180 }, { type: "capacitor", x: 100, y: 0, angle: 90 }] },
  { d: "M 0 0 L 50 0 L 100 50 L 150 50 L 200 100 L 200 300", w: 200, h: 300, bottom: "45%", right: "15%", depth: 25, delay: 0.5, dur: 4.5, reverse: false, components: [{ type: "ic", x: 0, y: 0, angle: 45 }, { type: "coil", x: 200, y: 300, angle: 90 }] },
  { d: "M 350 0 L 200 0 L 150 50 L 0 50", w: 350, h: 100, bottom: "75%", right: "45%", depth: 55, delay: 2.2, dur: 6, reverse: true, components: [{ type: "ic", x: 350, y: 0, angle: 0 }, { type: "resistor", x: 0, y: 50, angle: 0 }] },
  { d: "M 0 200 L 50 200 L 100 150 L 100 50 L 150 0 L 300 0", w: 300, h: 200, bottom: "35%", right: "70%", depth: 30, delay: 3, dur: 5.5, reverse: false, components: [{ type: "transistor", x: 0, y: 200, angle: 0 }, { type: "ic", x: 300, y: 0, angle: 0 }] },
  { d: "M 0 50 L 50 50 L 100 100 L 100 200", w: 150, h: 250, bottom: "60%", right: "10%", depth: 45, delay: 1.2, dur: 4.8, reverse: false, components: [{ type: "resistor", x: 0, y: 50, angle: 0 }, { type: "capacitor", x: 100, y: 200, angle: 90 }] },
  { d: "M 300 150 L 200 150 L 150 200 L 0 200", w: 350, h: 250, bottom: "25%", right: "55%", depth: 35, delay: 0.8, dur: 5.2, reverse: true, components: [{ type: "coil", x: 300, y: 150, angle: 0 }, { type: "transistor", x: 0, y: 200, angle: 180 }] },

  // Pistas avanzadas interconectando ICs, Processors y LEDs
  { d: "M 100 0 L 100 150 L 250 150", w: 300, h: 200, bottom: "70%", right: "20%", depth: 25, delay: 1.1, dur: 3.5, reverse: false, components: [{ type: "ic", x: 100, y: 0, angle: 90 }, { type: "ic", x: 250, y: 150, angle: 0 }, { type: "led", x: 100, y: 75, angle: 90 }] },
  { d: "M 0 50 L 150 50 L 200 0", w: 250, h: 100, bottom: "30%", right: "80%", depth: 60, delay: 2.5, dur: 4, reverse: true, components: [{ type: "ic", x: 0, y: 50, angle: 0 }, { type: "transistor", x: 200, y: 0, angle: -90 }] },
  { d: "M 400 300 L 300 300 L 200 200 L 200 50 L 50 50", w: 450, h: 350, bottom: "10%", right: "45%", depth: 40, delay: 0.3, dur: 7, reverse: false, components: [{ type: "processor", x: 400, y: 300, angle: 0 }, { type: "ic", x: 50, y: 50, angle: 0 }, { type: "led", x: 200, y: 150, angle: 90 }] },
  { d: "M 50 400 L 50 250 L 150 150 L 150 0", w: 200, h: 450, bottom: "40%", right: "65%", depth: 30, delay: 3.2, dur: 6, reverse: true, components: [{ type: "processor", x: 50, y: 400, angle: 90 }, { type: "ic", x: 150, y: 0, angle: 90 }, { type: "resistor", x: 50, y: 300, angle: 90 }] },
  { d: "M 0 100 L 100 100 L 150 150 L 300 150", w: 350, h: 200, bottom: "80%", right: "5%", depth: 50, delay: 1.8, dur: 5.5, reverse: false, components: [{ type: "ic", x: 0, y: 100, angle: 0 }, { type: "ic", x: 300, y: 150, angle: 0 }, { type: "led", x: 150, y: 100, angle: 0 }] },
  { d: "M 350 200 L 250 200 L 200 250 L 50 250", w: 400, h: 300, bottom: "55%", right: "35%", depth: 70, delay: 0.7, dur: 6.5, reverse: true, components: [{ type: "ic", x: 350, y: 200, angle: 0 }, { type: "ic", x: 50, y: 250, angle: 0 }, { type: "coil", x: 150, y: 250, angle: 0 }] },
  { d: "M 0 0 L 100 0 L 150 50 L 150 150 L 100 200 L 0 200", w: 200, h: 250, bottom: "20%", right: "85%", depth: 25, delay: 2.1, dur: 5, reverse: false, components: [{ type: "processor", x: 0, y: 0, angle: 0 }, { type: "ic", x: 0, y: 200, angle: 0 }, { type: "led", x: 150, y: 100, angle: 90 }] },
  
  // Bus de datos paralelo
  { d: "M 0 0 L 150 0 L 250 100 L 350 100", w: 400, h: 200, bottom: "35%", right: "15%", depth: 40, delay: 0.1, dur: 4, reverse: false, components: [{ type: "processor", x: 0, y: 15, angle: 0 }, { type: "processor", x: 350, y: 115, angle: 0 }] },
  { d: "M 0 10 L 140 10 L 240 110 L 350 110", w: 400, h: 200, bottom: "35%", right: "15%", depth: 40, delay: 0.3, dur: 4, reverse: false },
  { d: "M 0 20 L 130 20 L 230 120 L 350 120", w: 400, h: 200, bottom: "35%", right: "15%", depth: 40, delay: 0.5, dur: 4, reverse: false },
  { d: "M 0 30 L 120 30 L 220 130 L 350 130", w: 400, h: 200, bottom: "35%", right: "15%", depth: 40, delay: 0.7, dur: 4, reverse: false },

  // 12 pistas extras agregadas para ampliar los límites (Lado Izquierdo, Arriba, Esquinas)
  { d: "M 200 400 L 250 400 L 300 350 L 300 150", w: 350, h: 450, bottom: "25%", right: "30%", depth: 35, delay: 0.5, dur: 5, reverse: false, components: [{ type: "processor", x: 200, y: 400, angle: 0 }, { type: "led", x: 300, y: 250, angle: -90 }] },
  { d: "M 50 100 L 150 100 L 200 50 L 400 50", w: 450, h: 150, bottom: "60%", right: "40%", depth: 60, delay: 1.5, dur: 4.5, reverse: true, components: [{ type: "ic", x: 50, y: 100, angle: 0 }, { type: "capacitor", x: 200, y: 50, angle: -45 }] },
  { d: "M 0 300 L 100 300 L 150 250 L 150 0", w: 200, h: 350, bottom: "10%", right: "75%", depth: 45, delay: 2.7, dur: 6, reverse: false, components: [{ type: "coil", x: 0, y: 300, angle: 0 }, { type: "ic", x: 150, y: 0, angle: 90 }] },
  { d: "M 400 150 L 300 150 L 250 100 L 0 100", w: 450, h: 200, bottom: "80%", right: "15%", depth: 20, delay: 0.9, dur: 4, reverse: true, components: [{ type: "processor", x: 400, y: 150, angle: 0 }, { type: "resistor", x: 250, y: 100, angle: -45 }] },
  { d: "M 100 400 L 100 300 L 200 200 L 300 200", w: 350, h: 450, bottom: "5%", right: "10%", depth: 55, delay: 3.5, dur: 5.5, reverse: false, components: [{ type: "transistor", x: 100, y: 400, angle: -90 }, { type: "led", x: 200, y: 200, angle: -45 }] },
  { d: "M 0 0 L 50 50 L 150 50 L 200 100 L 350 100", w: 400, h: 150, bottom: "50%", right: "85%", depth: 30, delay: 1.2, dur: 4.2, reverse: true, components: [{ type: "ic", x: 0, y: 0, angle: 45 }, { type: "ic", x: 350, y: 100, angle: 0 }] },
  
  // Segundo Bus de datos masivo cruzando la pantalla
  { d: "M 0 200 L 100 200 L 150 250 L 400 250", w: 450, h: 300, bottom: "40%", right: "50%", depth: 50, delay: 0.2, dur: 5, reverse: false, components: [{ type: "processor", x: 0, y: 215, angle: 0 }, { type: "processor", x: 400, y: 265, angle: 0 }] },
  { d: "M 0 210 L 90 210 L 140 260 L 400 260", w: 450, h: 300, bottom: "40%", right: "50%", depth: 50, delay: 0.4, dur: 5, reverse: false },
  { d: "M 0 220 L 80 220 L 130 270 L 400 270", w: 450, h: 300, bottom: "40%", right: "50%", depth: 50, delay: 0.6, dur: 5, reverse: false },
  { d: "M 0 230 L 70 230 L 120 280 L 400 280", w: 450, h: 300, bottom: "40%", right: "50%", depth: 50, delay: 0.8, dur: 5, reverse: false },
  
  // Conexiones de esquinas
  { d: "M 150 0 L 150 100 L 50 200 L 0 200", w: 200, h: 250, bottom: "85%", right: "60%", depth: 25, delay: 2.1, dur: 3.8, reverse: true, components: [{ type: "led", x: 150, y: 50, angle: 90 }, { type: "resistor", x: 50, y: 200, angle: 45 }] },
  { d: "M 300 0 L 300 150 L 200 250 L 100 250", w: 350, h: 300, bottom: "15%", right: "80%", depth: 65, delay: 1.8, dur: 6.2, reverse: false, components: [{ type: "coil", x: 300, y: 0, angle: 90 }, { type: "ic", x: 100, y: 250, angle: 0 }] },
];

/**
 * Decorative faded shapes + icons fixed to the bottom-right of the viewport.
 * Pointer-events: none so it never blocks clicks.
 */
export function DecoBackground() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Normalizamos el rango de -1 a 1 desde el centro de la pantalla
      setMouse({ x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Aplicamos la configuración de densidad
  const activeTracks = ALL_PCB_TRACKS.slice(0, BG_CONFIG.trackDensity);
  const activeIcons = ICONS.slice(0, BG_CONFIG.iconDensity);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden origin-bottom-right"
      style={{ transform: `scale(${BG_CONFIG.globalScale})` }}
    >
      {/* CSS Animations and Filters for PCB Pulses */}
      <style>{`
        @keyframes pcb-pulse-anim {
          0% { stroke-dashoffset: 1040; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pcb-pulse-anim-rev {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 1040; }
        }
        .pcb-pulse {
          animation: pcb-pulse-anim var(--dur) linear infinite;
          animation-delay: var(--del);
        }
        .pcb-pulse-rev {
          animation: pcb-pulse-anim-rev var(--dur) linear infinite;
          animation-delay: var(--del);
        }
      `}</style>

      <svg className="hidden">
        <defs>
          <filter id="pcb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* gradient blobs */}
      <div
        className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full opacity-30 transition-transform duration-500 ease-out"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary, 217 91% 60%) / 0.55), transparent 70%)",
          transform: `translate3d(${mouse.x * -30}px, ${mouse.y * -30}px, 0)`,
          filter: `blur(${BG_CONFIG.blobBlur}px)`,
        }}
      />
      <div
        className="absolute bottom-10 right-40 h-72 w-72 rounded-full opacity-25 transition-transform duration-500 ease-out"
        style={{
          background: "radial-gradient(circle at center, hsl(280 80% 65% / 0.5), transparent 70%)",
          transform: `translate3d(${mouse.x * -50}px, ${mouse.y * -50}px, 0)`,
          filter: `blur(${BG_CONFIG.blobBlur}px)`,
        }}
      />
      <div
        className="absolute bottom-32 right-4 h-48 w-48 rounded-full opacity-25 transition-transform duration-500 ease-out"
        style={{
          background: "radial-gradient(circle at center, hsl(160 70% 55% / 0.5), transparent 70%)",
          transform: `translate3d(${mouse.x * -20}px, ${mouse.y * -20}px, 0)`,
          filter: `blur(${Math.max(0, BG_CONFIG.blobBlur - 24)}px)`,
        }}
      />

      {/* PCB Circuit Tracks */}
      {activeTracks.map((t, i) => {
        // Extraemos las coordenadas de inicio y fin para dibujar los "nodos"
        const parts = t.d.trim().split(/\s+/);
        const startX = parts[1];
        const startY = parts[2];
        const endX = parts[parts.length - 2];
        const endY = parts[parts.length - 1];

        return (
          <div
            key={`track-${i}`}
            className="absolute transition-transform duration-200 ease-out"
            style={{
              bottom: t.bottom,
              right: t.right,
              width: t.w,
              height: t.h,
              color: `hsl(var(--primary) / ${BG_CONFIG.trackOpacity})`,
              transform: `translate3d(${mouse.x * t.depth}px, ${mouse.y * t.depth}px, 0)`,
              filter: BG_CONFIG.circuitBlur > 0 ? `blur(${BG_CONFIG.circuitBlur}px)` : undefined,
            }}
          >
            <svg width="100%" height="100%" viewBox={`0 0 ${t.w} ${t.h}`} fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
              <path d={t.d} stroke="currentColor" strokeWidth="1.5" className="opacity-20" strokeLinecap="round" strokeLinejoin="round" />
              <path 
                d={t.d} 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeDasharray="40 1000" 
                filter="url(#pcb-glow)" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={t.reverse ? "pcb-pulse-rev opacity-90" : "pcb-pulse opacity-90"}
                style={{
                  "--dur": `${t.dur}s`,
                  "--del": `${t.delay}s`,
                } as React.CSSProperties}
              />
              <circle cx={startX} cy={startY} r="3.5" fill="currentColor" className="opacity-40" />
              <circle cx={endX} cy={endY} r="3.5" fill="currentColor" className="opacity-40" />
              
              {/* Renderización de los componentes electrónicos */}
              {t.components?.map((c, j) => (
                <g key={`comp-${i}-${j}`} transform={`translate(${c.x}, ${c.y}) rotate(${c.angle})`} style={{ opacity: BG_CONFIG.componentOpacity, color: "hsl(var(--foreground))" }}>
                  {c.type === "ic" && (
                    <g>
                      <rect x="-14" y="-14" width="28" height="28" fill="currentColor" className="opacity-10" stroke="currentColor" strokeWidth="1.5" rx="3" />
                      <circle cx="-8" cy="-8" r="2.5" fill="currentColor" className="opacity-30" />
                      <path d="M -14 -8 h -4 M -14 0 h -4 M -14 8 h -4 M 14 -8 h 4 M 14 0 h 4 M 14 8 h 4 M -8 -14 v -4 M 0 -14 v -4 M 8 -14 v -4 M -8 14 v 4 M 0 14 v 4 M 8 14 v 4" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "resistor" && (
                    <g>
                      <rect x="-8" y="-4" width="16" height="8" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M -12 0 h 4 M 8 0 h 4" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "capacitor" && (
                    <g>
                      <path d="M -6 0 h 4 M 2 0 h 4 M -2 -6 v 12 M 2 -6 v 12" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "transistor" && (
                    <g>
                      <path d="M -5 -5 v 10 h 10 v -10 Z" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M -5 0 h -4 M 5 -2 h 4 M 5 2 h 4" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "coil" && (
                    <g>
                      <path d="M -12 0 h 4 q 2 -6 4 0 q 2 -6 4 0 q 2 -6 4 0 h 4" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "processor" && (
                    <g>
                      <rect x="-24" y="-24" width="48" height="48" fill="currentColor" className="opacity-10" stroke="currentColor" strokeWidth="1.5" rx="4" />
                      <rect x="-16" y="-16" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-30" rx="2" />
                      <circle cx="0" cy="0" r="6" fill="currentColor" className="opacity-20" />
                      <path d="M -24 -15 h -6 M -24 -5 h -6 M -24 5 h -6 M -24 15 h -6 M 24 -15 h 6 M 24 -5 h 6 M 24 5 h 6 M 24 15 h 6 M -15 -24 v -6 M -5 -24 v -6 M 5 -24 v -6 M 15 -24 v -6 M -15 24 v 6 M -5 24 v 6 M 5 24 v 6 M 15 24 v 6" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                  )}
                  {c.type === "led" && (
                    <g>
                      <path d="M -6 4 L 0 -4 L 6 4 Z" fill="currentColor" className="opacity-80" />
                      <path d="M -6 -4 L 6 -4" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M -8 -8 L -12 -12 M 8 -8 L 12 -12" stroke="currentColor" strokeWidth="1.5" className="animate-pulse opacity-80" />
                    </g>
                  )}
                </g>
              ))}
            </svg>
          </div>
        );
      })}

      {/* faded icons */}
      {activeIcons.map((Icon, i) => {
        const positions = [
          { bottom: "12%", right: "6%", size: 32, op: 0.10, rot: -12, depth: 30 },
          { bottom: "28%", right: "18%", size: 48, op: 0.08, rot: 15, depth: 50 },
          { bottom: "45%", right: "10%", size: 40, op: 0.09, rot: -6, depth: 25 },
          { bottom: "18%", right: "30%", size: 64, op: 0.07, rot: 8, depth: 65 },
          { bottom: "55%", right: "22%", size: 36, op: 0.08, rot: 22, depth: 40 },
          { bottom: "35%", right: "38%", size: 52, op: 0.06, rot: -18, depth: 75 },
          { bottom: "65%", right: "12%", size: 44, op: 0.07, rot: 30, depth: 35 },
          { bottom: "15%", right: "50%", size: 40, op: 0.08, rot: -10, depth: 45 },
          { bottom: "75%", right: "25%", size: 48, op: 0.07, rot: 14, depth: 60 },
          { bottom: "25%", right: "70%", size: 36, op: 0.09, rot: -20, depth: 25 },
          { bottom: "85%", right: "40%", size: 56, op: 0.06, rot: 25, depth: 80 },
          { bottom: "45%", right: "55%", size: 32, op: 0.10, rot: 5, depth: 30 },
          { bottom: "60%", right: "75%", size: 44, op: 0.08, rot: -15, depth: 55 },
          { bottom: "5%", right: "85%", size: 60, op: 0.07, rot: 12, depth: 70 },
          { bottom: "80%", right: "5%", size: 38, op: 0.09, rot: -8, depth: 40 },
        ];
        const p = positions[i];
        return (
          <Icon
            key={i}
            className="absolute text-foreground transition-transform duration-200 ease-out"
            style={{
              bottom: p.bottom,
              right: p.right,
              width: p.size,
              height: p.size,
              opacity: p.op,
              transform: `translate3d(${mouse.x * p.depth}px, ${mouse.y * p.depth}px, 0) rotate(${p.rot + mouse.x * 5}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
