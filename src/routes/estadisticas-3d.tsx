import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useFarm3D, type ProductionOrder } from "@/stores/3d-farm";
import { PageGuard } from "@/components/page-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChartHorizontal, Activity, Printer, AlertTriangle, CheckCircle2, Target, TrendingDown, TrendingUp, Clock, Cylinder, Scale, AlertCircle, User, Trophy, Star, Filter, BarChart2, Crown, Zap, ShieldCheck, Shield, Leaf, Palette, Moon, Flame, Layers, Rocket, Maximize } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Line, Cell, ReferenceArea } from "recharts";
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { countDaysInInterval } from "@/lib/date-helpers";
import { addDays, isSaturday, isSunday } from "date-fns";

export const Route = createFileRoute("/estadisticas-3d")({
  component: () => (
    <PageGuard>
      <FarmAnalyticsDashboard />
    </PageGuard>
  ),
});

function addDaysRespectingMode(startDate: Date, days: number, mode: "working-week" | "full-week"): Date {
  if (mode === "full-week") return addDays(startDate, days);
  
  let currentDate = new Date(startDate);
  let addedDays = 0;
  if (days <= 0) return currentDate;
  
  while (addedDays < days) {
    currentDate = addDays(currentDate, 1);
    if (!isSaturday(currentDate) && !isSunday(currentDate)) {
      addedDays++;
    }
  }
  return currentDate;
}

function generateOrderChartData(order: ProductionOrder, workWeekMode: "working-week" | "full-week") {
  const start = new Date(order.createdAt);
  start.setHours(0,0,0,0);
  const deadline = new Date(order.deadline);
  deadline.setHours(23,59,59,999);
  const today = new Date();
  today.setHours(23,59,59,999);
  
  const limit = new Date(Math.max(deadline.getTime(), today.getTime()));
  
  const workingDays = Math.max(1, countDaysInInterval({ start, end: deadline }, workWeekMode));
  const idealDaily = order.targetPieces / workingDays;
  
  const data = [];
  let current = new Date(start);
  let accumulated = 0;
  let idealAccum = 0;
  
  let safetyCounter = 0;
  while (current <= limit && safetyCounter < 150) { // Limitado a 150 días para rendimiento visual
    safetyCounter++;
    const isFuture = current > today;
    
    let dailyGood = 0;
    let dailyBad = 0;
    
    if (!isFuture) {
      order.productionLogs?.forEach(l => {
        const ld = new Date(l.date);
        if (ld.getFullYear() === current.getFullYear() && ld.getMonth() === current.getMonth() && ld.getDate() === current.getDate()) dailyGood += l.amount;
      });
      order.failures?.forEach(f => {
        const fd = new Date(f.date);
        if (fd.getFullYear() === current.getFullYear() && fd.getMonth() === current.getMonth() && fd.getDate() === current.getDate()) dailyBad += f.amount;
      });
    }
    
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isWorkingDay = workWeekMode === "full-week" || !isWeekend;
    
    if (current <= deadline && isWorkingDay) idealAccum += idealDaily;
    if (current > deadline) idealAccum = order.targetPieces;
    
    const catchUpSpeed = Math.max(0, idealAccum - accumulated);

    if (!isFuture) {
      accumulated += dailyGood;
    }

    data.push({
      date: current.toLocaleDateString('es', { day: '2-digit', month: 'short' }),
      'Prod. Diaria': isFuture ? 0 : dailyGood,
      'Mermas': isFuture ? 0 : dailyBad,
      'Vel. Requerida': isFuture ? null : Math.round(idealDaily),
      'Vel. Recuperación': isFuture ? null : Math.round(catchUpSpeed),
      'Acumulado Real': isFuture ? null : accumulated,
      'Meta Ideal': Math.round(idealAccum),
      isWeekend
    });
    current.setDate(current.getDate() + 1);
  }
  return data;
}

function calculateHealth(order: ProductionOrder, workWeekMode: "working-week" | "full-week") {
  const now = new Date();
  const created = new Date(order.createdAt);
  const deadline = new Date(order.deadline);
  
  let elapsedDays = 1;
  if (now > created) {
    elapsedDays = Math.max(countDaysInInterval({ start: created, end: now }, workWeekMode), 1);
  }
  
  const currentSpeed = order.printedPieces / elapsedDays;
  
  let daysLeft = 0;
  if (deadline > now) {
    daysLeft = countDaysInInterval({ start: now, end: deadline }, workWeekMode);
  } else if (now > deadline) {
    daysLeft = -countDaysInInterval({ start: deadline, end: now }, workWeekMode);
  }
  
  const piecesLeft = Math.max(order.targetPieces - order.printedPieces, 0);
  
  // Evitar dividir entre negativos si ya pasó la fecha
  const requiredSpeed = daysLeft > 0 ? piecesLeft / daysLeft : piecesLeft;
  
  const estimatedDaysToFinish = currentSpeed > 0 ? piecesLeft / currentSpeed : Infinity;
  const etaDate = estimatedDaysToFinish === Infinity 
    ? new Date() 
    : addDaysRespectingMode(now, Math.ceil(estimatedDaysToFinish), workWeekMode);
  
  const totalProduced = order.printedPieces + order.failedPieces;
  const failureRate = totalProduced > 0 ? (order.failedPieces / totalProduced) * 100 : 0;
  
  let status = "A tiempo";
  let statusColor = "text-emerald-500";
  let barColor = "bg-emerald-500";
  let borderColor = "border-emerald-500";
  let statusBg = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200";
  let icon = <CheckCircle2 className="h-4 w-4" />;
  
  if (piecesLeft === 0) {
    status = "Completada";
    statusColor = "text-blue-500";
    barColor = "bg-blue-500";
    borderColor = "border-blue-500";
    statusBg = "bg-blue-50 dark:bg-blue-950/30 border-blue-200";
    icon = <CheckCircle2 className="h-4 w-4" />;
  } else if (daysLeft < 0 && piecesLeft > 0) {
    status = "Vencida";
    statusColor = "text-rose-600";
    barColor = "bg-rose-600";
    borderColor = "border-rose-600";
    statusBg = "bg-rose-50 dark:bg-rose-950/30 border-rose-200";
    icon = <AlertTriangle className="h-4 w-4" />;
  } else if (currentSpeed < requiredSpeed && currentSpeed > 0) {
    status = "Atrasada";
    statusColor = "text-amber-600";
    barColor = "bg-amber-500";
    borderColor = "border-amber-500";
    statusBg = "bg-amber-50 dark:bg-amber-950/30 border-amber-200";
    icon = <TrendingDown className="h-4 w-4" />;
  } else if (currentSpeed === 0 && elapsedDays > 1) {
    status = "Estancada";
    statusColor = "text-rose-500";
    barColor = "bg-rose-500";
    borderColor = "border-rose-500";
    statusBg = "bg-rose-50 dark:bg-rose-950/30 border-rose-200";
    icon = <AlertTriangle className="h-4 w-4" />;
  } else if (currentSpeed > requiredSpeed * 1.2) {
    status = "Adelantada";
    statusColor = "text-teal-600";
    barColor = "bg-teal-500";
    borderColor = "border-teal-500";
    statusBg = "bg-teal-50 dark:bg-teal-950/30 border-teal-200";
    icon = <TrendingUp className="h-4 w-4" />;
  }
  
  return { currentSpeed, requiredSpeed, etaDate, estimatedDaysToFinish, failureRate, status, statusColor, barColor, borderColor, statusBg, icon, daysLeft };
}

function FarmAnalyticsDashboard() {
  const { printers, orders, spools } = useFarm3D();
  
  // Estado del Switch (Busca en el store global, si no lo encuentra usa un estado local seguro)
  const [localWorkWeekMode, setLocalWorkWeekMode] = useState<"working-week" | "full-week">("working-week");
  const workWeekMode = useFarm3D((s: any) => s.workWeekMode) || localWorkWeekMode;
  const setWorkWeekMode = useFarm3D((s: any) => s.setWorkWeekMode) || setLocalWorkWeekMode;

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("Activas");
  const [orderTimeFilter, setOrderTimeFilter] = useState<string>("30d");
  const [expandedOrder, setExpandedOrder] = useState<ProductionOrder | null>(null);
  
  const isWithinTimeFilter = (dateStr: string, filter: string) => {
    if (filter === "todo") return true;
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    if (filter === "7d" && diffDays > 7) return false;
    if (filter === "30d" && diffDays > 30) return false;
    if (filter === "3m" && diffDays > 90) return false;
    if (filter === "mes" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
    if (filter === "ano" && d.getFullYear() !== now.getFullYear()) return false;
    return true;
  };

  const filteredOrders = orders.filter(o => {
    const isActive = ["Pendiente", "En Progreso", "Pausada", "Impreso (A Post-Proceso)", "Quitando Soportes", "Acabado (Lijado/Pintura)"].includes(o.status);
    if (orderStatusFilter === "Activas" && !isActive) return false;
    if (orderStatusFilter === "Completadas" && o.status !== "Completada") return false;
    if (orderStatusFilter === "Canceladas" && o.status !== "Cancelada") return false;

    return isWithinTimeFilter(o.createdAt, orderTimeFilter);
  });
  
  const dashboardActiveOrders = filteredOrders.filter(o => ["Pendiente", "En Progreso", "Pausada", "Impreso (A Post-Proceso)", "Quitando Soportes", "Acabado (Lijado/Pintura)"].includes(o.status));
  
  const totalPrinters = printers.length;
  const printingPrinters = printers.filter(p => p.state === "Imprimiendo").length;
  
  const globalTarget = filteredOrders.reduce((acc, o) => acc + o.targetPieces, 0);
  const globalPrinted = filteredOrders.reduce((acc, o) => acc + o.printedPieces, 0);
  const globalFailed = filteredOrders.reduce((acc, o) => acc + o.failedPieces, 0);
  
  const globalFailureRate = (globalPrinted + globalFailed) > 0 ? (globalFailed / (globalPrinted + globalFailed)) * 100 : 0;

  const totalNetFilament = spools.reduce((acc, s) => acc + s.weightRemaining, 0);
  const totalGrossFilament = spools.reduce((acc, s) => acc + s.weightRemaining + (s.emptySpoolWeight || 200), 0);
  const lowSpools = spools.filter(s => (s.weightRemaining / s.weightTotal) <= 0.15).length;

  // --- Operator Efficiency ---
  const operatorStats: Record<string, { good: number, bad: number, distinctOrders: Set<string>, materials: Set<string>, nightPrints: number, weekendPrints: number, totalWeight: number }> = {};
  
  orders.forEach(o => {
      const mat = o.material && o.material !== "Cualquiera" ? o.material : "PLA";
      const weight = o.weightPerPiece || 0;
      
      o.productionLogs?.forEach(log => {
          if (!isWithinTimeFilter(log.date, orderTimeFilter)) return;
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
          if (!isWithinTimeFilter(f.date, orderTimeFilter)) return;
          const op = f.operator || "Desconocido";
          if (!operatorStats[op]) operatorStats[op] = { good: 0, bad: 0, distinctOrders: new Set(), materials: new Set(), nightPrints: 0, weekendPrints: 0, totalWeight: 0 };
          operatorStats[op].bad += f.amount;
          operatorStats[op].totalWeight += f.amount * weight;
      });
  });
  
  const baseRanking = Object.entries(operatorStats).map(([name, stats]) => {
      const total = stats.good + stats.bad;
      const efficiency = total > 0 ? (stats.good / total) * 100 : 0;
      const achievements = [];
      
      if (stats.good >= 1) achievements.push({ name: "Primer Paso", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10", border: "border-yellow-200 dark:border-yellow-500/20", tooltip: "Primera pieza" });
      if (stats.good >= 100) achievements.push({ name: "Titán de Producción", icon: Zap, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10", border: "border-orange-200 dark:border-orange-500/20", tooltip: "100 piezas buenas" });
      if (stats.good >= 250) achievements.push({ name: "Velocista", icon: Rocket, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-200 dark:border-sky-500/20", tooltip: "250 piezas fabricadas" });
      if (stats.good >= 500) achievements.push({ name: "Centurión", icon: Shield, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-500/10", border: "border-slate-300 dark:border-slate-500/30", tooltip: "500 piezas buenas" });
      if (stats.good >= 1000) achievements.push({ name: "Leyenda Viva", icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-600/10", border: "border-yellow-400 dark:border-yellow-600/30", tooltip: "1000 piezas buenas" });
      if (efficiency >= 95 && total >= 20) achievements.push({ name: "Precisión Quirúrgica", icon: Target, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20", tooltip: "Efectividad > 95% (mín 20)" });
      if (stats.bad === 0 && total >= 10) achievements.push({ name: "Racha Impecable", icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", border: "border-blue-200 dark:border-blue-500/20", tooltip: "Cero mermas (+10 impresiones)" });
      if (stats.bad === 0 && total >= 50) achievements.push({ name: "Cero Desperdicio", icon: Leaf, color: "text-green-600", bg: "bg-green-50 dark:bg-green-600/10", border: "border-green-300 dark:border-green-600/30", tooltip: "Cero mermas (+50 impresiones)" });
      if (stats.materials.size >= 3) achievements.push({ name: "Maestro Materiales", icon: Palette, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10", border: "border-purple-200 dark:border-purple-500/20", tooltip: "3 materiales distintos" });
      if (stats.totalWeight >= 5000) achievements.push({ name: "Peso Pesado", icon: Scale, color: "text-stone-600", bg: "bg-stone-100 dark:bg-stone-600/10", border: "border-stone-300 dark:border-stone-600/30", tooltip: ">5 kg procesados" });
      if (stats.nightPrints >= 20) achievements.push({ name: "Búho Nocturno", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-500/20", tooltip: "20 pzs turno de noche" });
      if (stats.weekendPrints >= 20) achievements.push({ name: "Guerrero Finde", icon: Flame, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-200 dark:border-red-500/20", tooltip: "20 pzs en fin de semana" });
      if (stats.distinctOrders.size >= 5) achievements.push({ name: "Multitarea", icon: Layers, color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/20", tooltip: "Aporte en 5 órdenes distintas" });
      if (stats.bad > 0 && efficiency >= 85 && total >= 50) achievements.push({ name: "Resiliente", icon: Activity, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-500/10", border: "border-pink-200 dark:border-pink-500/20", tooltip: ">85% efectividad tras fallos" });
      
      return { name, ...stats, total, efficiency, achievements };
  }).sort((a, b) => b.good - a.good);
  
  if (baseRanking.length > 0 && baseRanking[0].good > 0) {
      baseRanking[0].achievements.unshift({ name: "Técnico MVP", icon: Crown, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20", tooltip: "Líder de producción actual" });
  }
  const operatorRanking = baseRanking;

  // --- Material Performance Stats ---
  const materialStats: Record<string, { good: number, bad: number }> = {};
  orders.forEach(o => {
      const mat = o.material && o.material !== "Cualquiera" ? o.material : "General";
      o.productionLogs?.forEach(log => {
          if (!isWithinTimeFilter(log.date, orderTimeFilter)) return;
          if (!materialStats[mat]) materialStats[mat] = { good: 0, bad: 0 };
          materialStats[mat].good += log.amount;
      });
      o.failures?.forEach(f => {
          if (!isWithinTimeFilter(f.date, orderTimeFilter)) return;
          if (!materialStats[mat]) materialStats[mat] = { good: 0, bad: 0 };
          materialStats[mat].bad += f.amount;
      });
  });
  const materialPerformance = Object.entries(materialStats).map(([name, stats]) => {
      const total = stats.good + stats.bad;
      const failureRate = total > 0 ? (stats.bad / total) * 100 : 0;
      return { name, Buenas: stats.good, Mermas: stats.bad, failureRate, total };
  }).filter(m => m.total > 0).sort((a, b) => b.total - a.total).slice(0, 8); // Top 8 materials

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-blue-500">
            <BarChartHorizontal className="h-6 w-6" /> Dashboard Analítico
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Algoritmos predictivos, cálculo de mermas y estatus de salud.
          </p>
          <div className="flex items-center gap-3 mt-4 bg-muted/40 border px-3 py-2 rounded-lg w-fit">
            <Switch 
              id="work-week-mode" 
              checked={workWeekMode === 'working-week'} 
              onCheckedChange={(c) => setWorkWeekMode(c ? 'working-week' : 'full-week')} 
            />
            <Label htmlFor="work-week-mode" className="text-xs cursor-pointer text-muted-foreground font-medium">
              Analíticas en semana laboral (L-V)
            </Label>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={orderTimeFilter} onValueChange={setOrderTimeFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="ano">Este año</SelectItem>
                <SelectItem value="todo">Histórico</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-px h-4 bg-border mx-1" />
            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                <SelectItem value="Activas">Activas</SelectItem>
                <SelectItem value="Completadas">Completadas</SelectItem>
                <SelectItem value="Canceladas">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mt-6">
        <Card className="shadow-sm border-orange-500/20 bg-orange-50/10 dark:bg-orange-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-orange-600">Filamento Neto</CardTitle>
            <Cylinder className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{(totalNetFilament / 1000).toFixed(2)} <span className="text-xl">kg</span></div>
            <p className="text-xs text-muted-foreground mt-1">{spools.length} bobinas en inventario</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-500/20 bg-amber-50/10 dark:bg-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-amber-600">Peso Bruto (Báscula)</CardTitle>
            <Scale className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{(totalGrossFilament / 1000).toFixed(2)} <span className="text-xl">kg</span></div>
            <p className="text-xs text-muted-foreground mt-1">Incluye tara de los carretes vacíos</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-rose-600">Bobinas por Agotarse</CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{lowSpools}</div>
            <p className="text-xs text-muted-foreground mt-1">Al 15% o menos de capacidad</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ocupación Granja</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPrinters > 0 ? Math.round((printingPrinters / totalPrinters) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">{printingPrinters} de {totalPrinters} máquinas trabajando</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Carga Total Actual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{globalPrinted} / {globalTarget}</div>
            <p className="text-xs text-muted-foreground mt-1">Suma de metas activas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Merma (Fallos)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{globalFailureRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{globalFailed} piezas desperdiciadas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Órdenes Activas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredOrders.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Órdenes encontradas</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-violet-500">
            <Trophy className="h-5 w-5" /> Eficiencia por Operario
          </h2>
          <Link to="/logros-3d" className="text-xs text-violet-500 hover:underline flex items-center gap-1 font-semibold bg-violet-50 dark:bg-violet-500/10 px-2 py-1 rounded-md">
            Ver progreso de recompensas &rarr;
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operatorRanking.length === 0 ? (
            <div className="col-span-full py-8 text-center border-dashed border-2 rounded-xl text-muted-foreground bg-muted/10">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Aún no hay registros de producción vinculados a operarios.
            </div>
          ) : (
            operatorRanking.map((op, i) => (
              <Card key={op.name} className={`overflow-hidden ${i === 0 ? 'border-violet-500/50 shadow-md shadow-violet-500/10' : ''}`}>
                <CardContent className="p-0">
                  <div className={`p-4 flex items-center justify-between border-b ${i === 0 ? 'bg-violet-50 dark:bg-violet-950/20' : 'bg-muted/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-violet-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                        {op.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold">{op.name} {i === 0 && <Star className="inline h-3.5 w-3.5 text-amber-500 mb-1 fill-amber-500" />}</p>
                        <p className="text-xs text-muted-foreground">{op.total} interacciones</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${op.efficiency >= 90 ? 'text-emerald-500' : op.efficiency >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {op.efficiency.toFixed(1)}%
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Efectividad</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 p-3 gap-2 text-center divide-x">
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{op.good}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Buenas</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-rose-500">{op.bad}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Mermas</p>
                    </div>
                  </div>
                  {op.achievements.length > 0 && (
                    <div className="p-3 border-t bg-muted/5">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Logros Desbloqueados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {op.achievements.map((ach: any) => {
                          const Icon = ach.icon;
                          return (
                            <Badge key={ach.name} variant="outline" className={`px-1.5 py-0.5 h-auto text-[10px] gap-1 shadow-none ${ach.bg} ${ach.border} ${ach.color}`} title={ach.tooltip}>
                              <Icon className="h-3 w-3" /> {ach.name}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2 text-rose-500">
          <BarChart2 className="h-5 w-5" /> Rendimiento por Material
        </h2>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comparativa de piezas buenas vs mermas</CardTitle>
          </CardHeader>
          <CardContent className="h-80 pt-4">
            {materialPerformance.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm border-dashed border-2 rounded-xl bg-muted/10">
                No hay registros de producción suficientes en este periodo.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} pzs ${name === 'Mermas' ? `(${props.payload.failureRate.toFixed(1)}% fallo)` : ''}`,
                      name
                    ]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Buenas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Mermas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-6">
        <h2 className="text-lg font-bold tracking-tight">Algoritmo Predictivo por Orden</h2>
        {dashboardActiveOrders.length === 0 ? (
          <Card className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 border-dashed">
            <Activity className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <p className="font-semibold">Sin datos predictivos</p>
            <p className="text-sm text-muted-foreground">Inicia una orden de producción para ver el análisis de ETA.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {dashboardActiveOrders.map(o => {
              const h = calculateHealth(o, workWeekMode);
              const progress = Math.min(100, Math.max(0, (o.printedPieces / o.targetPieces) * 100));
              const chartData = generateOrderChartData(o, workWeekMode);

              return (
                <Card key={o.id} className={`overflow-hidden border-l-4 shadow-sm ${h.borderColor}`}>
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-[1fr_250px] divide-y lg:divide-y-0 lg:divide-x">
                      <div className="p-4 sm:p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold truncate">{o.name}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Clock className="h-3.5 w-3.5" /> Entrega: {new Date(o.deadline).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className={`px-2.5 py-1 flex items-center gap-1.5 border shadow-sm ${h.statusBg} ${h.statusColor}`}>
                            {h.icon} <span className="font-bold uppercase tracking-wider text-[10px]">{h.status}</span>
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Progreso de fabricación</span>
                            <span>{Math.floor(progress)}% ({o.printedPieces} / {o.targetPieces})</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${h.barColor} transition-all`} style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Velocidad Actual</p>
                            <p className="font-mono font-semibold">{h.currentSpeed.toFixed(1)} <span className="text-xs font-sans text-muted-foreground">pzs/día</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Vel. Requerida</p>
                            <p className="font-mono font-semibold">{h.requiredSpeed.toFixed(1)} <span className="text-xs font-sans text-muted-foreground">pzs/día</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Tasa de Merma</p>
                            <p className="font-mono font-semibold text-rose-500">{h.failureRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Días Restantes</p>
                            <p className="font-mono font-semibold">{Math.max(0, h.daysLeft).toFixed(1)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-muted/10 p-4 sm:p-6 flex flex-col justify-center border-l">
                        <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2 text-center">Estimación de Término</p>
                        {h.estimatedDaysToFinish === Infinity ? (
                          <div className="text-center">
                            <p className="text-lg font-bold text-muted-foreground">Indeterminado</p>
                            <p className="text-xs text-muted-foreground mt-1">Registra piezas para calcular</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className={`text-2xl font-black tracking-tight ${h.statusColor}`}>
                              {h.etaDate.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 font-medium">
                              (En ~{Math.ceil(h.estimatedDaysToFinish)} días)
                            </p>
                            {h.status === "Atrasada" && (
                              <p className="text-[10px] text-rose-500 font-bold mt-2 bg-rose-500/10 px-2 py-1 rounded">
                                ¡Aumenta el ritmo para llegar a tiempo!
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t bg-muted/5 p-4 sm:p-6 h-[300px] flex flex-col relative group">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-2">
                          <BarChart2 className="h-4 w-4" /> Evolución de Producción
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setExpandedOrder(o)} title="Expandir gráfica">
                          <Maximize className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            {chartData.filter((d: any) => d.isWeekend).map((d: any) => (
                              <ReferenceArea key={`ref-${d.date}`} x1={d.date} x2={d.date} fill="gray" fillOpacity={0.1} yAxisId="left" />
                            ))}
                            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                            <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar yAxisId="left" dataKey="Prod. Diaria" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={30}>
                              {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-prod-${index}`} fill={entry.isWeekend ? "#6ee7b7" : "#10b981"} />
                              ))}
                            </Bar>
                            <Bar yAxisId="left" dataKey="Mermas" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={30}>
                              {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-merma-${index}`} fill={entry.isWeekend ? "#fda4af" : "#f43f5e"} />
                              ))}
                            </Bar>
                            <Line yAxisId="left" type="monotone" dataKey="Vel. Requerida" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                            <Line yAxisId="left" type="monotone" dataKey="Vel. Recuperación" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                            <Line yAxisId="right" type="step" dataKey="Meta Ideal" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="Acumulado Real" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!expandedOrder} onOpenChange={(o) => !o && setExpandedOrder(null)}>
        <DialogContent className="w-[95vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background rounded-xl border-0 sm:border">
          {expandedOrder && (() => {
             const o = expandedOrder;
             const h = calculateHealth(o, workWeekMode);
             const progress = Math.min(100, Math.max(0, (o.printedPieces / o.targetPieces) * 100));
             const chartData = generateOrderChartData(o, workWeekMode);

             return (
               <>
                <DialogHeader className="p-4 sm:p-6 border-b bg-background shrink-0 flex flex-row items-center justify-between space-y-0">
                   <div className="text-left flex flex-col gap-1">
                     <DialogTitle className="text-xl flex items-center gap-2">
                       <BarChart2 className="text-primary h-5 w-5 shrink-0" />
                       Evolución: {o.name}
                     </DialogTitle>
                     <DialogDescription className="mt-0">Vista detallada de producción y estadísticas predictivas.</DialogDescription>
                   </div>
                   <Badge variant="outline" className={`hidden sm:flex px-2.5 py-1 items-center gap-1.5 border shadow-sm ${h.statusBg} ${h.statusColor} ml-4 shrink-0`}>
                     {h.icon} <span className="font-bold uppercase tracking-wider text-[10px]">{h.status}</span>
                   </Badge>
                </DialogHeader>
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] overflow-hidden divide-y lg:divide-y-0 lg:divide-x">
                  <div className="p-6 overflow-y-auto bg-muted/5 flex flex-col gap-6">
                     <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs font-medium">
                         <span className="text-muted-foreground">Progreso de fabricación</span>
                         <span>{Math.floor(progress)}% ({o.printedPieces} / {o.targetPieces})</span>
                       </div>
                       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                         <div className={`h-full ${h.barColor} transition-all`} style={{ width: `${progress}%` }} />
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border rounded-lg p-3 text-center shadow-sm">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Velocidad Actual</p>
                          <p className="font-mono font-semibold text-lg">{h.currentSpeed.toFixed(1)} <span className="text-[10px] font-sans text-muted-foreground">pzs/día</span></p>
                        </div>
                        <div className="bg-card border rounded-lg p-3 text-center shadow-sm">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Vel. Requerida</p>
                          <p className="font-mono font-semibold text-lg">{h.requiredSpeed.toFixed(1)} <span className="text-[10px] font-sans text-muted-foreground">pzs/día</span></p>
                        </div>
                        <div className="bg-card border rounded-lg p-3 text-center shadow-sm">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Tasa de Merma</p>
                          <p className="font-mono font-semibold text-lg text-rose-500">{h.failureRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-card border rounded-lg p-3 text-center shadow-sm">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Días Restantes</p>
                          <p className="font-mono font-semibold text-lg">{Math.max(0, h.daysLeft).toFixed(1)}</p>
                        </div>
                     </div>

                     <div className="bg-muted/20 border rounded-lg p-4 text-center mt-auto">
                       <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Estimación de Término</p>
                       {h.estimatedDaysToFinish === Infinity ? (
                         <p className="text-sm font-bold text-muted-foreground">Indeterminado</p>
                       ) : (
                         <div>
                           <p className={`text-3xl font-black tracking-tight ${h.statusColor}`}>
                             {h.etaDate.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1 font-medium">
                             (En ~{Math.ceil(h.estimatedDaysToFinish)} días)
                           </p>
                         </div>
                       )}
                     </div>
                  </div>
                  
                  <div className="p-4 sm:p-6 flex flex-col min-h-[400px] bg-background">
                     <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                          {chartData.filter((d: any) => d.isWeekend).map((d: any) => (
                            <ReferenceArea key={`ref-exp-${d.date}`} x1={d.date} x2={d.date} fill="gray" fillOpacity={0.1} yAxisId="left" />
                          ))}
                          <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} dy={10} />
                          <YAxis yAxisId="left" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                          <YAxis yAxisId="right" orientation="right" fontSize={11} tickLine={false} axisLine={false} dx={10} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                          <Bar yAxisId="left" dataKey="Prod. Diaria" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-exp-prod-${index}`} fill={entry.isWeekend ? "#6ee7b7" : "#10b981"} />
                            ))}
                          </Bar>
                          <Bar yAxisId="left" dataKey="Mermas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-exp-merma-${index}`} fill={entry.isWeekend ? "#fda4af" : "#f43f5e"} />
                            ))}
                          </Bar>
                          <Line yAxisId="left" type="monotone" dataKey="Vel. Requerida" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                          <Line yAxisId="left" type="monotone" dataKey="Vel. Recuperación" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                          <Line yAxisId="right" type="step" dataKey="Meta Ideal" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                          <Line yAxisId="right" type="monotone" dataKey="Acumulado Real" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
                </div>
               </>
             );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}