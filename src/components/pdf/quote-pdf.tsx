import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Quote, Client, AppSettings } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/utils";
import { computeTotals, lineTotal, isExpired } from "@/lib/quote-calc";

interface Props {
  quote: Quote;
  client: Client | null;
  settings: AppSettings;
  hidePrices?: boolean;
  qrDataUrl?: string;
  partLookup?: Record<string, string>;
}

export function QuotePdfDocument({
  quote,
  client,
  settings,
  hidePrices = false,
  qrDataUrl,
  partLookup,
}: Props) {
  const { issuer, pdf } = settings;
  const showLogo = !!issuer.logoDataUrl && pdf.showLogo;
  const showQr = pdf.showQr !== false && qrDataUrl;
  const pageSize = pdf.pageSize ?? "LETTER";

  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
    headerRow: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: 16,
      gap: 8,
    },
    logoBox: {
      width: "33%",
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 8,
      backgroundColor: "#ffffff",
      padding: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    logoImg: { width: "100%", height: 80, objectFit: "contain" },
    headerBand: {
      flex: 1,
      backgroundColor: pdf.headerColor,
      padding: 14,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      color: "#ffffff",
    },
    issuerName: { fontSize: 14, fontWeight: 700, color: "#ffffff" },
    issuerSub: { fontSize: 9, color: "#e5edff", marginTop: 1 },
    folio: { fontSize: 16, fontWeight: 700, color: "#ffffff" },
    folioSub: { fontSize: 9, color: "#e5edff", textAlign: "right" },
    clientCard: {
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 6,
      padding: 10,
      backgroundColor: "#fafbfc",
      marginBottom: 14,
    },
    cardTitle: {
      fontSize: 9,
      color: pdf.accentColor,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    cardLine: { fontSize: 10, marginBottom: 2 },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: pdf.accentColor,
      color: "#ffffff",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 4,
      marginBottom: 4,
      fontSize: 9,
      fontWeight: 700,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
    },
    rowAlt: { backgroundColor: "#f3f4f6" },
    cellNum: { width: "5%" },
    cellPart: { width: "18%", paddingRight: 4 },
    cellName: { width: hidePrices ? "57%" : "32%", paddingRight: 4 },
    cellQty: { width: "8%", textAlign: "right" },
    cellUnit: { width: "10%" },
    cellPrice: { width: "10%", textAlign: "right" },
    cellDisc: { width: "7%", textAlign: "right" },
    cellTotal: { width: "10%", textAlign: "right" },
    productName: { fontWeight: 700, fontSize: 10 },
    productDesc: { fontSize: 8, color: "#6b7280", marginTop: 1 },
    skuSmall: { fontSize: 7, color: "#9ca3af", marginTop: 1 },
    bottomRow: {
      marginTop: 14,
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    commentBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      borderRadius: 6,
      padding: 10,
      backgroundColor: "#fafbfc",
      minHeight: 90,
    },
    commentText: { fontSize: 9, color: "#374151", lineHeight: 1.4 },
    totals: {
      width: "40%",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#e5e7eb",
      overflow: "hidden",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 5,
      paddingHorizontal: 10,
      fontSize: 10,
    },
    totalRowFinal: {
      backgroundColor: pdf.headerColor,
      color: "#ffffff",
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      fontWeight: 700,
      fontSize: 12,
    },
    notes: { marginTop: 14, fontSize: 9, color: "#374151" },
    terms: { marginTop: 8, fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
    footerWrap: {
      position: "absolute",
      bottom: 20,
      left: 32,
      right: 32,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "#e5e7eb",
      paddingTop: 6,
    },
    footerText: { fontSize: 8, color: "#6b7280", flex: 1, textAlign: "center" },
    qr: { width: 60, height: 60 },
    qrLabel: { fontSize: 6, color: "#9ca3af", textAlign: "center", marginTop: 1 },
  });

  const totals = computeTotals(quote, issuer.ivaPercent);
  const currency = quote.lines[0]?.currency ?? "MXN";
  const commentary = quote.commentary?.trim();
  const hasLineDisc = quote.lines.some((l) => (l.discountPercent ?? 0) > 0);
  const hasGlobalDisc = (quote.globalDiscountPercent ?? 0) > 0;
  const expired = isExpired(quote.validUntil);

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        <View style={styles.headerRow}>
          {showLogo ? (
            <View style={styles.logoBox}>
              <Image src={issuer.logoDataUrl!} style={styles.logoImg} />
            </View>
          ) : null}
          <View style={styles.headerBand}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {issuer.companyName ? <Text style={styles.issuerName}>{issuer.companyName}</Text> : null}
              {issuer.address ? <Text style={styles.issuerSub}>{issuer.address}</Text> : null}
              {(issuer.phone || issuer.rfc) ? (
                <Text style={styles.issuerSub}>
                  {issuer.phone ? `Tel: ${issuer.phone}` : ""}
                  {issuer.phone && issuer.rfc ? " · " : ""}
                  {issuer.rfc ? `RFC: ${issuer.rfc}` : ""}
                </Text>
              ) : null}
            </View>
            <View>
              <Text style={styles.folio}>{quote.folio}</Text>
              <Text style={styles.folioSub}>COTIZACIÓN</Text>
              <Text style={styles.folioSub}>{formatDate(quote.createdAt)}</Text>
              <Text style={styles.folioSub}>Estado: {quote.status}</Text>
              <Text style={styles.folioSub}>Moneda: {currency}</Text>
              {quote.validUntil ? (
                <Text style={styles.folioSub}>
                  {expired ? "VENCIDA · " : "Válida hasta: "}
                  {formatDate(quote.validUntil)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.clientCard}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <Text style={styles.cardLine}>{client?.receiver ?? "—"}</Text>
          {client?.company ? <Text style={styles.cardLine}>{client.company}</Text> : null}
          {client?.email ? <Text style={styles.cardLine}>{client.email}</Text> : null}
          {client?.phone ? <Text style={styles.cardLine}>{client.phone}</Text> : null}
          {client?.address ? <Text style={styles.cardLine}>{client.address}</Text> : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.cellNum}>#</Text>
          <Text style={styles.cellPart}>Nº de parte</Text>
          <Text style={styles.cellName}>Producto</Text>
          <Text style={styles.cellQty}>Cant.</Text>
          <Text style={styles.cellUnit}>Unidad</Text>
          {!hidePrices && (
            <>
              <Text style={styles.cellPrice}>P. Unit.</Text>
              {hasLineDisc ? <Text style={styles.cellDisc}>Desc.</Text> : null}
              <Text style={styles.cellTotal}>Importe</Text>
            </>
          )}
        </View>

        {quote.lines.map((l, i) => (
          <View
            key={l.productId}
            style={pdf.zebra && i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
          >
            <Text style={styles.cellNum}>{i + 1}</Text>
            <Text style={styles.cellPart}>{l.partNumber || partLookup?.[l.productId] || "—"}</Text>
            <View style={styles.cellName}>
              <Text style={styles.productName}>{l.name}</Text>
              {l.description ? <Text style={styles.productDesc}>{l.description}</Text> : null}
              <Text style={styles.skuSmall}>SKU: {l.sku}</Text>
            </View>
            <Text style={styles.cellQty}>{l.quantity}</Text>
            <Text style={styles.cellUnit}>{l.unit}</Text>
            {!hidePrices && (
              <>
                <Text style={styles.cellPrice}>{formatMoney(l.unitPrice, l.currency)}</Text>
                <Text style={styles.cellTotal}>
                  {formatMoney(l.unitPrice * l.quantity, l.currency)}
                </Text>
              </>
            )}
          </View>
        ))}

        <View style={styles.bottomRow}>
          <View style={styles.commentBox}>
            <Text style={styles.cardTitle}>Descripción / Comentarios</Text>
            {commentary ? (
              <Text style={styles.commentText}>{commentary}</Text>
            ) : (
              <Text style={[styles.commentText, { color: "#9ca3af", fontStyle: "italic" }]}>
                —
              </Text>
            )}
          </View>
          {!hidePrices ? (
            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text>Subtotal</Text>
                <Text>{formatMoney(totals.subtotal, currency)}</Text>
              </View>
              {totals.lineDiscounts > 0 ? (
                <View style={styles.totalRow}>
                  <Text>Desc. línea</Text>
                  <Text>− {formatMoney(totals.lineDiscounts, currency)}</Text>
                </View>
              ) : null}
              {hasGlobalDisc ? (
                <View style={styles.totalRow}>
                  <Text>Desc. global ({quote.globalDiscountPercent}%)</Text>
                  <Text>− {formatMoney(totals.globalDiscount, currency)}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text>IVA ({issuer.ivaPercent}%)</Text>
                <Text>{formatMoney(totals.iva, currency)}</Text>
              </View>
              <View style={styles.totalRowFinal}>
                <Text>TOTAL</Text>
                <Text>{formatMoney(totals.total, currency)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {quote.notes ? (
          <View style={styles.notes}>
            <Text>Notas: {quote.notes}</Text>
          </View>
        ) : null}

        {pdf.paymentTerms ? (
          <View style={styles.terms}>
            <Text>{pdf.paymentTerms}</Text>
          </View>
        ) : null}

        <View style={styles.footerWrap} fixed>
          <Text style={styles.footerText}>{pdf.footerText}</Text>
          {showQr ? (
            <View>
              <Image src={qrDataUrl!} style={styles.qr} />
              <Text style={styles.qrLabel}>Verificar</Text>
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
