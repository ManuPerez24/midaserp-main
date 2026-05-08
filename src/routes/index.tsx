import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
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
  Target,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInventory } from "@/stores/inventory";
import { useKits } from "@/stores/kits";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useSettings } from "@/stores/settings";
import { demoClients, demoProducts } from "@/lib/demo-data";
import { formatMoney } from "@/lib/utils";
import { PageGuard } from "@/components/page-guard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Dashboard · MIDAS ERP" }],
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
  const settings = useSettings((s) => s.settings);

  const addProduct = useInventory((s) => s.add);
  const addClient = useClients((s) => s.add);

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

  const topClients = useMemo(() => {
    const map: Record<string, number> = {};
    for (const q of quotes) map[q.clientId] = (map[q.clientId] ?? 0) + 1;
    return Object.entries(map)
      .map(([id, count]) => ({
        nombre: clients.find((c) => c.id === id)?.receiver ?? "—",
        cotizaciones: count,
      }))
      .sort((a, b) => b.cotizaciones - a.cotizaciones)
      .slice(0, 5);
  }, [quotes, clients]);

  // ----- KPIs del mes en curso -----
  const monthKpis = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const iva = settings.issuer.ivaPercent / 100;
    const inMonth = quotes.filter((q) => {
      const d = new Date(q.createdAt);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const totals = inMonth.map(
      (q) => q.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) * (1 + iva),
    );
    const sum = totals.reduce((a, b) => a + b, 0);
    const avg = totals.length ? sum / totals.length : 0;
    const accepted = inMonth.filter((q) => q.status === "Aceptada" || q.status === "Cerrada").length;
    const closeRate = inMonth.length ? (accepted / inMonth.length) * 100 : 0;
    return {
      count: inMonth.length,
      avgTicket: avg,
      accepted,
      closeRate,
      currency: inMonth[0]?.lines[0]?.currency ?? settings.branding.defaultCurrency ?? "MXN",
    };
  }, [quotes, settings]);

  // ----- Top 5 productos más cotizados -----
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    for (const q of quotes) {
      for (const l of q.lines) {
        const k = l.productId;
        if (!map[k]) map[k] = { name: l.name, qty: 0 };
        map[k].qty += l.quantity;
      }
    }
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [quotes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del sistema MIDAS ERP.
          </p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Cotizaciones" value={quotes.length} icon={FileText} to="/cotizaciones" />
        <Kpi title="Inventario" value={products.length} icon={Package} to="/inventario" />
        <Kpi title="Kits" value={kits.length} icon={Boxes} to="/kits" />
        <Kpi title="Clientes" value={clients.length} icon={Users} to="/clientes" />
      </div>

      {quotes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cotizaciones del mes
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{monthKpis.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {monthKpis.accepted} aceptadas / cerradas
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
                {formatMoney(monthKpis.avgTicket, monthKpis.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mes en curso, IVA incluido</p>
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
              <div className="text-3xl font-bold">{monthKpis.closeRate.toFixed(0)}%</div>
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
              <div className="text-3xl font-bold">{monthKpis.accepted}</div>
              <p className="text-xs text-muted-foreground mt-1">En el mes en curso</p>
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
              MIDAS ERP Lite te permite gestionar inventario, kits, clientes y emitir cotizaciones
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
