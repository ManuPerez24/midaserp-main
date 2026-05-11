import { createFileRoute } from "@tanstack/react-router";
import { useAuditLog } from "@/stores/audit-log";
import { useSettings } from "@/stores/settings";
import { PageGuard } from "@/components/page-guard";
import { DataTable } from "@/components/data-table";
import { History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [{ title: `Log de Auditoría · ${useSettings.getState().settings.branding.siteName}` }] }),
  component: () => (
    <PageGuard adminOnly>
      <AuditLogPage />
    </PageGuard>
  ),
});

function AuditLogPage() {
  const logs = useAuditLog((s) => s.logs);

  const handleExportCSV = () => {
    const headers = ["Fecha", "Usuario", "Acción", "Detalles"];
    const csvRows = logs.map((l) => {
      return [
        `"${new Date(l.timestamp).toLocaleString().replace(/"/g, '""')}"`,
        `"${(l.userName || l.userEmail).replace(/"/g, '""')}"`,
        `"${l.action.replace(/"/g, '""')}"`,
        `"${l.details.replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log de Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro cronológico de acciones importantes en el sistema.
        </p>
      </div>
      <DataTable
        rows={logs}
        rowKey={(l) => l.id}
        searchPlaceholder="Buscar por acción, detalle o usuario..."
        searchAccessor={(l) => `${l.action} ${l.details} ${l.userName} ${l.userEmail}`}
        toolbar={
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
        emptyState={
          <div className="py-10 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-3 h-8 w-8 opacity-50" />
            No hay registros en el log.
          </div>
        }
        columns={[
          {
            key: "timestamp",
            header: "Fecha",
            sortable: true,
            accessor: (l) => l.timestamp,
            cell: (l) => <span className="text-xs whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</span>,
          },
          {
            key: "user",
            header: "Usuario",
            sortable: true,
            accessor: (l) => l.userName || l.userEmail,
            cell: (l) => (
              <div>
                <p className="font-medium text-sm">{l.userName || l.userEmail}</p>
                <p className="text-xs text-muted-foreground">{l.userEmail}</p>
              </div>
            ),
          },
          { key: "action", header: "Acción", sortable: true, accessor: (l) => l.action, cell: (l) => <span className="font-mono text-xs">{l.action}</span> },
          { key: "details", header: "Detalles", cell: (l) => <p className="text-sm">{l.details}</p> },
        ]}
      />
    </div>
  );
}