import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useFarm3D } from "@/stores/3d-farm";
import { PageGuard } from "@/components/page-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, ShieldCheck, Zap, Crown, Lock, User, Award, Star, Shield, Trophy, Leaf, Palette, Scale, Moon, Flame, Layers, Activity, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/logros-3d")({
  component: () => (
    <PageGuard>
      <LogrosPage />
    </PageGuard>
  ),
});

function LogrosPage() {
  const { orders, operators, activeOperator } = useFarm3D();
  const [selectedOp, setSelectedOp] = useState<string>(activeOperator || (operators.length > 0 ? operators[0] : ""));

  // Calcular estadísticas profundas de todos los operarios
  const operatorStats: Record<string, { good: number, bad: number, distinctOrders: Set<string>, materials: Set<string>, nightPrints: number, weekendPrints: number, totalWeight: number }> = {};
  
  orders.forEach(o => {
    const mat = o.material && o.material !== "Cualquiera" ? o.material : "PLA";
    const weight = o.weightPerPiece || 0;
    
    o.productionLogs?.forEach(log => {
      const op = log.operator || "Desconocido";
      if (!operatorStats[op]) operatorStats[op] = { good: 0, bad: 0, distinctOrders: new Set(), materials: new Set(), nightPrints: 0, weekendPrints: 0, totalWeight: 0 };
      operatorStats[op].good += log.amount;
      operatorStats[op].distinctOrders.add(o.id);
      operatorStats[op].materials.add(mat);
      operatorStats[op].totalWeight += log.amount * weight;
      
      const d = new Date(log.date);
      const h = d.getHours();
      const dy = d.getDay();
      if (h >= 20 || h < 6) operatorStats[op].nightPrints += log.amount;
      if (dy === 0 || dy === 6) operatorStats[op].weekendPrints += log.amount;
    });
    o.failures?.forEach(f => {
      const op = f.operator || "Desconocido";
      if (!operatorStats[op]) operatorStats[op] = { good: 0, bad: 0, distinctOrders: new Set(), materials: new Set(), nightPrints: 0, weekendPrints: 0, totalWeight: 0 };
      operatorStats[op].bad += f.amount;
      operatorStats[op].totalWeight += f.amount * weight;
    });
  });

  const stats = operatorStats[selectedOp] || { good: 0, bad: 0, distinctOrders: new Set(), materials: new Set(), nightPrints: 0, weekendPrints: 0, totalWeight: 0 };
  const total = stats.good + stats.bad;
  const efficiency = total > 0 ? (stats.good / total) * 100 : 0;

  // Determinar quién es el MVP global
  const sortedOps = Object.entries(operatorStats).sort((a, b) => b[1].good - a[1].good);
  const mvp = sortedOps.length > 0 ? sortedOps[0][0] : null;
  const mvpGood = sortedOps.length > 0 ? sortedOps[0][1].good : 0;
  const isMvp = mvp === selectedOp && stats.good > 0;

  const totalWeight = stats.totalWeight;
  const matCount = stats.materials.size;
  const orderCount = stats.distinctOrders.size;
  const night = stats.nightPrints;
  const weekend = stats.weekendPrints;

  const ACHIEVEMENTS = [
    {
      id: "mvp",
      name: "Técnico MVP",
      description: "Líder actual de la granja con mayor cantidad de piezas.",
      icon: Crown,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      border: "border-amber-200 dark:border-amber-500/20",
      unlocked: isMvp,
      progress: isMvp ? 100 : (mvpGood > 0 ? Math.min(100, (stats.good / mvpGood) * 100) : 0),
      progressText: isMvp ? "¡Eres el líder actual!" : `Te faltan ${mvpGood - stats.good + 1} piezas para superar al líder.`,
    },
    {
      id: "primer_paso",
      name: "Primer Paso",
      description: "Fabrica tu primera pieza buena en el sistema.",
      icon: Star,
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-500/10",
      border: "border-yellow-200 dark:border-yellow-500/20",
      unlocked: stats.good >= 1,
      progress: stats.good >= 1 ? 100 : 0,
      progressText: `${stats.good} / 1 piezas fabricadas.`,
    },
    {
      id: "titan",
      name: "Titán de Producción",
      description: "Fabrica un total de 100 piezas buenas en la granja.",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-500/10",
      border: "border-orange-200 dark:border-orange-500/20",
      unlocked: stats.good >= 100,
      progress: Math.min(100, (stats.good / 100) * 100),
      progressText: `${stats.good} / 100 piezas buenas fabricadas.`,
    },
    {
      id: "centurion",
      name: "Centurión",
      description: "Alcanza la increíble cifra de 500 piezas buenas.",
      icon: Shield,
      color: "text-slate-500",
      bg: "bg-slate-50 dark:bg-slate-500/10",
      border: "border-slate-300 dark:border-slate-500/30",
      unlocked: stats.good >= 500,
      progress: Math.min(100, (stats.good / 500) * 100),
      progressText: `${stats.good} / 500 piezas fabricadas.`,
    },
    {
      id: "leyenda",
      name: "Leyenda Viva",
      description: "Fabrica 1000 piezas y conviértete en maestro.",
      icon: Trophy,
      color: "text-yellow-600",
      bg: "bg-yellow-100 dark:bg-yellow-600/10",
      border: "border-yellow-400 dark:border-yellow-600/30",
      unlocked: stats.good >= 1000,
      progress: Math.min(100, (stats.good / 1000) * 100),
      progressText: `${stats.good} / 1000 piezas fabricadas.`,
    },
    {
      id: "precision",
      name: "Precisión Quirúrgica",
      description: "Mantén >95% de efectividad con al menos 20 impresiones.",
      icon: Target,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      border: "border-emerald-200 dark:border-emerald-500/20",
      unlocked: efficiency >= 95 && total >= 20,
      progress: Math.min(100, (total / 20) * 100),
      progressText: total < 20 ? `Llevas ${total}/20 impresiones` : `Efectividad: ${efficiency.toFixed(1)}%`,
    },
    {
      id: "racha",
      name: "Racha Impecable",
      description: "Registra al menos 10 piezas seguidas sin mermas.",
      icon: ShieldCheck,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      border: "border-blue-200 dark:border-blue-500/20",
      unlocked: stats.bad === 0 && total >= 10,
      progress: stats.bad > 0 ? 0 : Math.min(100, (total / 10) * 100),
      progressText: stats.bad > 0 ? `Racha perdida (hay fallos)` : `${total} / 10 pzs perfectas.`,
    },
    {
      id: "cero_desperdicio",
      name: "Cero Desperdicio",
      description: "Alcanza 50 piezas fabricadas manteniendo 0 mermas.",
      icon: Leaf,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-600/10",
      border: "border-green-300 dark:border-green-600/30",
      unlocked: stats.bad === 0 && total >= 50,
      progress: stats.bad > 0 ? 0 : Math.min(100, (total / 50) * 100),
      progressText: stats.bad > 0 ? `Racha perdida` : `${total} / 50 pzs perfectas.`,
    },
    {
      id: "maestro_materiales",
      name: "Maestro Materiales",
      description: "Trabaja y finaliza piezas con al menos 3 materiales distintos.",
      icon: Palette,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-500/10",
      border: "border-purple-200 dark:border-purple-500/20",
      unlocked: matCount >= 3,
      progress: Math.min(100, (matCount / 3) * 100),
      progressText: `${matCount} / 3 materiales dominados.`,
    },
    {
      id: "peso_pesado",
      name: "Peso Pesado",
      description: "Procesa y da salida a más de 5 kg de filamento plástico.",
      icon: Scale,
      color: "text-stone-600",
      bg: "bg-stone-100 dark:bg-stone-600/10",
      border: "border-stone-300 dark:border-stone-600/30",
      unlocked: totalWeight >= 5000,
      progress: Math.min(100, (totalWeight / 5000) * 100),
      progressText: `${(totalWeight/1000).toFixed(1)} / 5 kg procesados.`,
    },
    {
      id: "buho_nocturno",
      name: "Búho Nocturno",
      description: "Reporta 20 piezas listas entre las 8 PM y las 6 AM.",
      icon: Moon,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
      border: "border-indigo-200 dark:border-indigo-500/20",
      unlocked: night >= 20,
      progress: Math.min(100, (night / 20) * 100),
      progressText: `${night} / 20 piezas en turno noche.`,
    },
    {
      id: "guerrero_fin_semana",
      name: "Guerrero Finde",
      description: "Reporta 20 piezas fabricadas durante sábado o domingo.",
      icon: Flame,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-500/10",
      border: "border-red-200 dark:border-red-500/20",
      unlocked: weekend >= 20,
      progress: Math.min(100, (weekend / 20) * 100),
      progressText: `${weekend} / 20 piezas en fines de semana.`,
    },
    {
      id: "multitarea",
      name: "Multitarea",
      description: "Aporta piezas buenas a 5 órdenes de producción distintas.",
      icon: Layers,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-500/10",
      border: "border-cyan-200 dark:border-cyan-500/20",
      unlocked: orderCount >= 5,
      progress: Math.min(100, (orderCount / 5) * 100),
      progressText: `${orderCount} / 5 órdenes distintas.`,
    },
    {
      id: "resiliente",
      name: "Resiliente",
      description: "Ten >85% de efectividad superando los 50 registros (incluso con fallos).",
      icon: Activity,
      color: "text-pink-500",
      bg: "bg-pink-50 dark:bg-pink-500/10",
      border: "border-pink-200 dark:border-pink-500/20",
      unlocked: stats.bad > 0 && efficiency >= 85 && total >= 50,
      progress: total < 50 ? (total/50)*100 : (stats.bad > 0 && efficiency >= 85 ? 100 : 0),
      progressText: total < 50 ? `${total}/50 piezas` : (stats.bad === 0 ? "Aún sin mermas" : `${efficiency.toFixed(1)}% / 85%`),
    },
    {
      id: "velocista",
      name: "Velocista",
      description: "Alcanza las impresionantes 250 piezas totales fabricadas.",
      icon: Rocket,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-500/10",
      border: "border-sky-200 dark:border-sky-500/20",
      unlocked: stats.good >= 250,
      progress: Math.min(100, (stats.good / 250) * 100),
      progressText: `${stats.good} / 250 piezas en total.`,
    }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-violet-500">
            <Award className="h-6 w-6" /> Recompensas y Logros
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Supervisa el progreso de las insignias gamificadas de los operarios.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-card p-2 rounded-lg border shadow-sm">
          <User className="h-4 w-4 text-muted-foreground ml-1" />
          <Select value={selectedOp} onValueChange={setSelectedOp}>
            <SelectTrigger className="w-[200px] h-8 text-sm border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Selecciona un operario" />
            </SelectTrigger>
            <SelectContent>
              {operators.map(op => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
              {operators.length === 0 && <SelectItem value="Desconocido">Desconocido</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {ACHIEVEMENTS.map(ach => {
          const Icon = ach.icon;
          const safeProgress = isNaN(ach.progress) ? 0 : Math.min(100, Math.max(0, ach.progress));
          return (
            <Card key={ach.id} className={`overflow-hidden transition-all duration-300 flex flex-col h-full ${ach.unlocked ? `border-2 ${ach.border} shadow-md` : 'opacity-70 grayscale-[0.5]'}`}>
              <CardContent className="p-0 flex flex-col h-full">
                <div className={`p-4 flex flex-col items-center flex-1 text-center gap-2 ${ach.unlocked ? ach.bg : 'bg-muted/10'}`}>
                  <div className={`p-3 rounded-full shrink-0 mb-1 ${ach.unlocked ? `bg-background shadow-sm ${ach.color}` : 'bg-muted text-muted-foreground'}`}>
                    {ach.unlocked ? <Icon className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
                  </div>
                  <h3 className={`font-bold text-sm leading-tight ${ach.unlocked ? ach.color : 'text-muted-foreground'}`}>
                    {ach.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">
                    {ach.description}
                  </p>
                  
                  <div className="w-full pt-3 mt-auto space-y-1.5 border-t border-black/5 dark:border-white/5">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Progreso</span>
                      <span>{Math.floor(safeProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${ach.unlocked ? ach.color.replace('text-', 'bg-') : 'bg-muted-foreground/30'}`}
                        style={{ width: `${safeProgress}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground truncate" title={ach.progressText}>
                      {ach.progressText}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}