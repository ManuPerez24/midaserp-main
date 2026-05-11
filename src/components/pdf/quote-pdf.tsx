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
  imageLookup?: Record<string, string | null>;
}

export function QuotePdfDocument({
  quote,
  client,
  settings,
  hidePrices = false,
  qrDataUrl,
  partLookup,
  imageLookup,
}: Props) {
  const { issuer, pdf } = settings;
  const showLogo = !!issuer.logoDataUrl && pdf.showLogo;
  const showQr = pdf.showQr !== false && qrDataUrl;
  const pageSize = pdf.pageSize ?? "LETTER";
  
  const isMinimalist = pdf.template === "minimalist";
  const isClassic = pdf.template === "classic";
  
  const headerBg = isMinimalist ? "transparent" : isClassic ? "#f8fafc" : pdf.headerColor;
  const headerText = isMinimalist ? "#1f2937" : isClassic ? "#334155" : "white";
  const tableHeaderBg = isMinimalist || isClassic ? "transparent" : pdf.accentColor;
  const tableHeaderText = isMinimalist || isClassic ? "#1f2937" : "white";
  const accentColor = isMinimalist ? "#1f2937" : isClassic ? "#475569" : pdf.accentColor;
  
  const hasLineDisc = quote.lines.some((l) => (l.discountPercent ?? 0) > 0);
  const wNum = 5;
  const wImg = pdf.showPhotos !== false ? 8 : 0;
  const wPart = 15;
  const wQty = 8;
  const wUnit = 10;
  const wPrice = !hidePrices ? 12 : 0;
  const wDisc = (!hidePrices && hasLineDisc && pdf.showDiscount !== false) ? 8 : 0;
  const wTotal = !hidePrices ? 12 : 0;
  const wName = 100 - wNum - wImg - wPart - wQty - wUnit - wPrice - wDisc - wTotal;

  const colStyles = {
    num: { width: `${wNum}%` },
    img: { width: `${wImg}%`, paddingRight: 4 },
    part: { width: `${wPart}%`, paddingRight: 4 },
    name: { width: `${wName}%`, paddingRight: 4 },
    qty: { width: `${wQty}%`, textAlign: "right" as const },
    unit: { width: `${wUnit}%` },
    price: { width: `${wPrice}%`, textAlign: "right" as const },
    disc: { width: `${wDisc}%`, textAlign: "right" as const },
    total: { width: `${wTotal}%`, textAlign: "right" as const },
  };

  const styles = StyleSheet.create({
    page: { padding: 32, fontSize: 10, color: "#1f2937", fontFamily: isClassic ? "Times-Roman" : "Helvetica" },
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
      backgroundColor: headerBg,
      padding: 14,
      borderRadius: isClassic ? 0 : 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      color: headerText,
      borderWidth: isMinimalist ? 2 : 0,
      borderColor: isMinimalist || isClassic ? pdf.headerColor : "transparent",
      borderBottomWidth: isClassic ? 4 : (isMinimalist ? 2 : 0),
    },
    issuerName: { fontSize: 14, fontWeight: 700, color: headerText },
    issuerSub: { fontSize: 9, color: isMinimalist || isClassic ? "#6b7280" : "#e5edff", marginTop: 1 },
    folio: { fontSize: 16, fontWeight: 700, color: headerText },
    folioSub: { fontSize: 9, color: isMinimalist || isClassic ? "#6b7280" : "#e5edff", textAlign: "right" },
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
      color: accentColor,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    cardLine: { fontSize: 10, marginBottom: 2 },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: tableHeaderBg,
      color: tableHeaderText,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: isClassic || isMinimalist ? 0 : 4,
      marginBottom: 4,
      fontSize: 9,
      fontWeight: 700,
      borderBottomWidth: isMinimalist ? 2 : (isClassic ? 1 : 0),
      borderBottomColor: isMinimalist ? pdf.accentColor : (isClassic ? "#1e293b" : "transparent"),
      borderTopWidth: isClassic ? 1 : 0,
      borderTopColor: isClassic ? "#1e293b" : "transparent",
    },
    row: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
    },
    rowAlt: { backgroundColor: "#f3f4f6" },
    prodImg: { width: 24, height: 24, objectFit: "cover", borderRadius: 2 },
    noImg: { width: 24, height: 24, backgroundColor: "#f3f4f6", borderRadius: 2, alignItems: "center", justifyContent: "center" },
    noImgText: { fontSize: 6, color: "#9ca3af" },
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
      backgroundColor: isClassic ? "#f8fafc" : pdf.headerColor,
      color: isClassic ? "#334155" : "#ffffff",
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      fontWeight: 700,
      fontSize: 12,
      borderTopWidth: isClassic ? 2 : 0,
      borderTopColor: isClassic ? "#1e293b" : "transparent",
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
  const hasGlobalDisc = (quote.globalDiscountPercent ?? 0) > 0;
  const expired = isExpired(quote.validUntil);

  const renderBlock = (blockId: string) => {
    switch (blockId) {
      case "header":
        return (
          <View key="header" style={styles.headerRow}>
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
        );
      case "client":
        return (

          <View key="client" style={styles.clientCard}>
          <Text style={styles.cardTitle}>Cliente</Text>
          <Text style={styles.cardLine}>{client?.receiver ?? "—"}</Text>
          {client?.company ? <Text style={styles.cardLine}>{client.company}</Text> : null}
          {client?.email ? <Text style={styles.cardLine}>{client.email}</Text> : null}
          {client?.phone ? <Text style={styles.cardLine}>{client.phone}</Text> : null}
          {client?.address ? <Text style={styles.cardLine}>{client.address}</Text> : null}
          </View>
        );
      case "table":
        return (
          <View key="table">

            <View style={styles.tableHeader}>
          <Text style={colStyles.num}>#</Text>
          {pdf.showPhotos !== false && <Text style={colStyles.img}>Img</Text>}
          <Text style={colStyles.part}>Nº de parte</Text>
          <Text style={colStyles.name}>Producto</Text>
          <Text style={colStyles.qty}>Cant.</Text>
          <Text style={colStyles.unit}>Unidad</Text>
          {!hidePrices && (
            <>
              <Text style={colStyles.price}>P. Unit.</Text>
              {hasLineDisc && pdf.showDiscount !== false ? <Text style={colStyles.disc}>Desc.</Text> : null}
              <Text style={colStyles.total}>Importe</Text>
            </>
          )}
            </View>

            {quote.lines.map((l, i) => (
          <View
            key={l.productId}
            style={pdf.zebra && i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
          >
            <Text style={colStyles.num}>{i + 1}</Text>
            {pdf.showPhotos !== false && (
              <View style={colStyles.img}>
                {imageLookup?.[l.productId] ? (
                  <Image src={imageLookup[l.productId]!} style={styles.prodImg} />
                ) : (
                  <View style={styles.noImg}><Text style={styles.noImgText}>S/I</Text></View>
                )}
              </View>
            )}
            <Text style={colStyles.part}>{l.partNumber || partLookup?.[l.productId] || "—"}</Text>
            <View style={colStyles.name}>
              <Text style={styles.productName}>{l.name}</Text>
              {l.description ? <Text style={styles.productDesc}>{l.description}</Text> : null}
              {pdf.showSku !== false ? <Text style={styles.skuSmall}>SKU: {l.sku}</Text> : null}
            </View>
            <Text style={colStyles.qty}>{l.quantity}</Text>
            <Text style={colStyles.unit}>{l.unit}</Text>
            {!hidePrices && (
              <>
                <Text style={colStyles.price}>{formatMoney(l.unitPrice, l.currency)}</Text>
                {hasLineDisc && pdf.showDiscount !== false ? (
                  <Text style={colStyles.disc}>
                    {(l.discountPercent ?? 0) > 0 ? `${l.discountPercent}%` : "—"}
                  </Text>
                ) : null}
                <Text style={colStyles.total}>
                  {formatMoney(lineTotal(l), l.currency)}
                </Text>
              </>
            )}
          </View>
            ))}
          </View>
        );
      case "totals":
        return (

          <View key="totals" style={styles.bottomRow}>
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
              {totals.lineDiscounts > 0 && pdf.showDiscount !== false ? (
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
        );
      case "notes":
        return quote.notes && pdf.showNotes !== false ? (
          <View key="notes" style={styles.notes}>
            <Text>Notas: {quote.notes}</Text>
          </View>
        ) : null;
      case "terms":
        return pdf.paymentTerms ? (
          <View key="terms" style={styles.terms}>
            <Text>{pdf.paymentTerms}</Text>
          </View>
        ) : null;
      default:
        return null;
    }
  };

  const layout = pdf.layout ?? ["header", "client", "table", "totals", "notes", "terms"];

  return (
    <Document>
      <Page size={pageSize} style={styles.page}>
        {layout.map(blockId => renderBlock(blockId))}

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
