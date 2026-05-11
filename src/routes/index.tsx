import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeRejectionsWithAi } from "@/util/chat.functions";
import { getStockOutPredictions } from "@/lib/smart-ai";
import {
  Boxes,
  FileText,
  Package,
  Users,
  Plus,
  Database,
  Cloud,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  LayoutGrid,
  Target,
  AlertTriangle,
  ThermometerSun,
  HardHat,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventory } from "@/stores/inventory";
import { useKits } from "@/stores/kits";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useProjects } from "@/stores/projects";
import { useSettings } from "@/stores/settings";
import { demoClients, demoProducts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { PageGuard } from "@/components/page-guard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: `Dashboard · ${useSettings.getState().settings.branding.siteName}` }],
  }),
  component: DashboardGuarded,
});

function DashboardGuarded() {
  return (
    <PageGuard permission="page:dashboard">
      <Dashboard />
    </PageGuard>
  );
}


const STATUS_COLORS: Record<string, string> = {
  Pendiente: "#f59e0b",
  "En Proceso": "#3b82f6",
  Aceptada: "#10b981",
  Rechazada: "#ef4444",
  Cerrada: "#64748b",
};

function Kpi({
  title,
  value,
  icon: Icon,
  to,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  hint?: string;
}) {
  return (
    <Link to={to} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function Dashboard() {
  const products = useInventory((s) => s.products);
  const kits = useKits((s) => s.kits);
  const quotes = useQuotes((s) => s.quotes);
  const clients = useClients((s) => s.clients);
  const projects = useProjects((s) => s.projects);
  const settings = useSettings((s) => s.settings);

  const addProduct = useInventory((s) => s.add);
  const addClient = useClients((s) => s.add);
  const [widgets, setWidgets] = useState<Record<string, boolean>>(() => JSON.parse(localStorage.getItem('dash_widgets') || '{"kpis":true,"chartBar":true,"chartPie":true,"topClients":true,"topProducts":true,"thermometer":true,"stockOut":true}'));
  const [timeFilter, setTimeFilter] = useState<"mes" | "pasado" | "ano" | "todo">("mes");

  useEffect(() => {
    localStorage.setItem('dash_widgets', JSON.stringify(widgets));
  }, [widgets]);

  const loadDemo = () => {
    demoProducts.forEach((p) => addProduct(p));
    demoClients.forEach((c) => addClient(c));
    toast.success("Datos demo cargados");
  };

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of quotes) map[q.status] = (map[q.status] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [quotes]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { mes: string; cotizaciones: number; total: number }> = {};
    const iva = settings.issuer.ivaPercent / 100;
    for (const q of quotes) {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const sub = q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
      if (!map[key]) map[key] = { mes: key, cotizaciones: 0, total: 0 };
      map[key].cotizaciones += 1;
      map[key].total += sub * (1 + iva);
    }
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
  }, [quotes, settings.issuer.ivaPercent]);

  const filteredQuotes = useMemo(() => {
    const now = new Date();
    return quotes.filter((q) => {
      if (timeFilter === "todo") return true;
      const d = new Date(q.createdAt);
      if (timeFilter === "mes") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (timeFilter === "pasado") {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
      }
      if (timeFilter === "ano") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [quotes, timeFilter]);

  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of filteredQuotes) map[q.clientId] = (map[q.clientId] ?? 0) + 1;
    return Object.entries(map)
      .map(([id, count]) => ({
        nombre: clients.find((c) => c.id === id)?.receiver ?? "—",
        cotizaciones: count,
      }))
      .sort((a, b) => b.cotizaciones - a.cotizaciones)
      .slice(0, 5);
  }, [filteredQuotes, clients]);

  // ----- KPIs filtrados -----
  const kpis = useMemo(() => {
    const iva = settings.issuer.ivaPercent / 100;
    const totals = filteredQuotes.map(
      (q) => q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) * (1 + iva),
    );
    const sum = totals.reduce((a, b) => a + b, 0);
    const avg = totals.length ? sum / totals.length : 0;
    const accepted = filteredQuotes.filter((q) => q.status === "Aceptada" || q.status === "Cerrada").length;
    const closeRate = filteredQuotes.length ? (accepted / filteredQuotes.length) * 100 : 0;
    return {
      count: filteredQuotes.length,
      avgTicket: avg,
      accepted,
      closeRate,
      currency: filteredQuotes[0]?.lines[0]?.currency ?? settings.branding.defaultCurrency ?? "MXN",
    };
  }, [filteredQuotes, settings]);

  // ----- Top 5 productos más cotizados -----
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    for (const q of filteredQuotes) {
      for (const l of q.lines) {
        const k = l.productId;
        if (!map[k]) map[k] = { name: l.name, qty: 0 };
        map[k].qty += l.quantity;
      }
    }
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredQuotes]);

  const filterLabel = {
    mes: "del mes en curso",
    pasado: "del mes pasado",
    ano: "del año",
    todo: "históricas",
  }[timeFilter];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del sistema {settings.branding.siteName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-center gap-2 bg-card rounded-md border px-2 py-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Filtro:</span>
            <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
              <SelectTrigger className="h-7 w-[120px] text-xs border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="pasado">Mes pasado</SelectItem>
                <SelectItem value="ano">Este año</SelectItem>
                <SelectItem value="todo">Todo el tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3" title="Personalizar Widgets">
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-3">
              <div className="text-sm font-semibold">Widgets visibles</div>
              {[ { id: "kpis", label: "KPIs Principales" }, { id: "chartBar", label: "Gráfico de Cotizaciones" }, { id: "chartPie", label: "Gráfico de Estados" }, { id: "topClients", label: "Top Clientes" }, { id: "topProducts", label: "Top Productos" }, { id: "thermometer", label: "Termómetro de Ventas" }, { id: "stockOut", label: "Riesgo de Quiebre" } ].map(w => (
                <label key={w.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                  <Checkbox checked={widgets[w.id]} onCheckedChange={(c) => setWidgets(prev => ({ ...prev, [w.id]: !!c }))} />
                  {w.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Link to="/inventario">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Nuevo producto
            </Button>
          </Link>
          <Link to="/cotizaciones">
            <Button>
              <FileText className="mr-2 h-4 w-4" /> Nueva cotización
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi title="Proyectos" value={projects.length} icon={HardHat} to="/proyectos" />
        <Kpi title="Cotizaciones" value={quotes.length} icon={FileText} to="/cotizaciones" />
        <Kpi title="Inventario" value={products.length} icon={Package} to="/inventario" />
        <Kpi title="Kits" value={kits.length} icon={Boxes} to="/kits" />
        <Kpi title="Clientes" value={clients.length} icon={Users} to="/clientes" />
      </div>

      {quotes.length > 0 && widgets.kpis && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cotizaciones ({filterLabel})
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.accepted} aceptadas / cerradas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket promedio
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatMoney(kpis.avgTicket, kpis.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">IVA incluido</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa de cierre
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.closeRate.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Aceptadas + cerradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aceptadas
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpis.accepted}</div>
              <p className="text-xs text-muted-foreground mt-1">En el periodo seleccionado</p>
            </CardContent>
          </Card>
        </div>
      )}

      {quotes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {settings.branding.siteName} te permite gestionar inventario, kits, clientes y emitir cotizaciones
              en PDF de alta gama. Las gráficas aparecerán cuando crees cotizaciones.
            </p>
            {products.length === 0 && (
              <Button onClick={loadDemo} variant="secondary">
                <Database className="mr-2 h-4 w-4" /> Cargar datos demo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {widgets.chartBar && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cotizaciones por mes</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar
                    dataKey="cotizaciones"
                    fill={settings.branding.primaryColor}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}

          {widgets.chartPie && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estado de cotizaciones</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          )}

          {widgets.topClients && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top clientes (por nº de cotizaciones)</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="nombre" fontSize={11} width={120} />
                    <Tooltip />
                    <Bar
                      dataKey="cotizaciones"
                      fill={settings.branding.primaryColor}
                      radius={[0, 6, 6, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          )}

          {widgets.topProducts && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 5 productos más cotizados</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <ol className="space-y-2">
                  {topProducts.map((p, i) => (
                    <li
                      key={p.name + i}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {p.qty} u.
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
          )}

          {widgets.thermometer && <ThermometerWidget quotes={filteredQuotes} />}
          {widgets.stockOut && (settings as any).inventory?.enableStock && (
            <StockOutWidget quotes={quotes} products={products} />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="h-4 w-4 text-emerald-500" /> Sincronización
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Los datos viven en este navegador (Local). Más adelante podrás migrar a la nube.
        </CardContent>
      </Card>
    </div>
  );
}

function StockOutWidget({ quotes, products }: { quotes: any[], products: any[] }) {
  const predictions = useMemo(() => getStockOutPredictions(quotes, products), [quotes, products]);
  
  return (
    <Card className="h-64 flex flex-col">
      <CardHeader className="py-3 border-b space-y-0 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Riesgo de Quiebre
        </CardTitle>
        <Badge variant="outline">{predictions.length} alertas</Badge>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto">
        {predictions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
            Todo en orden. Ningún producto con riesgo inminente de quiebre de stock.
          </div>
        ) : (
          <ul className="divide-y">
            {predictions.map((p, i) => (
              <li key={i} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate" title={p.product.name}>{p.product.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">Stock actual: {p.product.stock}</div>
                </div>
                <div className="text-right shrink-0">
                  {p.daysLeft <= 0 ? (
                    <span className="text-xs font-bold text-destructive">¡Agotado!</span>
                  ) : (
                    <span className={`text-xs font-bold ${p.daysLeft <= 15 ? 'text-destructive' : 'text-amber-500'}`}>
                      Se agota en {p.daysLeft} d.
                    </span>
                  )}
                  {p.dailyConsumption > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">-{p.dailyConsumption}/día</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ThermometerWidget({ quotes }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const analyzeRejections = useServerFn(analyzeRejectionsWithAi);
  const settings = useSettings(s => s.settings);

  const rejectedNotes = useMemo(() => quotes.filter((q: any) => q.status === "Rechazada").map((q: any) => q.notes).filter(Boolean), [quotes]);
  const hash = rejectedNotes.join("|||");

  useEffect(() => {
    if (rejectedNotes.length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    analyzeRejections({
      data: {
        notes: rejectedNotes,
        provider: settings.ai?.provider,
        apiKey: settings.ai?.apiKey,
        model: settings.ai?.model,
        baseUrl: settings.ai?.baseUrl,
      }
    }).then(res => {
      if (res.ok) {
         setData({ ...res.data, reasonsCount: rejectedNotes.length });
      }
      setLoading(false);
    });
  }, [hash, settings.ai]);
  
  if (loading) {
    return <Card className="h-[400px] flex items-center justify-center text-muted-foreground"><ThermometerSun className="h-5 w-5 mr-2 animate-spin" /> Analizando con IA...</Card>;
  }

  if (!data || !data.avgScore) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <ThermometerSun className="h-5 w-5 text-rose-500" /> Termómetro de Ventas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full text-sm text-muted-foreground">
          No hay suficientes cotizaciones rechazadas con notas para analizar.
        </CardContent>
      </Card>
    );
  }

  const isGood = data.avgScore >= 60;
  const isBad = data.avgScore < 40;
  const color = isBad ? "text-rose-500" : isGood ? "text-emerald-500" : "text-amber-500";

  return (
    <Card className="h-[400px] flex flex-col">
      <CardHeader className="py-3 border-b">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThermometerSun className={`h-5 w-5 ${color}`} /> Termómetro de Rechazos
          </div>
          <Badge variant="outline">{data.reasonsCount} notas analizadas</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-5 overflow-y-auto space-y-6">
        <div className="text-center">
          <div className={`text-4xl font-black ${color} mb-1`}>
            {Math.round(data.avgScore)} <span className="text-lg text-muted-foreground font-medium">/ 100</span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Índice de Salud de Ventas</p>
          <p className="text-sm mt-3 leading-relaxed">
            {isBad ? "Alerta: Muchos clientes reportan problemas de precio, tiempo o competencia." : isGood ? "Saludable: Las objeciones son normales y no presentan problemas críticos." : "Regular: Hay algunas quejas por precios o tiempos, mantente atento."}
          </p>
        </div>
        
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 text-center">Palabras más frecuentes</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {data.topWords.map((w: any, i: number) => {
               const size = Math.max(0.7, 1.5 - (i * 0.05));
               const opacity = Math.max(0.5, 1 - (i * 0.04));
               return (
                 <span key={w.text} style={{ fontSize: `${size}rem`, opacity }} className="font-bold text-primary capitalize">
                   {w.text}
                 </span>
               )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
