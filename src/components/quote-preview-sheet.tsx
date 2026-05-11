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

  // Lógica de Plantilla
  const isMinimalist = pdf.template === "minimalist";
  const isClassic = pdf.template === "classic";
  
  const headerBg = isMinimalist ? "transparent" : isClassic ? "#f8fafc" : pdf.headerColor;
  const headerText = isMinimalist ? "currentColor" : isClassic ? "#334155" : "white";
  const tableHeaderBg = isMinimalist || isClassic ? "transparent" : pdf.accentColor;
  const tableHeaderText = isMinimalist || isClassic ? "currentColor" : "white";
  const accentColor = isMinimalist ? "currentColor" : isClassic ? "#475569" : pdf.accentColor;

  const cols = ["28px"];
  if (pdf.showPhotos !== false) cols.push("40px");
  cols.push("minmax(100px, 150px)");
  cols.push("minmax(150px, 1fr)");
  cols.push("44px");
  cols.push("56px");
  if (!hidePrices) {
    cols.push("76px");
    if (hasLineDiscounts && pdf.showDiscount !== false) cols.push("50px");
    cols.push("88px");
  }
  const tableColumns = cols.join(" ");

  const resolvePart = (line: Quote["lines"][number]) =>
    line.partNumber || products.find((p) => p.id === line.productId)?.partNumber || "";

  const renderBlock = (blockId: string) => {
    switch (blockId) {
      case "header":
        return (
          <header key="header" className="mb-4 flex items-stretch gap-2">
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
          className={cn(
            "flex flex-1 flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center", 
            isMinimalist && "border-2",
            isClassic && "border-b-4 rounded-none"
          )}
          style={{ backgroundColor: headerBg, color: headerText, borderColor: isMinimalist || isClassic ? pdf.headerColor : "transparent" }}
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
        );
      case "client":
        return (

          <section key="client" className="mb-4">
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>
            Cliente
          </p>
          <p className="font-medium">{client?.receiver ?? "—"}</p>
          {client?.company ? <p className="text-sm text-muted-foreground">{client.company}</p> : null}
          {client?.email ? <p className="text-sm text-muted-foreground">{client.email}</p> : null}
          {client?.phone ? <p className="text-sm text-muted-foreground">{client.phone}</p> : null}
          {client?.address ? <p className="text-sm text-muted-foreground">{client.address}</p> : null}
        </div>
          </section>
        );
      case "table":
        return (

          <section key="table" className="overflow-x-auto mb-4">
        <div className="min-w-[680px]">
          <div
            className={cn(
              "grid gap-2 rounded px-3 py-2 text-xs font-bold items-center", 
              isMinimalist && "border-b-2 rounded-none",
              isClassic && "border-y-2 border-slate-800 rounded-none"
            )}
            style={{ gridTemplateColumns: tableColumns, backgroundColor: tableHeaderBg, color: tableHeaderText, borderColor: isMinimalist ? pdf.accentColor : isClassic ? "currentColor" : "transparent" }}
          >
            <span>#</span>
            {pdf.showPhotos !== false && <span>Img</span>}
            <span>Nº de parte</span>
            <span>Producto</span>
            <span className="text-right">Cant.</span>
            <span>Unidad</span>
            {!hidePrices ? (
              <>
                <span className="text-right">P. Unit.</span>
                {hasLineDiscounts && pdf.showDiscount !== false ? <span className="text-right">Desc.</span> : null}
                <span className="text-right">Importe</span>
              </>
            ) : null}
          </div>
          {quote.lines.map((line, index) => (
            <div
              key={`${line.productId}-${index}`}
              className={cn(
                "grid gap-2 border-b px-3 py-3 text-sm items-center",
                pdf.zebra && index % 2 === 1 && "bg-muted/40",
              )}
              style={{ gridTemplateColumns: tableColumns }}
            >
              <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
              {pdf.showPhotos !== false && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/50 border shadow-sm">
                  {(() => {
                    const prod = products.find(p => p.id === line.productId);
                    return prod?.imageDataUrl ? (
                      <img src={prod.imageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[8px] text-muted-foreground">S/I</span>
                    );
                  })()}
                </div>
              )}
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
                {pdf.showSku !== false ? (
                  <span className="mt-0.5 block break-words font-mono text-[10px] text-muted-foreground/70">
                    SKU: {line.sku}
                  </span>
                ) : null}
              </span>
              <span className="text-right">{line.quantity}</span>
              <span>{line.unit}</span>
              {!hidePrices ? (
                <>
                  <span className="text-right">{formatMoney(line.unitPrice, line.currency)}</span>
                  {hasLineDiscounts && pdf.showDiscount !== false ? (
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
        );
      case "totals":
        return (

          <section key="totals" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch mb-4">
        <div className="flex-1 rounded-md border bg-muted/30 p-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: accentColor }}>
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
            {totals.lineDiscounts > 0 && pdf.showDiscount !== false ? (
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
        );
      case "notes":
        return quote.notes && pdf.showNotes !== false ? <p key="notes" className="mt-5 text-sm mb-4">Notas: {quote.notes}</p> : null;
      case "terms":
        return pdf.paymentTerms ? <p key="terms" className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground mb-4">{pdf.paymentTerms}</p> : null;
      default:
        return null;
    }
  };

  const layout = pdf.layout ?? ["header", "client", "table", "totals", "notes", "terms"];

  return (
    <article
      className={cn(
        "mx-auto min-h-[960px] w-full max-w-[816px] bg-card p-6 text-card-foreground shadow-sm ring-1 ring-border sm:p-8",
        isClassic && "font-serif",
        className,
      )}
    >
      {layout.map(blockId => renderBlock(blockId))}

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
