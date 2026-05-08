import type { AppSettings, Client, Quote } from "@/lib/types";
import { useInventory } from "@/stores/inventory";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { computeTotals, lineTotal, isExpired } from "@/lib/quote-calc";

interface QuotePreviewSheetProps {
  quote: Quote;
  client: Client | null;
  settings: AppSettings;
  hidePrices?: boolean;
  qrDataUrl?: string;
  className?: string;
}

export function QuotePreviewSheet({
  quote,
  client,
  settings,
  hidePrices = false,
  qrDataUrl,
  className,
}: QuotePreviewSheetProps) {
  const { issuer, pdf } = settings;
  const products = useInventory((s) => s.products);
  const totals = computeTotals(quote, issuer.ivaPercent);
  const currency = quote.lines[0]?.currency ?? "MXN";
  const showLogo = !!issuer.logoDataUrl && pdf.showLogo;
  const showQr = pdf.showQr !== false && qrDataUrl;
  const commentary = quote.commentary?.trim();
  const hasLineDiscounts = quote.lines.some((l) => (l.discountPercent ?? 0) > 0);
  const hasGlobalDiscount = (quote.globalDiscountPercent ?? 0) > 0;
  const expired = isExpired(quote.validUntil);

  const tableColumns = hidePrices
    ? "32px minmax(120px, 170px) minmax(200px, 1fr) 56px 74px"
    : hasLineDiscounts
      ? "28px minmax(110px, 150px) minmax(180px, 1fr) 50px 64px 80px 50px 88px"
      : "32px minmax(120px, 170px) minmax(200px, 1fr) 56px 74px 96px 96px";

  const resolvePart = (line: Quote["lines"][number]) =>
    line.partNumber || products.find((p) => p.id === line.productId)?.partNumber || "";

  return (
    <article
      className={cn(
        "mx-auto min-h-[960px] w-full max-w-[816px] bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border sm:p-8",
        className,
      )}
    >
      <header className="mb-4 flex items-stretch gap-2">
        {showLogo ? (
          <div
            className="flex w-1/3 items-center justify-center rounded-lg border bg-white p-3"
          >
            <img
              src={issuer.logoDataUrl!}
              alt={`Logotipo de ${issuer.companyName}`}
              className="max-h-24 w-full object-contain"
            />
          </div>
        ) : null}
        <div
          className="flex flex-1 flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center"
          style={{ backgroundColor: pdf.headerColor, color: "white" }}
        >
          <div className="min-w-0 flex-1">
            {issuer.companyName ? <h2 className="text-base font-bold">{issuer.companyName}</h2> : null}
            {issuer.address ? <p className="text-xs opacity-90">{issuer.address}</p> : null}
            {(issuer.phone || issuer.rfc) ? (
              <p className="text-xs opacity-90">
                {issuer.phone ? `Tel: ${issuer.phone}` : ""}
                {issuer.phone && issuer.rfc ? " · " : ""}
                {issuer.rfc ? `RFC: ${issuer.rfc}` : ""}
              </p>
            ) : null}
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-xl font-bold">{quote.folio}</p>
            <p className="text-xs font-semibold opacity-90">COTIZACIÓN</p>
            <p className="text-xs opacity-90">{formatDate(quote.createdAt)}</p>
            <p className="text-xs opacity-90">Estado: {quote.status}</p>
            <p className="text-xs opacity-90">Moneda: {currency}</p>
            {quote.validUntil ? (
              <p className="text-xs opacity-90">
                {expired ? "VENCIDA · " : "Válida hasta: "}
                {formatDate(quote.validUntil)}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className="mb-4">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: pdf.accentColor }}>
            Cliente
          </p>
          <p className="font-medium">{client?.receiver ?? "—"}</p>
          {client?.company ? <p className="text-sm text-muted-foreground">{client.company}</p> : null}
          {client?.email ? <p className="text-sm text-muted-foreground">{client.email}</p> : null}
          {client?.phone ? <p className="text-sm text-muted-foreground">{client.phone}</p> : null}
          {client?.address ? <p className="text-sm text-muted-foreground">{client.address}</p> : null}
        </div>
      </section>

      <section className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div
            className="grid gap-2 rounded px-3 py-2 text-xs font-bold"
            style={{ gridTemplateColumns: tableColumns, backgroundColor: pdf.accentColor, color: "white" }}
          >
            <span>#</span>
            <span>Nº de parte</span>
            <span>Producto</span>
            <span className="text-right">Cant.</span>
            <span>Unidad</span>
            {!hidePrices ? (
              <>
                <span className="text-right">P. Unit.</span>
                {hasLineDiscounts ? <span className="text-right">Desc.</span> : null}
                <span className="text-right">Importe</span>
              </>
            ) : null}
          </div>
          {quote.lines.map((line, index) => (
            <div
              key={`${line.productId}-${index}`}
              className={cn(
                "grid gap-2 border-b px-3 py-3 text-sm",
                pdf.zebra && index % 2 === 1 && "bg-muted/40",
              )}
              style={{ gridTemplateColumns: tableColumns }}
            >
              <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
              <span className="break-words font-mono text-xs leading-tight">
                {resolvePart(line) || "—"}
              </span>
              <span className="min-w-0">
                <span className="block break-words font-semibold">{line.name}</span>
                {line.description ? (
                  <span className="block break-words text-xs text-muted-foreground">
                    {line.description}
                  </span>
                ) : null}
                <span className="mt-0.5 block break-words font-mono text-[10px] text-muted-foreground/70">
                  SKU: {line.sku}
                </span>
              </span>
              <span className="text-right">{line.quantity}</span>
              <span>{line.unit}</span>
              {!hidePrices ? (
                <>
                  <span className="text-right">{formatMoney(line.unitPrice, line.currency)}</span>
                  {hasLineDiscounts ? (
                    <span className="text-right text-xs text-muted-foreground">
                      {(line.discountPercent ?? 0) > 0 ? `${line.discountPercent}%` : "—"}
                    </span>
                  ) : null}
                  <span className="text-right font-medium">
                    {formatMoney(lineTotal(line), line.currency)}
                  </span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex-1 rounded-md border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: pdf.accentColor }}>
            Descripción / Comentarios
          </p>
          {commentary ? (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
              {commentary}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">—</p>
          )}
        </div>
        {!hidePrices ? (
          <div className="w-full overflow-hidden rounded-md border sm:max-w-xs">
            <div className="flex justify-between px-4 py-2 text-sm">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {totals.lineDiscounts > 0 ? (
              <div className="flex justify-between px-4 py-2 text-sm text-rose-600">
                <span>Descuentos por línea</span>
                <span>− {formatMoney(totals.lineDiscounts, currency)}</span>
              </div>
            ) : null}
            {hasGlobalDiscount ? (
              <div className="flex justify-between px-4 py-2 text-sm text-rose-600">
                <span>Descuento global ({quote.globalDiscountPercent}%)</span>
                <span>− {formatMoney(totals.globalDiscount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between px-4 py-2 text-sm">
              <span>IVA ({issuer.ivaPercent}%)</span>
              <span>{formatMoney(totals.iva, currency)}</span>
            </div>
            <div
              className="flex justify-between px-4 py-3 font-bold"
              style={{ backgroundColor: pdf.headerColor, color: "white" }}
            >
              <span>TOTAL</span>
              <span>{formatMoney(totals.total, currency)}</span>
            </div>
          </div>
        ) : null}
      </section>

      {quote.notes ? <p className="mt-5 text-sm">Notas: {quote.notes}</p> : null}
      {pdf.paymentTerms ? (
        <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{pdf.paymentTerms}</p>
      ) : null}

      <footer className="mt-8 flex items-end justify-between border-t pt-3 text-xs text-muted-foreground">
        <span className="flex-1 text-center">{pdf.footerText}</span>
        {showQr ? (
          <div className="flex flex-col items-center">
            <img src={qrDataUrl!} alt="QR de verificación" className="h-16 w-16" />
            <span className="mt-0.5 text-[9px]">Verificar</span>
          </div>
        ) : null}
      </footer>
    </article>
  );
}
