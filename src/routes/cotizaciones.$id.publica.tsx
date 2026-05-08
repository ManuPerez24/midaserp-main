import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/stores/quotes";
import { useClients } from "@/stores/clients";
import { useSettings } from "@/stores/settings";
import { QuotePreviewSheet } from "@/components/quote-preview-sheet";
import { generateQrDataUrl, quoteVerifyUrl } from "@/lib/qr";
import { isExpired } from "@/lib/quote-calc";

export const Route = createFileRoute("/cotizaciones/$id/publica")({
  head: ({ params }) => ({
    meta: [
      { title: `Cotización ${params.id.slice(0, 6)} · Vista pública` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PublicQuote,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Cotización no encontrada.</p>
    </div>
  ),
});

function PublicQuote() {
  const { id } = Route.useParams();
  const quote = useQuotes((s) => s.quotes.find((q) => q.id === id));
  const clients = useClients((s) => s.clients);
  const settings = useSettings((s) => s.settings);
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!quote) return;
    let cancelled = false;
    generateQrDataUrl(quoteVerifyUrl(quote.id)).then((u) => {
      if (!cancelled) setQrUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [quote?.id]);

  if (!quote) throw notFound();

  const client = clients.find((c) => c.id === quote.clientId) ?? null;
  const expired = isExpired(quote.validUntil);

  return (
    <div className="min-h-screen bg-muted/40 py-6 sm:py-10">
      <div className="mx-auto max-w-[860px] px-3 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            Vista pública · solo lectura
            {expired ? <span className="ml-2 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">VENCIDA</span> : null}
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="#" onClick={(e) => { e.preventDefault(); window.print(); }}>
              Imprimir
            </a>
          </Button>
        </div>
        <QuotePreviewSheet quote={quote} client={client} settings={settings} qrDataUrl={qrUrl} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Documento generado por {settings.issuer.companyName || "MIDAS ERP"} ·{" "}
          <Link to="/" className="underline">
            Inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
